require(["./datasource/dexcom", "./datasource/remotecgm", "./datasource/mongolab", "./datasource/trending_alerts", "waiting"], function(dexcom, remotecgm, mongolab, alerts, waiting) {

var cgm = dexcom;

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
				console.debug("switching to MongoLab datasource");
				cgm = remotecgm;
			} else {
				console.debug("switching to hardware Dexcom");
				cgm = dexcom;
			}
		}
	});
}
switchToCorrectDatasource();

// OS Flags
// Windows needs a different COM port than everything else because Windows.
// I don't have an older version of OSX to troubleshoot this against
var isWindows = !!~window.navigator.appVersion.indexOf("Win");
var isMac = !!~window.navigator.appVersion.indexOf("Mac OS X");
var macVersion;
if (isMac) {
	var identifier = "Mac OS X";
	var ixVersion = window.navigator.appVersion.indexOf(identifier) + identifier.length;
	if (ixVersion > identifier.length) {
		var v = window.navigator.appVersion.indexOf(")", ixVersion);
		identifier = window.navigator.appVersion.substring(ixVersion, v).trim().split("_").map(function(r) { return parseInt(r, 10); });

		const MAJOR = 0, MINOR = 1, BUGFIX = 2;
		if (identifier[MAJOR] == 10 && identifier[MINOR] >= 7 && identifier[MINOR] <= 10) {
			// ok
		} else if (identifier[MAJOR] == 10 && identifier[MINOR] > 10) {
			// probably ok
		} else if (identifier[MAJOR] > 10) {
			// *shrugs*
			setTimeout(waiting.show("You're on a much newer version of OSX than this has been tested against. Please provide feedback on what happens."), (10).seconds());
		} else {
			// fail
			setTimeout(waiting.show("You're on an old version of OSX and this is unlikely to work."), (10).seconds());
		}
	}
}



// Keep errors from happening during large downloads
var attempts = 0;
var isdownloading = false;

// TODO: refactor this to CGM.js
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
		chrome.storage.local.get(["egvrecords", "config"], function(local) {
			var max_existing = local.egvrecords.length > 0?  local.egvrecords[local.egvrecords.length - 1].displayTime : 0;
			
			console.debug("[cgm] loading");
			var serialport = local.config.serialport || (isWindows? "COM3": "/dev/tty.usbmodem");
			cgm.connect(serialport).then(function() {
				console.debug("[cgm] loaded");
				chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
				try {
					var page = 1;
					var d = []; // data
					var process = function(d_page) {
						console.debug("[dexcom] read page %i", page);
						d = d.concat(d_page);
						if(d_page.filter(function(egv) {
							return +egv.displayTime > max_existing;
						}).length == 0) {
							console.debug("[dexcom] stopped reading at page %i", page);
							cgm.disconnect();
							isdownloading = false;
							console.debug("[dexcom] spent %i ms downloading", (new Date() - timer));
							resolve(d);
						} else {
							cgm.readFromReceiver(++page).then(process);
						}
					}
					return cgm.readFromReceiver(page).then(process);
				} catch (e) {
					console.debug("[cgm] %o", e);
					reject(e);
				}
			}, function(e) {
				console.debug("[cgm] rejected");
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
			chrome.storage.local.get(["egvrecords", "config"], function(storage) {
				var existing = storage.egvrecords || [];
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
						console.log("[updateLocalDb] Something's wrong. We should have new data by now.");
					}
				} else {
					lastNewRecord = Date.now();
				}
				new_records = new_records.filter(function(row) {
					return row.bgValue > 30;
				});
				var to_save = existing.concat(new_records);
				to_save.sort(function(a,b) {
					return a.displayTime - b.displayTime;
				});
				var last_record = to_save[to_save.length - 1];
				chrome.storage.local.set({ egvrecords: to_save }, console.debug.bind(console, "[updateLocalDb] Saved results"));
				console.log("%i new records", new_records.length);

				resolve();
			});
		});
	})(data);

	var nextRun = function() {
		console.log("Attempting to refresh data");
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

$(function() {
	// event handlers
	$("#disclaimer").modal();
	$("#disclaimer").show();
	$("#acknowledge-agree").click(function() {
		$("#disclaimer.modal").modal('hide');
		$("#receiverui").show();
	});
	$("#acknowledge-disagree").click(function() {
		window.close();
	});
	$("#openhelp").click(function(e) {
		chrome.app.window.create('app/help.html', {
			id: "help",
			bounds: {
				width: 800,
				height: 600
			}
		});	
		e.preventDefault();
	});

	$("#backfilldatabase").click(function() {
		chrome.storage.local.get("egvrecords", function(local) {
			mongolab.publish(local.egvrecords).then(function() {
				chrome.notifications.create("", {
					type: "basic",
					title: "NightScout.info CGM Utility",
					message: "Published " + local.egvrecords.length + " records to MongoLab",
					iconUrl: "/public/assets/icon.png",
				}, function(notification_id) {
				});
				console.log("[publishtomongolab] publish complete, %i records", local.egvrecords.length);
			});
		});
	});

	$('#reset').confirmation({
		title: "Are you sure? This will delete all your data and cannot be undone.",
		onConfirm: function(e) {
			chrome.storage.local.set({
				egvrecords: []
			}, function() {
				console.log("removed records");
				$('#reset').confirmation('hide');
			});
		}
	});

	$("#fixit").click(function() {
		$("#errorrreporting").modal();
		$("#errorrreporting").show();
		$("#whatswrong").val("");
	});


	$('.dropdown-toggle').dropdown();
	$("#menuinsights").click(function() {
		chrome.app.window.create('app/report/insights.html', {
			id: "insightsreport",
			bounds: {
				width: 800,
				height: 600
			}
		});
	});
	$("#menusuccess").click(function() {
		chrome.app.window.create('app/report/success.html', {
			id: "successreport",
			bounds: {
				width: 800,
				height: 600
			}
		});
	});
	$("#menudailystats").click(function() {
		chrome.app.window.create('app/report/dailystats.html', {
			id: "dailystatsreport",
			bounds: {
				width: 600,
				height: 650
			}
		});
	});
	$("#menudistribution").click(function() {
		chrome.app.window.create('app/report/glucosedistribution.html', {
			id: "glucosedistribution",
			bounds: {
				width: 960,
				height: 400
			}
		});
	});
	$("#menuhourlystats").click(function() {
		chrome.app.window.create('app/report/hourlystats.html', {
			id: "hourlystats",
			bounds: {
				width: 960,
				height: 800
			}
		});
	});

	$("#menupercentilechart").click(function() {
		chrome.app.window.create('app/report/percentile.html', {
			id: "percentilechart",
			bounds: {
				width: 960,
				height: 578
			}
		});
	});

	$("#openoptions").click(function(){
		chrome.app.window.create('app/options.html', {
			id: "options",
			bounds: {
				width: 960,
				height: 600
			}
		});
		
	});
	
	$("#pulldatabase").click(function() {
		mongolab.populateLocalStorage().then(function(r, ml) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Pulled " + r.raw_data.length + " records from MongoLab. You might have already had some, and any duplicates were discarded.",
				iconUrl: "/public/assets/icon.png"
			}, function(chrome_notification_id) { });
		});
	});
	$("#errorreporting-agree").click(function(){
		var github = "https://api.github.com";
		$.ajax({
			url: github + "/gists",
			accept: "application/vnd.github.v3+json",
			dataType: "json",
			data: JSON.stringify({
				"description": $("#whatswrong").val() || "Console details",
				"public": false,
				"files": {
					"console": {
						"content":console.fixMyStuff()
					}
				}
			}),
			type: "POST",
			contentType: "application/json"
		}).then(function(r) {
			$("#errorrreporting").modal('hide');
			window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent("@bosh I have a problem with Nightscout CGM Uploader") + "&url=" + encodeURIComponent(r.html_url))
		});
	})
	$("#errorreporting-disagree").click(function() {
		$("#errorrreporting").modal('hide');
	});
	$("#export").click(function() {
		Promise.all([
			new Promise(function(done) {
				chrome.fileSystem.chooseEntry({
					type: 'saveFile',
					suggestedName: "blood sugars.csv"
				}, function(writableFileEntry) {
					writableFileEntry.createWriter(done);
				});
			}),
			new Promise(function(done) {
				require(["./bloodsugar"], done);
			}),
			new Promise(function(done) {
				chrome.storage.local.get(["egvrecords"], done);
			})
		]).then(function(params) {
			var writer = params[0],
				convertBg = params[1],
				storage = params[2];
			writer.write(new Blob(
				storage.egvrecords.map(function(record) {
					return [
						(new Date(record.displayTime)).format("M j Y H:i"),
						convertBg(record.bgValue),
						record.trend
					].join(",") + "\n";
				}), {
					type: 'text/plain'
				}
			));
		})
	});
});

});
