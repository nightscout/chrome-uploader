define(["../datasource/dexcom", "../datasource/remotecgm", "../egv_records"], function(dexcom, remotecgm, egvrecords) {
	var cgm = dexcom,
	isdownloading = false;
	var isWindows = !!~window.navigator.appVersion.indexOf("Win");
	var isMac = !!~window.navigator.appVersion.indexOf("Mac OS X");

	var switchToCorrectDatasource = function() {
		chrome.storage.local.get("config", function(local) {
			if (!("datasource" in local.config)) {
				cgm = dexcom;
			};
			if (local.config.datasource == "remotecgm") {
				cgm = remotecgm;
			} else {
				cgm = dexcom;
			}
		});
		chrome.storage.onChanged.addListener(function(changes, namespace) {
			if ("config" in changes) {
				if (changes.config.newValue.datasource == "remotecgm")	 {
					console.debug("[cgm_download.js switchToCorrectDatasource] switching to MongoLab datasource");
					cgm = remotecgm;
				} else {
					console.debug("[cgm_download.js switchToCorrectDatasource] switching to hardware Dexcom");
					cgm = dexcom;
				}

				if (changes.config.newValue.remotecgmuri != changes.config.oldValue.remotecgmuri) {
					putTheChartOnThePage(changes.config.newValue.remotecgmuri);
				}
			}
		});
	}
	switchToCorrectDatasource();

	// emit events that UI can react to
	var connect = function() {
		var chrome_notification_id = 0;
		var connectionErrorCB = function(notification_id, button) {
			chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
			if (notification_id != chrome_notification_id) return;

			if (button === 0) {
				attempts = 0;
				connect().then(onConnected,onConnectError); // chain to start everything
			}
		};
		return new Promise(function(resolve, reject) {
			if (isdownloading) reject();
			isdownloading = true;
			var timer = new Date();
			chrome.storage.local.get(["config"], function(local) {
				var max_existing = egvrecords.length > 0?  egvrecords[egvrecords.length - 1].displayTime : 0;
				
				console.debug("[cgm_download.js connect] loading");
				var serialport = local.config.serialport || (isWindows? "COM3": "/dev/tty.usbmodem");
				
				if ((serialport.substr(0,3) != "COM" && isWindows) || (serialport.substr(0,5) != "/dev/" && !isWindows)) {
					if (serialport.substr(0,3) != "COM" && isWindows) {
						message = "Can't load because you're not configured properly for Windows. Go into Options and pick the right serial port. It'll be something like COM3, COM4, COM5, something like that. It's currently " + local.config.serialport + " which is invalid on Windows. Using COM3 to keep things moving."
					} else if (serialport.substr(0,5) != "/dev/" && !isWindows) {
						message = "Can't load because you're not properly configured for Unix. Go into Options and pick the right serial port. It'll be something like /dev/tty.usbmodem.";
					}
					chrome.notifications.create("", {
							type: "basic",
							title: "NightScout.info CGM Utility",
							message: "" + message,
							iconUrl: "/public/assets/icon.png",
							priority: 1,
						}, function(notification_id) {

						});
				}
				cgm.connect(serialport).then(function() { // success
					console.debug("[cgm_download.js connect] successfully connected to %s", local.config.datasource);

					chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
					try {
						var page = 1;
						var d = []; // data
						var process = function(d_page) {
							console.debug("[cgm_download.js process] read page %i", page);
							d = d.concat(d_page);
							if(d_page.filter(function(egv) {
								return +egv.displayTime > max_existing;
							}).length == 0) {
								console.debug("[cgm_download.js process] stopped reading at page %i", page);
								cgm.disconnect();
								isdownloading = false;
								console.debug("[cgm_download.js process] spent %i ms downloading", (new Date() - timer));
								resolve(d);
							} else {
								cgm.readFromReceiver(++page).then(process);
							}
						}
						return cgm.readFromReceiver(page).then(process);
					} catch (e) {
						console.debug("[cgm_download.js process] %o", e);
						reject(e);
					}
				}, function(e) { // failed to connect
					console.debug("[cgm_download connect] failed to connect");
					if (attempts++ < 3) {
						try {
							// try again
							connect().then(onConnect, onConnectError);
						} catch (e) {
							// it didn't work
						}
					} else if (!isdownloading) {
						chrome.notifications.create("", {
							type: "basic",
							title: "NightScout.info CGM Utility",
							message: "Could not connect to Dexcom receiver. Unplug it and plug it back in. Be gentle, Dexcom's USB port is fragile. I like to unplug from the computer's side.",
							iconUrl: "/public/assets/error.png",
							buttons: [{
								title: "Try again"
							}, {
								title: "Cancel"
							}]
						}, function(notification_id) {
							console.log(arguments);
							chrome_notification_id = notification_id;
							attempts = 0; // reset
							chrome.notifications.onButtonClicked.addListener(connectionErrorCB);
						});
						console.log(e);
					}
					reject(e);
				});
			});
		});
	},
	onConnected = function(data) { // to download from dexcom
		var lastNewRecord = Date.now();

		// update my db
		(function(data) {
			return new Promise(function(resolve) {
				chrome.storage.local.get(["config"], function(storage) {
					var existing = egvrecords || [];
					var max_existing = existing.length > 0?  existing[existing.length - 1].displayTime : 0;
					var new_records = data.filter(function(egv) {
						return +egv.displayTime > max_existing;
					}).map(function(egv) {
						return {
							displayTime: +egv.displayTime,
							bgValue: egv.bgValue,
							trend: egv.trend
						};
					});
					if (new_records.length === 0) {
						if (lastNewRecord + (5).minutes() < Date.now()) {
							console.warn("[cgm_download.js updateLocalDb] Something's wrong. We should have new data by now.");
						}
					} else {
						lastNewRecord = Date.now();
					}
					new_records = new_records.filter(function(row) {
						return row.bgValue > 30;
					});
					egvrecords.addAll(new_records);
				});
			});
		})(data);

		var nextRun = function() {
			console.log("[cgmdownload.js nextRun] Attempting to refresh data");
			if (isdownloading) {
				setTimeout(nextRun, (60).seconds());
			} else {
				connect().then(onConnected, onConnectError);
			}
		};

		// again and again
		setTimeout(nextRun, (60).seconds());
	},
	onConnectError = function(){
		console.log(arguments);
	};
	connect().then(onConnected, onConnectError); // chain to start everything
});