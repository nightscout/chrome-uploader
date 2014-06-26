define(function() {
	var formatDate = function(d) {
		return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
	};
	return {
		insert: function(plot, mongoconfig) {
			// have a unique constraint on date to keep it from inserting too much data.
			// mongolab returns a 400 when duplicate attempted
			$.ajax({
				url: "https://api.mongolab.com/api/1/databases/dexcomhistory/collections/egv?apiKey=" + mongoconfig.apikey,
				data: JSON.stringify({
					device: "dexcom",
					date: plot.displayTime,
					dateString: formatDate(new Date(plot.displayTime)),
					sgv: plot.bgValue,
					direction: plot.trend
				}),
				type: "POST",
				contentType: "application/json"
			});
		}
	};
});