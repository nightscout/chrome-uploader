require(["dexcom", "./datasource/mongolab", "./datasource/trending_alerts", "waiting"], function(dexcom, mongolab, alerts, waiting) {
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
		if (identifier[MAJOR] == 10 && identifier[MINOR] == 9) {
			// ok
		} else if (identifier[MAJOR] == 10 && identifier[MINOR] > 9) {
			// probably ok
		} else if (identifier[MAJOR] > 10) {
			// *shrugs*
			setTimeout(waiting.show("You're on a newer version of OSX than this has been tested against. Please provide feedback on what happens."), (10).seconds());
		} else {
			// fail
			setTimeout(waiting.show("You're on an old version of OSX and this is unlikely to work."), (10).seconds());
		}
	}
}
var attempts = 0;

var isdownloading = false;

var connect = function() {
	var chrome_notification_id = 0;
	var connectionErrorCB = function(notification_id, button) {
		chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
		if (notification_id != chrome_notification_id) return;

		if (button === 0) {
			attempts = 0;
			connect().then(onConnected,onConnectError);
		}
	};
	return new Promise(function(resolve, reject) {
		chrome.storage.local.get("config", function(local) {
			console.debug("[dexcom] loading");
			var serialport = local.config.serialport || (isWindows? "COM3": "/dev/tty.usbmodem");
			dexcom.connect(serialport).then(function() {
				console.debug("[dexcom] loaded");
				chrome.notifications.onButtonClicked.removeListener(connectionErrorCB);
				try {
					return dexcom.readFromReceiver(1).then(function(d) {
						console.debug("[dexcom] read; disconnecting");
						dexcom.disconnect();
						resolve(d);
					});
				} catch (e) {
					console.log("[dexcom] %o", e);
					reject(e);
				}
			}, function(e) {
				console.log("[dexcom] rejected");
				if (attempts++ < 3) {
					try {
						connect().then(onConnect, onConnectError);
					} catch (e) {
						// it didn't work
					}
				} else {
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
						attempts = 0;
						chrome.notifications.onButtonClicked.addListener(connectionErrorCB);
					});
					console.log(e);
				}
				reject(e);
			});
		});
	});
},
onConnected = function(data) {
	var lastNewRecord = Date.now();

	// update my db
	var updateLocalDb = function(data) {
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

	};

	// do it
	updateLocalDb(data);

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
connect().then(onConnected, onConnectError);

$(function() {
	// event handlers
	chrome.storage.local.get(["config", "acknowledgements"], function(local) {
		if ("mongolab" in local.config) {
			$("#openmongolablink").attr("href", "https://www.mongolab.com/databases/" + local.config.mongolab.database + "/collections/" + local.config.mongolab.collection + '#indexes');
		}
		if (local.acknowledgements.seenUniqueIndex) {
			$("#adduniqueindexpointer").hide();
			$("#receiverui").show();
		}
	});

	$("#disclaimer").modal();
	$("#disclaimer").show();
	$("#acknowledge-agree").click(function() {
		$("#disclaimer.modal").modal('hide');
		$("#receiverui").show();
	});
	$("#acknowledge-disagree").click(function() {
		window.close();
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

	$("#dismissunique").click(function() {
		chrome.storage.local.get("acknowledgements", function(local) {
			local.acknowledgements = local.acknowledgements || {};
			local.acknowledgements.seenUniqueIndex = true;
			chrome.storage.local.set(local, function() {
				$("#adduniqueindexpointer").hide();
				$("#receiverui").show();
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
	var downloadTheWorld = function(b){
		waiting.show('Downloading entire history from Dexcom receiver');
		isdownloading = true;

		var i = 1;
		var data = [];
		var compile = function(i) {
			return new Promise(function(resolve,reject) {
				try {
					dexcom.readFromReceiver(i).then(function(d) {
						data.push(d);

						if (d.length) {
							resolve(d);
						} else {
							reject();
						}
					});
				} catch (e) {
					reject(e);
				}
			});
		},
		reader = function() {
			compile(i).then(function() {
				waiting.setProgress(i);
				i++;
				reader();
			}, function() { // no more data
				waiting.setProgress(85);
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
							}).length === 0;
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
						waiting.hide();
						isdownloading = false;
						chrome.notifications.create("", {
							title: "Download complete",
							type: "basic",
							message: "Downloaded " + new_records.length + " new records (about " + Math.ceil(new_records.length / 216) + " day(s) worth."
						}, function() { });
						console.log("%i new records (about %i days)", new_records.length, Math.ceil(new_records.length / 216)); // 1 page holds about 18h (3/4 * 288 rec / day)
					});
				}, 300);
			});
		};
		chrome.storage.local.get("config", function(local) {
			try {
				dexcom.connect(local.config.serialport).then(reader, function() {
					chrome.notifications.update(notification_id, {
						message: "Could not find a connected Dexcom from which to download.",
						iconUrl: "/public/assets/error.png"
					}, function() { });
				});
			} catch (e) {
				chrome.notifications.update(notification_id, {
					message: "Could not find a connected Dexcom to download from"
				}, function() { });
			}
		});
	};
	$(".downloadallfromdexcom").click(downloadTheWorld);
	var downloadAllConfirmation = $('#import').confirmation({
		title: "You usually only need to download once. NightScout.info CGM Utility automatically gets the last 18h data, but this will download everything else (So if you plugged in yesterday, no need to do this. If you plugged in last week, or this is your first time using NightScout.info CGM Utility, go ahead)",
		btnOkLabel: "Download",
		btnOkClass: "btn btn-sm btn-primary",
		onConfirm: downloadTheWorld
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
	$("#openoptions").click(function(){
		new Promise(function(done) {
			chrome.storage.local.get("config", function(config) {
				config.config.serialport = config.config.serialport || "/dev/tty.usbmodem";
				config.config.unit = config.config.unit || "mgdl";
				done(config.config);
			});
		}).then(function(config) {
			console.log(config);
			function getValue(param, options) {
				var parts = param.split(".");
				var key = parts.shift();
				if (parts.length > 0) {
					return getValue(parts.join("."), options[key]);
				} else {
					return (typeof options == "object" && key in options)? options[key]: "";
				}
			}
			$("#optionsui input,#optionsui select").map(function(ix) {
				$(this).val(getValue(this.name, config));
			});
		});
		$("#optionsui").show();
		$("#receiverui").hide();

	});
	chrome.serial.getDevices(function(ports) {
		var isWindows = !!~window.navigator.appVersion.indexOf("Win");
		document.getElementById("serialportlist").innerHTML += (isWindows? "<li>Default is <code>COM3</code>. Other's available when NightScout.info CGM Utility started include</li>": "<li>Default is <code>/dev/tty.usbmodem</code>. Others available when NightScout.info CGM Utility started include</li>") + ports.map(function(sp) {
			if (!isWindows || sp.path != "COM3") return "<li><code>" + sp.path + "</code></li>"; else return "";
		}).join("");
		$("#serialportlist code").click(function(event) {
			$("input[name=serialport]").val(this.textContent);
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
	$("#savesettings").click(function() {
		chrome.storage.local.set({
			config: $("#optionsui input, #optionsui select").toArray().reduce(function(out, field) {
				var parts = field.name.split(".");
				var key = parts.shift();
				var working = out;
				while (parts.length > 0) {
					if (!(key in working)) {
						working[key] = {};
					}
					working = working[key];
					key = parts.shift();
				}
				working[key] = field.value;
				return out;
			}, {})
		}, function() {
			console.log("saved settings");
			$("#optionsui").hide();
			$("#receiverui").show();
		});
	});
	$("#resetchanged").click(function() {
		$("#optionsui").hide();
		$("#receiverui").show();
	});
	$("#fixit").click(function() {
		$("#errorrreporting").modal();
		$("#errorrreporting").show();
		$("#whatswrong").val("");
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
			console.log(r.html_url);
			$("#errorrreporting").hide();
			window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent("@bosh I have a problem with Nightscout CGM Uploader") + "&url=" + encodeURIComponent(r.html_url))
		});
	})
	$("#errorreporting-disagree").click(function() {
		$("#errorrreporting").hide();
	});
	$("#testconnection").click(function() {
		var config = $("#optionsdatabase input").toArray().reduce(function(out, field) {
			out[field.name] = field.value;
			return out;
		}, {});
		var worker = function() { };
		var applyChoice = function(notification_id, button) {
			worker.apply(this,arguments);
		};
		chrome.notifications.onButtonClicked.removeListener(applyChoice);
		mongolab.testConnection(config["mongolab.apikey"], config["mongolab.database"], config["mongolab.collection"]).then(function ok() {
			console.log("[mongolab] connection check ok");
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "This mongolab configuration checks out ok",
				iconUrl: "/public/assets/icon.png"
			}, function(chrome_notification_id) { });
		}, function fail(error) {
			console.log("[mongolab] " + error.error, error.avlb);
			if (error.type == "database") {
				chrome.notifications.create("", {
					type: (error.avlb.length > 0? "list": "basic"),
					title:  error.error + ": " + error.selected,
					message: "The " + error.type + " was not correct",
					iconUrl: "/public/assets/icon.png",
					buttons: (error.avlb.length > 0 && error.avlb.length <= 2)? error.avlb.map(function(choice) {
						return { title: "Use " + choice };
					}) : undefined,
					items: error.avlb.map(function(option) {
						return {
							title: option,
							message: error.type
						};
					})
				}, function(chrome_notification_id) {
					worker = function(notification_id, button) {
						if (notification_id == chrome_notification_id) {
							var selection = error.avlb[button];
							var fields = {
								database: "#options-database-name",
								collection: "#options-database-collection",
								apikey: "#options-database-apiuser"
							};
							$(fields[error.type]).val(selection);
						}
						chrome.notifications.onButtonClicked.removeListener(applyChoice);
					};
					chrome.notifications.onButtonClicked.addListener(applyChoice);
				});
			} else if (error.type == "collection") {
				if (error.avlb.length > 0) {
					chrome.notifications.create("", {
						type: "list",
						iconUrl: "/public/assets/icon.png",
						title: "Collection not found",
						message: "",
						buttons: [{
							title: "Keep " + error.selected + " (creates new collection)"
						}].concat(error.avlb.map(function(choice) {
							return { title: "Use " + choice };
						})).slice(0,2),
						items: error.avlb.map(function(option) {
							return {
								title: option,
								message: error.type
							};
						})
					}, function(chrome_notification_id) {
						worker = function(notification_id, button) {
							if (notification_id == chrome_notification_id && button > 0) {
								var selection = error.avlb[button - 1] || error.selected;
								var fields = {
									database: "#options-database-name",
									collection: "#options-database-collection",
									apikey: "#options-database-apiuser"
								};
								$(fields[error.type]).val(selection);
							}
							chrome.notifications.onButtonClicked.removeListener(applyChoice);
						};
						chrome.notifications.onButtonClicked.addListener(applyChoice);
					});
				} else {
					console.log("collection name not found but it will be automatically made");
				}
			} else {
				chrome.notifications.create("", {
					type: error.avlb.length > 0? "list": "basic",
					title:  error.error + ": " + error.selected,
					message: "The " + error.type + " was not correct",
					iconUrl: "/public/assets/icon.png",
					buttons: (error.avlb.length > 0 && error.avlb.length <= 2)? error.avlb.map(function(choice) {
						return { title: "Use " + choice };
					}) : undefined,
					items: error.avlb.map(function(option) {
						return {
							title: option,
							message: error.type
						};
					})
				}, function(chrome_notification_id) {
					worker = function(notification_id, button) {
						if (notification_id == chrome_notification_id) {
							var selection = error.avlb[button];
							var fields = {
								database: "#options-database-name",
								collection: "#options-database-collection",
								apikey: "#options-database-apiuser"
							};
							$(fields[error.type]).val(selection);
						}
						chrome.notifications.onButtonClicked.removeListener(applyChoice);
					};
					chrome.notifications.onButtonClicked.addListener(applyChoice);
				});
			}
		});
	});
});

});
