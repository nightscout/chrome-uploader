require(["dexcom", "./datasource/diyps", "./datasource/mongolab"], function(dexcom, diyps, nightscout) { 
var attempts = 0;
var connect = function() {
	var connectionErrorCB = function(notification_id, button) {
		if (button == 0) {
			attempts = 0;
			connect().then(onConnected,onConnectError);
		} else {
			chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
			window.close();
		}
	};
	return new Promise(function(resolve, reject) {
		console.debug("[dexcom] loading");
		dexcom.connect().then(function() {
			console.debug("[dexcom] loaded");
			chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
			return dexcom.readFromReceiver(1);
		}, function(e) {
			console.log("[dexcom] rejected");
			if (attempts++ < 3) {
				connect().then(onConnect, onError);
			} else {
				chrome.notifications.create("", {
					type: "basic",
					title: "Chromadex",
					message: "Could not connect to Dexcom receiver. Unplug it and plug it back in. Be gentle, Dexcom's USB port is fragile. I like to unplug from the computer's side.",
					iconUrl: "/public/assets/error.png",
					buttons: [{
						title: "Try again"
					}, {
						title: "Cancel"
					}]
				}, function(notification_id) {
					console.log(arguments)
					debugger;
					attempts = 0;
					chrome.notifications.onButtonClicked.addListener(connectionErrorCB);
				});
				console.log(e);
			}
			reject(e);
		}).then(function(d) {
			console.debug("[dexcom] read; disconnecting");
			dexcom.disconnect();
			resolve(d);
		});
	})
},
onConnected = function(data) {
	var lastNewRecord = Date.now();

	// update my db
	var updateLocalDb = function(data) {
		return new Promise(function(resolve) {
			chrome.storage.local.get("egvrecords", function(storage) {
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
				chrome.storage.local.set({ egvrecords: to_save }, console.debug.bind(console, "[updateLocalDb] Saved results"));
				console.log("%i new records", new_records.length);
				
				resolve();
			});
		});
		
	};

	// do it
	updateLocalDb(data);

	// again and again
	setTimeout(function() {
		console.log("Attempting to refresh data");
		connect().then(onConnected, onConnectError);
	}, (30).seconds());
},
onConnectError = function(){
	console.log(arguments);
};
connect().then(onConnected, onConnectError);


$(function() {
	// event handlers

	$('#reset').confirmation({
		title: "Are you sure? This will delete all your data and cannot be undone.",
		onConfirm: function(e) {
			chrome.storage.local.set({
				egvrecords: []
			}, function() {
				console.log("removed records");
				$('#reset').confirmation('hide')
			});
		}
	});
	$('#import').click(function(b){
		chrome.notifications.create("", {
			type: "progress",
			title: "Chromadex",
			message: "Downloading entire history from Dexcom receiver.",
			iconUrl: "/public/assets/icon.png",
			progress: 0
		}, function(notification_id) {
			var i = 1;
			var data = [];
			var compile = function(i) {
				return new Promise(function(resolve,reject) {
					dexcom.readFromReceiver(i).then(function(d) {
						data.push(d);

						if (d.length) {
							resolve(d);	
						} else {
							reject();
						}
					});
				});
			},
			reader = function() {
				compile(i).then(function() {
					chrome.notifications.update(notification_id, {
						progress: i
					}, function() { });
					i++;
					reader();
				}, function() { // no more data
					chrome.notifications.update(notification_id, {
						progress: 85,
						message: "Still downloading. This part is harder and this might appear to lock up for 30 seconds. No big deal."
					}, function() { 
						setTimeout(function() {
						chrome.storage.local.get("egvrecords", function(values) {
							dexcom.disconnect();
							var existing = values.egvrecords;
							var existing_ts = existing.map(function(row) {
								return row.displayTime;
							});
							var max_existing = existing.length > 0?  existing[existing.length - 1].displayTime : 0;
							var new_records = Array.prototype.concat.apply([], data).map(function(egv) {
								return {
									displayTime: +egv.displayTime,
									bgValue: egv.bgValue,
									trend: egv.trend
								};
							}).filter(function(row) {
								return existing_ts.filter(function(ts) {
									return ts == row.displayTime;
								}).length == 0;
							}).filter(function(row) {
								return row.bgValue > 30;
							});
							var to_save = existing.concat(new_records);
							to_save.sort(function(a,b) {
								return a.displayTime - b.displayTime;
							});
							chrome.storage.local.set({ egvrecords: to_save },
								console.debug.bind(console, "[updateLocalDb] Saved results")
							);
							chrome.notifications.clear(notification_id, function() { });
							console.log("%i new records (about %i days)", new_records.length, Math.ceil(new_records.length / 216)); // 1 page holds about 18h (3/4 * 288 rec / day)
						});
						}, 300);
					});
				});
			};
			dexcom.connect().then(reader);
		});
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
});

});