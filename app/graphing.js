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
		// for loading graphing lib- now embedded
		$.ajax({
			url: "../mongoconfig.json", 
			success: function(d) {
				console.log("[mongoconfig] loaded");
				resolve(JSON.parse(d));
			}
		});
	})
]).then(function(results) {
	var data = results[0],
		mongoconfig = results[1];
	debugger;
	$.ajax({
		url: "https://api.mongolab.com/api/1/databases/dexcomhistory/collections/egv?apiKey=" + mongoconfig.apikey,
		data: JSON.stringify(data.map(function(plot) {
			return {
				device: "dexcom",
				timestamp: +plot.displayTime,
				bg: plot.bgValue,
				direction: plot.trend
			};
		})),
		type: "POST",
		contentType: "application/json"
	});
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