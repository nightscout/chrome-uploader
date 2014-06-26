require(["dexcom"], function(dexcom) { 

Promise.all([
	// load config-y stuff

	new Promise(function(resolve, reject) {
		console.debug("[dexcom] loading");
		dexcom.connect().then(function() {
			console.debug("[dexcom] loaded");
			return dexcom.readFromReceiver(1);
		}, function(e) {
			console.log("[dexcom] rejected");
			reject(e);
		}).then(function(d) {
			console.debug("[dexcom] read; disconnecting");
			dexcom.disconnect();
			resolve(d);
		});
	}),
	new Promise(function(resolve) {
		console.debug("[mongoconfig] Loading");
		$.ajax({
			url: "../mongoconfig.json", 
			success: function(d) {
				console.debug("[mongoconfig] loaded");
				resolve(JSON.parse(d));
			}
		});
	}),
	new Promise(function(resolve) {
		console.debug("[diypsconfig] Loading");
		$.ajax({
			url: "../diypsconfig.json", 
			success: function(d) {
				console.debug("[diypsconfig] loaded");
				resolve(JSON.parse(d));
			}
		});
	})
]).then(function(results) {
	var data = results[0];
	mongoconfig = results[1],
	diypsconfig = results[2];
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
				var to_save = existing.concat(new_records);
				to_save.sort(function(a,b) {
					return a.displayTime - b.displayTime;
				})
				chrome.storage.local.set({ egvrecords: to_save }, console.debug.bind(console, "[updateLocalDb] Saved results"));
				console.log("%i new records", new_records.length);
				if (new_records.length == 0) {
					if (lastNewRecord + (5).minutes() < Date.now()) {
						console.log("[updateLocalDb] Something's wrong. We should have new data by now.");
					}
				} else {
					lastNewRecord = Date.now();
				}
				resolve();
			});
		});
		
	};

	// do it
	updateLocalDb(data);

	// again and again
	setInterval(function() {
		console.log("Attempting to refresh data");
		try {
			dexcom.connect().then(function() {
				return dexcom.readFromReceiver(1);
			}).then(updateLocalDb).then(function() {
				dexcom.disconnect();
			});
		} catch (e) {
			console.debug(e);
		}
	}, (30).seconds());
}, function(){
	console.log(arguments);
});

var mongoconfig = {}, diypsconfig = {};
var saveToMongoLab = function(data) {
	if (mongoconfig.apikey) require(["datasource/mongolab"], function(mongolab) {
		mongolab.insert(data[data.length - 1], mongoconfig);
	});
};

var saveToDiyPS = function(data) {
	if (diypsconfig.endPoint) require(["./datasource/diyps"], function(diyps) {
		diyps.replace(data, diypsconfig);
	})
};

function drawReceiverChart(data) {
	var t = 3; //parseInt($("#timewindow").val(),10);
	var now = (new Date()).getTime();
	var trend = data.map(function(plot) {
		return [
			+plot.displayTime,
			plot.bgValue
		];
	}).filter(function(plot) {
		return plot[0] + t.hours() > now;
	});
	$.plot(
		"#dexcomtrend",
		[{
			label: "#CGMthen",
			data: trend
		}],
		{
			xaxis: {
				mode: "time"
			}
		}
	);
	$("#cgmnow").text(data[data.length - 1].bgValue);
	$("#cgmdirection").text(data[data.length - 1].trend);
	$("#cgmtime").text((new Date(data[data.length - 1].displayTime)).toTimeString());
}

// updated database
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if ("egvrecords" in changes)  {
		drawReceiverChart(changes.egvrecords.newValue);
		saveToMongoLab(changes.egvrecords.newValue);
		saveToDiyPS(changes.egvrecords.newValue);
	}
});

// first load, before receiver's returned data
chrome.storage.local.get("egvrecords", function(values) {
	drawReceiverChart(values.egvrecords);
});

$(function() {
	// event handlers

	$('#reset').confirmation({
		title: "Are you sure? This will delete all your data and cannot be undone.",
		onConfirm: function() {
			chrome.storage.local.remove("egvrecords", function() { });
		}
	});
	$('#import').click(function(b){
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
				i++;
				reader();
			}, function() { // no more data
				dexcom.disconnect();
				var existing = [];
				var new_records = Array.prototype.concat.apply([], data).map(function(egv) {
					return {
						displayTime: +egv.displayTime,
						bgValue: egv.bgValue,
						trend: egv.trend
					};
				});
				var to_save = existing.concat(new_records);
				to_save.sort(function(a,b) {
					return a.displayTime - b.displayTime;
				});
				chrome.storage.local.remove("egvrecords", function() {
					chrome.storage.local.set({ egvrecords: to_save }, console.debug.bind(console, "[updateLocalDb] Saved results"));
				});
				console.log("%i new records (about %i days)", new_records.length, Math.ceil(data.length * 3 / 4)); // 1 page holds about 18h (3/4 of 1 day)
			});
		};
		dexcom.connect().then(reader);
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