define(["../datasource/dexcom", "../datasource/remotecgm", "../store/egv_records", "/app/config.js!"], function(dexcom, remotecgm, egvrecords, config) {
	var cgm = dexcom,
	isdownloading = false;
	var isWindows = !!~window.navigator.appVersion.indexOf("Win");
	var isMac = !!~window.navigator.appVersion.indexOf("Mac OS X");

	var pickDatasource = function(datasource) {
		if (datasource == "dexcom") {
			cgm = dexcom;
		} else {
			cgm = remotecgm;
		}
	};

	config.on("datasource", pickDatasource);
	pickDatasource(config.datasource);
	var max_allowed;

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
			var max_existing = (egvrecords.length > 0?
				(egvrecords[egvrecords.length - 1].displayTime || egvrecords[egvrecords.length - 1].date ):
				0);
			max_allowed = new Date(Date.now() + (1).days());
			
			console.debug("[cgm_download.js connect] loading");
			cgm.connect().then(function() { // success
				console.debug("[cgm_download.js connect] successfully connected to %s", config.datasource);

				chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
				try {
					var page = 1;
					var d = []; // data
					var process = function(d_page) {
						console.debug("[cgm_download.js process] read page %i", page);
						d = d.concat(d_page);
						if(d_page.filter(function(egv) {
							return ((+egv.displayTime || +egv.date) > max_existing)
							 && ((+egv.displayTime || +egv.date) < max_allowed);
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
				reject(e);
			});
		});
	},
	onConnected = function(data) { // to download from dexcom
		var lastNewRecord = Date.now();

		// update my db
		var existing = egvrecords || [];
		var max_existing = existing.length > 0?
			(existing[existing.length - 1].displayTime || existing[existing.length].date) :
			0;
		var new_records = data.filter(function(egv) {
			return( +egv.displayTime > max_existing )|| (+egv.date > max_existing);
		}).map(function(egv) {
			return {
				displayTime: +egv.displayTime || +egv.date,
				bgValue: egv.bgValue || egv.sgv,
				trend: egv.trend || egv.direction,
				recordSource: config.datasource
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
			return row.bgValue > 30 && row.displayTime < max_allowed;
		});
		egvrecords.addAll(new_records);

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
	egvrecords.onLoad.then(function() {
		connect().then(onConnected, onConnectError); // chain to start everything
	});

	return {
		getAllRecords: function() {
			var oldCgm = cgm;
			cgm = dexcom;
			var p = cgm.getAllRecords();
			p.then(function() {
				cgm = oldCgm;
			});
			return p;
		}
	}
});