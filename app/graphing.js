Promise.all([
	new Promise(function(resolve) {
		dexcom.connect().then(function() {
			setTimeout(function() {
				dexcom.readFromReceiver(1, function(d) {
					resolve(d);
				});
			}, 500);
		});
	}),
	new Promise(function(resolve) {
		console.log("[mongoconfig] Loading");
		$.ajax({
			url: "../mongoconfig.json", 
			success: function(d) {
				console.log("[mongoconfig] loaded");
				resolve(JSON.parse(d));
			}
		});
	}),
	new Promise(function(resolve) {
		console.log("[diypsconfig] Loading");
		$.ajax({
			url: "../diypsconfig.json", 
			success: function(d) {
				console.log("[diypsconfig] loaded");
				resolve(JSON.parse(d));
			}
		});
	})
]).then(function(results) {
	var data = results[0],
		mongoconfig = results[1],
		diypsconfig = results[2];
	// $.ajax({
	// 	url: "https://api.mongolab.com/api/1/databases/dexcomhistory/collections/egv?apiKey=" + mongoconfig.apikey,
	// 	data: JSON.stringify(data.map(function(plot) {
	// 		return {
	// 			device: "dexcom",
	// 			timestamp: +plot.displayTime,
	// 			bg: plot.bgValue,
	// 			direction: plot.trend
	// 		};
	// 	})),
	// 	type: "POST",
	// 	contentType: "application/json"
	// });
	chrome.storage.local.get("egvrecords", function(storage) {
		debugger;
		var existing = storage.egvrecords || [];
		var max_existing = existing.length > 0?  existing[existing.length - 1].displayTime : 0;
		var to_save = existing.concat(data.filter(function(egv) {
			return egv.displayTime > max_existing;
		}).map(function(egv) {
			return {
				displayTime: +egv.displayTime,
				bgValue: egv.bgValue,
				trend: egv.trend
			};
		}));
		chrome.storage.local.set({ egvrecords: to_save }, console.log.bind(console, "Saved results"));
	});
	

	$.post(diypsconfig.endPoint,
		{
			records: JSON.stringify(data.map(function(plot) {
				return [
					+plot.displayTime,
					plot.bgValue,
					plot.trend
				];
			}))
		}
	);
	var trend = data.map(function(plot) {
		return [
			+plot.displayTime,
			plot.bgValue
		];
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
});