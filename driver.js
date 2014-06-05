chrome.app.runtime.onLaunched.addListener(function() {
	// UI Code here
});

var dexcom = {
	connected: false,
	connection: null,
	port: null,
	buffer: [],
	connect: function() {
		chrome.serial.getDevices(function(ports) {
			var connected = function(conn) {
				dexcom.connection = conn;
				dexcom.connected = true;
			};
			for (var i=0; i<ports.length; i++) {
				console.log(ports[i].path);
				if (ports[i].path == "/dev/cu.usbmodem14241") {
					dexcom.port = ports[i];
					chrome.serial.connect(dexcom.port.path, { bitrate: 115200 }, connected);
				}
			}
		});

		chrome.serial.onReceive.addListener(function(info) {
			if (dexcom.connected && info.connectionId == dexcom.connection.connectionId && info.data) {
				var bufView=new Uint8Array(info.data);
				for (var i=0; i<bufView.byteLength; i++) {
					dexcom.buffer.push(bufView[i]);
				}
			}
		});
	},
	readSerial: function(bytes, to, callback) {
		var packet;
		if (dexcom.buffer.length >= bytes) {
			packet = dexcom.buffer.slice(0,bytes);
			dexcom.buffer = dexcom.buffer.slice(0 - bytes);
			callback(packet);
		} else if (to === 0) {
			packet = dexcom.buffer;
			dexcom.buffer = [];
			callback(packet);
		} else {
			setTimeout(function() {
				dexcom.readSerial(bytes, 0, callback);
			}, to);
		}
	},
	writeSerial: function(bytes, callback) {
		dexcom.buffer = [];
		chrome.serial.send(dexcom.connection.connectionId, bytes, callback);
	},
	readFromReceiver: function(pageOffset, callback) {
		//locate the EGV data pages
		dexcom.getEGVDataPageRange(function(dexcomPageRange) {
			dexcom.getLastFourPages(dexcomPageRange, pageOffset, function(databasePages) {
				callback(dexcom.parseDatabasePages(databasePages));
			});
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
		readEGVDataPageRange[5] = 0x8b;
		readEGVDataPageRange[6] = 0xb8;
		dexcom.writeSerial(buf, function() {
			dexcom.readSerial(256, 200, callback);
		});
	},
	getLastFourPages: function(dexcomPageRange, pageOffset,callback) {
		var endPage = dexcomPageRange.slice(8,12);
		endInt = toInt(endPage,1);
		lastFour = endInt - 4 * pageOffset + 1;
		b = getInt64Bytes(lastFour).slice(4,8);

		var buf = new ArrayBuffer(636);
		getLastEGVPage =new Uint8Array(buf);

		getLastEGVPage[0] = 0x01;
		getLastEGVPage[1] = 0x0c;
		getLastEGVPage[2] = 0x00;
		getLastEGVPage[3] = 0x11;
		getLastEGVPage[4] = 0x04;
		getLastEGVPage[5] = b[3]; // reverse these 4?
		getLastEGVPage[6] = b[2];
		getLastEGVPage[7] = b[1];
		getLastEGVPage[8] = b[0];
		getLastEGVPage[9] = 0x04;

		getLastEGVCRC = calculateCRC16(getLastEGVPage, 0, 10);
		crcByte1 = getInt64Bytes(getLastEGVCRC & 0xff)[7];
		crcByte2 = getInt64Bytes((getLastEGVCRC >> 8) & 0xff)[7];

		getLastEGVPage[10] = crcByte1;
		getLastEGVPage[11] = crcByte2;

		dexcom.writeSerial(buf, function() {
			dexcom.readSerial(2122, 20000, callback);
		});
	},
	parseDatabasePages: function(databasePages) {
		debugger;
		var fourPages = [];
		var recordCounts = [];
		var totalRecordCount = 0;
		var i = 0;
		
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
				var d = 1230793200000 + dt * 1000;
				var display = new Date(d);
				// I don't think this works
				// byte [] dateTime = new byte[]{tempRecord[7],tempRecord[6],tempRecord[5],tempRecord[4]};

				// ByteBuffer buffer = ByteBuffer.wrap(dateTime);
				// int dt = buffer.getInt();//*1000;

				// String string_date = "1-January-2009";
				// SimpleDateFormat f = new SimpleDateFormat("dd-MMM-yyyy");
				// Date d;
				// try {
				// 	d = f.parse(string_date);
				// } catch (ParseException e) {
				// 	Log.e(TAG, "unable to parse date: " + string_date + ", using current time", e);
				// 	// TODO Auto-generated catch block
				// 	d = new Date();
				// }
				// long milliseconds = d.getTime();

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
						trend = "RATE OUT OF RANGE";
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
		return recordsToReturn;
	}
};

// http://stackoverflow.com/questions/8482309/converting-javascript-integer-to-byte-array-and-back
function intFromBytes( x ){
	var val = 0;
	for (var i = 0; i < x.length; ++i) {		
		val += x[i];		
		if (i < x.length-1) {
			val = val << 8;
		}
	}
	return val;
}
function getInt64Bytes( x ){
	var bytes = [];
	var i = 8;
	do {
		bytes[--i] = x & (255);
		x = x>>8;
	} while ( i );
	return bytes;
}

function toInt (b, flag) {
	switch(flag){
		case 0: //BitConverter.FLAG_JAVA:
			return ((b[0] & 0xff)<<24) | ((b[1] & 0xff)<<16) | ((b[2] & 0xff)<<8) | (b[3] & 0xff);
		case 1: //BitConverter.FLAG_REVERSE:
			return ((b[3] & 0xff)<<24) | ((b[2] & 0xff)<<16) | ((b[1] & 0xff)<<8) | (b[0] & 0xff);
		default:
			throw new Error("BitConverter:toInt");
	}
}
function calculateCRC16 (buff, start, end) {
	var crc = 0, i = 0;
	for (i = start; i < end; i++) {
		crc = ((crc  >>> 8) | (crc  << 8) )& 0xffff;
		crc ^= (buff[i] & 0xff);
		crc ^= ((crc & 0xff) >> 4);
		crc ^= (crc << 12) & 0xffff;
		crc ^= ((crc & 0xFF) << 5) & 0xffff;
	}
	crc &= 0xffff;
	return crc;
}