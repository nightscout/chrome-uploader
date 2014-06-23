Promise.all([
	new Promise(function(resolve) {
		dexcom.connect().then(function() {
			dexcom.readFromReceiver(1, resolve);
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
			plot.displayTime,
			plot.bgValue
		];
	});
	$.plot("#dexcomtrend", [ trend ]);
});