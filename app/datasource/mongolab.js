define(function() {
	var config = new Promise(function(resolve) {
		console.debug("[mongolab] loading config");
		$.ajax({
			url: "/mongoconfig.json", 
			success: function(d) {
				console.debug("[mongolab] loaded config");
				resolve(JSON.parse(d));
			}
		});
	});
	var formatDate = function(d) {
		return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
	};

	var mongolab = {
		insert: function(plot) {
			// have a unique constraint on date to keep it from inserting too much data.
			// mongolab returns a 400 when duplicate attempted
			config.then(function(mongoconfig) {
				console.log("[mongolab] Writing most recent record to MongoLab");
				if (!("apiKey" in mongoconfig || mongoconfig.apiKey.length > 0)) return;

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
			});
		}
	};

	// updated database
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			mongolab.insert(changes.egvrecords.newValue[changes.egvrecords.newValue.length - 1])
		}
	});

	return mongolab;
});