Promise.all([
	new Promise(function(resolve) {
		dexcom.connect().then(function() {
			setTimeout(function() {
				dexcom.readFromReceiver(1, resolve);
			}, 500);
		});
	}),
	new Promise(function(resolve) {
		// for loading graphing lib- now embedded
		resolve();
	})
]).then(function(results) {
	var data = results[0];
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