define(function() {
	var formatDate = function(d) {
		return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
	};

	var formatData = function(plot) {
		return JSON.stringify({
			device: "dexcom",
			date: plot.displayTime,
			dateString: formatDate(new Date(plot.displayTime)),
			sgv: plot.bgValue,
			direction: plot.trend
		});
	};
	var mongolabUrl = "https://api.mongolab.com/api/1/databases/";

	var mongolab = { };
	mongolab.insert = function(plot) {
		if (!plot) return;
			
		(new Promise(function(done) {
			chrome.storage.local.get("config", function(local) {
				done(local.config || {});
			});
		})).then(function(config) {
			// have a unique constraint on date to keep it from inserting too much data.
			// mongolab returns a 400 when duplicate attempted

			console.log("[mongolab] Writing most recent record to MongoLab");
			if (!("mongolab" in config)) return;
			if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
			if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
			if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

			$.ajax({
				url: mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey,
				data: formatData(plot),
				type: "POST",
				contentType: "application/json"
			});
		});
	};

	// updated database
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			mongolab.insert(changes.egvrecords.newValue[changes.egvrecords.newValue.length - 1]);
		}
	});

	return mongolab;
});
