define(function() {
	console.debug("[mongolab] loading config");
	var config = $.getJSON("/mongoconfig.json", function(d) {
		console.debug("[mongolab] loaded config");
	});
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
	var mongolabUrl = "https://api.mongolab.com/api/1/databases/dexcomhistory/collections/egv?apiKey=";

	var mongolab = { };
	mongolab.insert = function(plot) { config.then(function(mongoconfig) {
		// have a unique constraint on date to keep it from inserting too much data.
		// mongolab returns a 400 when duplicate attempted
		
		console.log("[mongolab] Writing most recent record to MongoLab");
		if (!("apikey" in mongoconfig || mongoconfig.apikey.length > 0)) return;

		$.ajax({
			url: mongolabUrl + mongoconfig.apikey,
			data: formatData(plot),
			type: "POST",
			contentType: "application/json"
		});
	}); };

	// updated database
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			mongolab.insert(changes.egvrecords.newValue[changes.egvrecords.newValue.length - 1]);
		}
	});

	return mongolab;
});