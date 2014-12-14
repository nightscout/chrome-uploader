if(global && !("Promise" in global)) {
	global.Promise = require("es6-promise").Promise;
	if (!("milliseconds" in Number.prototype))
	Number.prototype.milliseconds = function() { return this; };
if (!("seconds" in Number.prototype))
	Number.prototype.seconds = function() {	return this.milliseconds() * 1000; };
if (!("minutes" in Number.prototype))
	Number.prototype.minutes = function() { return this.seconds() * 60; };
if (!("hours" in Number.prototype))
	Number.prototype.hours = function() { return this.minutes() * 60; };
if (!("days" in Number.prototype))
	Number.prototype.days = function() { return this.hours() * 24; };
if (!("weeks" in Number.prototype))
	Number.prototype.weeks = function() { return this.days() * 7; };
if (!("months" in Number.prototype))
	Number.prototype.months = function() { return this.days() * 30; };

if (!("toDays" in Number.prototype))
	Number.prototype.toDays = function() { return this.toHours() / 24; };
if (!("toHours" in Number.prototype))
	Number.prototype.toHours = function() { return this.toMinutes() / 60; };
if (!("toMinutes" in Number.prototype))
	Number.prototype.toMinutes = function() { return this.toSeconds() / 60; };
if (!("toSeconds" in Number.prototype))
	Number.prototype.toSeconds = function() { return this.toMilliseconds() / 1000; };
if (!("toMilliseconds" in Number.prototype))
	Number.prototype.toMilliseconds = function() { return this; };

}
define(function () {
	var SerialPort = require('serialport');
	var sp;
	chrome = {
		serial: {
			getDevices: function(callback) {
				SerialPort.list(function(err,ports) {
					callback(ports.map(function(port) {
						return {
							path: port.comName
						};
					}));
				});
			},
			connect: function(port, options, callback) {
				options.parser = SerialPort.parsers.raw
				try {
					sp = new SerialPort.SerialPort(port.toString(), options);
				} catch (e) {
					console.log(e);
				}
				sp.on("open", function() {
					sp.on("data", function(data) {
						for (var i = 0; i < data.length; i++) {
							buffer.push(data[i]);
						}
					});
					callback({
						connectionId: 0,
						serialport: sp
					});
				});
				var buffer = [];

				dexcom.readSerial = function(bytes, to, callback) {
					if (buffer.length >= bytes) {
						callback(buffer.slice(0,bytes));
						buffer = buffer.slice(bytes);
						callback(buffer);
					} else if (to == 0) {
						callback(buffer);
						buffer = [];
					} else {
						setTimeout(function() {
							dexcom.readSerial(bytes, 0, callback);
						}, to);
					}
				}
				dexcom.writeSerial = function(bytes, callback) {
					var command = [];
					for (var i = 0; i < bytes.byteLength; i++) {
						command.push(bytes[i]);
					}
					sp.write(command);
					callback();
				}
			},
			onReceive: {
				addListener: function() { }
			}
		}
	}
	console.debug = console.warn = console.error = console.info = function() { };

	// http://stackoverflow.com/questions/8482309/converting-javascript-integer-to-byte-array-and-back
	var lastSerialPort = false;
	function intFromBytes(x) {
		var val = 0;
		for (var i = 0; i < x.length; ++i) {
			val += x[i];
			if (i < x.length-1) {
				val = val << 8;
			}
		}
		return val;
	}
	function getInt64Bytes(x) {
		var bytes = [];
		var i = 8;
		do {
			bytes[--i] = x & (255);
			x = x>>8;
		} while ( i );
		return bytes;
	}

	function calculateCRC16(buff, start, end) {
		var crc = new Uint16Array(1);
		var buffer = new Uint8Array(buff);
		crc[0] = 0;
		for (var i = start; i < end; i++) {
			crc[0] = (crc[0] >>> 8) | (crc[0] << 8) & 0xffff;
			crc[0] ^= (buffer[i] & 0xff);
			crc[0] ^= ((crc[0] & 0xff) >> 4);
			crc[0] ^= (crc[0] << 12) & 0xffff;
			crc[0] ^= ((crc[0] & 0xff) << 5) & 0xffff;
		}
		crc[0] &= 0xffff;
		return crc[0];
	}

	function int32at(jsBytes, ixStart, byteLength) {
		var u8 = new Uint8Array(jsBytes);
		var slice = u8.buffer.slice(ixStart, ixStart + byteLength);
		return (new Int32Array(slice))[0];
	}

	function bytesOfInt(int32) {
		var a = new Int32Array(1);
		a[0] = int32;
		var bytes = new Uint8Array(a.buffer);
		return bytes;
	}
	
	var dexcom = {
		connected: false,
		connection: null,
		port: null,
		buffer: [],
		connect: function(serialport) {
			var str = "/dev/cu.usbmodem1421";
			str.path = str;
			return dexcom.oldConnect(str, true);
		},
		oldConnect: function(serialport, foundActualDevice) {
			console.debug("[dexcom.js oldConnect] getDevices with device: %o", serialport);
			return new Promise(function(resolve, reject) {
				if (dexcom.connected) {
					return reject(new Error("Wait for existing process to finish"));
				}
				var connected = function(conn) {
					if (conn && "connectionId" in conn) {
						dexcom.connection = conn;
						dexcom.connected = true;
						console.debug("[connecting] successfully connected to port %o", conn);
						lastSerialPort = serialport;
						chrome.serial.onReceive.addListener(dexcom.serialOnReceiveListener);
						resolve();
					} else {
						console.error("Couldn't open USB connection to port %o", conn);
						reject(new Error(
							"Couldn't open USB connection. Unplug your Dexcom, plug it back in, and try again."
						));
					}
				};
				var tryPort = function(port) {
					console.debug("[connecting] Trying port: %o", port);
					if (!foundActualDevice &&
						(port.path.substr(0,serialport.length).toLowerCase() != serialport.toLowerCase())) {
						return;
					}
					dexcom.port = port;
					console.debug("[connecting] Found dexcom at port %o", port);
					chrome.serial.connect(dexcom.port, { bitrate: 115200 }, connected);
				};
				if (foundActualDevice) {
					tryPort(serialport);
				} else {
					chrome.serial.getDevices(function(ports) {
						console.log("[dexcom] getDevices returned ports: %o", ports);
						ports.forEach(tryPort);
						if (dexcom.port === null) {
							lastSerialPort = false;
							reject(new Error(
								"Didn't find a Dexcom receiver plugged in"
							));
						}
					});
				}
			});
		},
		serialOnReceiveListener: function(info) {
			if (dexcom.connected && info.connectionId == dexcom.connection.connectionId && info.data) {
				var bufView=new Uint8Array(info.data);
				console.debug("[connection (low-level)] incoming data; %i bytes", bufView.byteLength);
				for (var i=0; i<bufView.byteLength; i++) {
					dexcom.buffer.push(bufView[i]);
				}
			}
		},
		readSerial: function(bytes, to, callback) {
			var packet;
			if (dexcom.buffer.length >= bytes) {
				packet = dexcom.buffer.slice(0,bytes);
				console.info("0x" + packet.map(function(byte) { return ("0" + byte.toString(16)).substr(-2); }).join("") );
				dexcom.buffer = dexcom.buffer.slice(0 - bytes);
				callback(packet);
			} else if (to === 0) {
				packet = dexcom.buffer;
				dexcom.buffer = [];
				console.info("0x" + packet.map(function(byte) { return ("0" + byte.toString(16)).substr(-2); }).join("") );
				callback(packet);
			} else {
				var delta = Math.max(0, to - 50);
				setTimeout(function() {
					dexcom.readSerial(bytes, delta, callback);
				}, 50);
			}
		},
		disconnect: function() {
			if (!dexcom.connected) {
				throw new Error("Not connected");
			}
			chrome.serial.disconnect(dexcom.connection.connectionId, function() {
				console.debug("[disconnect] completed");
				dexcom.connected = false;
				dexcom.connection = null;
				dexcom.port = null;
				dexcom.buffer = [];
				chrome.serial.onReceive.removeListener(dexcom.serialOnReceiveListener);
			});
			console.debug("[disconnect] attempted");
		},
		writeSerial: function(bytes, callback) {
			dexcom.buffer = [];
			chrome.serial.send(dexcom.connection.connectionId, bytes, callback);
			console.debug("[connection (low-level)] wrote command to serial");
		},
		readFromReceiver: function(pageOffset, callback) {
			return new Promise(function(resolve,reject) {
				try {
					console.debug("[readFromReceiver] read page %i from serial", pageOffset);
					dexcom.getEGVDataPageRange(function(dexcomPageRange) {
						dexcom.getLastFourPages(dexcomPageRange, pageOffset, function(databasePages) {
							databasePages = databasePages.slice(4); // why? i dunno
							var data = dexcom.parseDatabasePages(databasePages);
							if (typeof callback == "function")
								callback(data);
							resolve(data);
						});
					});
				} catch (e) {
					reject(e);
				}
			});
			//locate the EGV data pages
		},
		ping: function() {
			// ping is command 10
			return new Promise(function(done, reject) {
				if (!dexcom.connected) {
					return reject(new Error("Not connected"));
				}
				var buf = new ArrayBuffer(7);
				readEGVDataPageRange =new Uint8Array(buf);
				readEGVDataPageRange[0] = 0x01; // sof
				readEGVDataPageRange[1] = 0x07; // length
				readEGVDataPageRange[3] = 0x00; // null because why?
				readEGVDataPageRange[4] = 0x0a; // command
				var crc = bytesOfInt(calculateCRC16(readEGVDataPageRange, 0, 5));
				readEGVDataPageRange[5] = crc[0];
				readEGVDataPageRange[6] = crc[1];
				dexcom.writeSerial(buf, function() {
					console.debug("[dexcom.js ping] returned");
					dexcom.readSerial(6, 200, done);
				});
				console.debug("[ping]");
			});
		},
		getDexcomSystemTime: function() {
			return new Promise(function(done, reject) {
				return done(new Date()); // I just don't need it. YOU make it work! :)
			});
		},
		getEGVDataPageRange: function(callback) {
			if (!dexcom.connected) {
				throw new Error("Not connected");
			}
			var buf = new ArrayBuffer(7);
			readEGVDataPageRange =new Uint8Array(buf);
			readEGVDataPageRange[0] = 0x01;
			readEGVDataPageRange[1] = 0x07;
			readEGVDataPageRange[3] = 0x10;
			readEGVDataPageRange[4] = 0x04;
			var crc = bytesOfInt(calculateCRC16(readEGVDataPageRange, 0, 5));
			readEGVDataPageRange[5] = crc[0];
			readEGVDataPageRange[6] = crc[1];
			dexcom.writeSerial(buf, function() {
				console.debug("[dexcom.js getEGVDataPageRange] returned");
				dexcom.readSerial(256, 200, callback);
			});
			console.debug("[dexcom.js getEGVDataPageRange]");
		},
		getLastFourPages: function(dexcomPageRangeJS, pageOffset,callback) {
			if (dexcomPageRangeJS.length === 0) {
				throw new Error(
					"Didn't receive response from Dexcom. Unplug, plug it back in, and try again."
				);
			}
			var endPage = int32at(dexcomPageRangeJS, 8, 4);
			var getLastFour = endPage - 4 * pageOffset + 1;
			var b = bytesOfInt(getLastFour);

			var buf = new ArrayBuffer(12);
			getLastEGVPage =new Uint8Array(buf);

			getLastEGVPage[0] = 0x01;
			getLastEGVPage[1] = 0x0c;
			getLastEGVPage[2] = 0x00;
			getLastEGVPage[3] = 0x11;
			getLastEGVPage[4] = 0x04;
			getLastEGVPage[5] = b[0]; // reverse these 4?
			getLastEGVPage[6] = b[1];
			getLastEGVPage[7] = b[2];
			getLastEGVPage[8] = b[3];
			getLastEGVPage[9] = 0x04;

			var checksum = bytesOfInt(calculateCRC16(getLastEGVPage, 0, 10));

			getLastEGVPage[10] = checksum[0];
			getLastEGVPage[11] = checksum[1];

			dexcom.writeSerial(buf, function() {
				dexcom.readSerial(2118, 10000, callback); // was 2122
				console.debug("[dexcom.js getLastFourPages] returned");
			});
			console.debug("[dexcom.js getLastFourPages] called");
		},
		parseDatabasePages: function(databasePages) {
			var fourPages = [];
			var recordCounts = [];
			var totalRecordCount = 0;
			var i = 0;
			var dexcomTime = -800; //PST
			var localTime = (new Date().toString().match(/([-\+][0-9]+)\s/)[1]);
			delta = dexcomTime - localTime;
			var delta = {
				h: Math.floor(delta/100),
				m: delta % 100
			};

			// God, I hope this doesn't bite me when DST starts again
			// delta.h++ was running already but... Ugh.
			// if ((new Date()).dst()) {
			delta.h++;
			// }
			delta.ms = (delta.h < 0? -1: 1) * (Math.abs(delta.h).hours() + delta.m.minutes());

			console.debug("[dexcom.js parseDatabasePages] parsing raw results to eGV records");

			//we parse 4 pages at a time, calculate total record count while we do this
			for (i = 0; i < 4; i++) {
				fourPages[i] = databasePages.slice(528 * i, 528 * (i + 1));
				recordCounts[i] = fourPages[i][4];
				totalRecordCount += recordCounts[i];
			}
			var recordsToReturn = [];
			var k = 0, j = 0;

			//parse each record, plenty of room for improvement
			var tempRecord = [];
			for (i = 0; i < 4; i++) {
				for (j = 0; j < recordCounts[i]; j++) {
					tempRecord = fourPages[i].slice(28 + j * 13, 28 + (j + 1) * 13);
					var eGValue = [tempRecord[8], tempRecord[9]];
					var bGValue = ((eGValue[1]<<8) + (eGValue[0] & 0xff)) & 0x3ff;

					var dt = intFromBytes([tempRecord[7], tempRecord[6], tempRecord[5], tempRecord[4]]);
					var d = 1230793200000 + dt * 1000 + delta.ms; // Jan 1 2009 12:00:00a
					var display = new Date(d);

					var trendArrow = getInt64Bytes(tempRecord[10] & 15)[7];
					var trend = "Not Calculated";
					var trendA = "--X";
					switch (trendArrow) {
						case 0:
							trend = "None";
							trendA = String.fromCharCode(0x2194);
							break;
						case 1:
							trend = "DoubleUp";
							trendA = String.fromCharCode(0x21C8);
							break;
						case (2):
							trendA = String.fromCharCode(0x2191);
							trend = "SingleUp";
							break;
						case (3):
							trendA = String.fromCharCode(0x2197);
							trend = "FortyFiveUp";
							break;
						case (4):
							trendA = String.fromCharCode(0x2192);
							trend = "Flat";
							break;
						case (5):
							trendA = String.fromCharCode(0x2198);
							trend = "FortyFiveDown";
							break;
						case (6):
							trendA = String.fromCharCode(0x2193);
							trend = "SingleDown";
							break;
						case (7):
							trendA = String.fromCharCode(0x21ca);
							trend = "DoubleDown";
							break;
						case (8):
							trendA = String.fromCharCode(0x2194);
							trend = "NOT COMPUTABLE";
							break;
						case (9):
							trendA = String.fromCharCode(0x2194);
							trend = "OUT OF RANGE";
							bGValue = undefined;
							break;
					}

					recordsToReturn.push({
						bgValue: bGValue,
						displayTime: display,
						trend: trend,
						trendArrow: trendA
					});
				}
			}
			console.debug("[dexcom.js parseDatabasePages] done");
			return recordsToReturn;
		}
	};
	return dexcom;
});
