define(function() {
	return {
		insert: function(plot, mongoconfig) {
			$.ajax({
				url: "https://api.mongolab.com/api/1/databases/dexcomhistory/collections/egv?apiKey=" + mongoconfig.apikey,
				data: JSON.stringify([{
					device: "dexcom",
					timestamp: +plot.displayTime,
					bg: plot.bgValue,
					direction: plot.trend
				}]),
				type: "POST",
				contentType: "application/json"
			});
		}
	}
});