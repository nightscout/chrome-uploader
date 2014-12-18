define(["/app/config.js!", "../feature/mongolab"], function(config, mongolab) {
	var ml;
	var mongolabUrl = "https://api.mongolab.com/api/1/databases/";
	return {
		connect: function() {
			return new Promise(function(good, bad) {
				ml = config.mongolab;
				var doit = function() {
					if (config.mongolab.apikey && config.mongolab.database && config.mongolab.collection) // don't attempt to test without a config
						mongolab.testConnection(config.mongolab.apikey, config.mongolab.database, config.mongolab.collection).then(good, bad);
				};
				if ("mongolab" in config) doit();
				else config.on("mongolab", doit);
			});
		},
		// connect: function() {
		// 	return new Promise(function(good, bad) {
		// 		var ml = config.mongolab;
		// 		if (ml.apikey && ml.database && ml.collection) // don't attempt to test without a config
		// 			mongolab.testConnection(ml.apikey, ml.database, ml.collection).then(good, bad);
		// 	});
		// },
		disconnect: function() {
			// no op
		}, 
		readFromReceiver: function(pageoffset) {
			return new Promise(function(good, bad) {
				$.getJSON(
					mongolabUrl + ml.database + "/collections/" + ml.collection + "?apiKey=" + ml.apikey + "&l=300&sk=" + (300 * (pageoffset - 1)) + "&s={\"date\":-1}"
				).then(function(docs) {
					good(docs.filter(function(record) {
						if (Object.keys(record).indexOf("type") > -1) {
							return record.type == "sgv";
						} else {
							return true;
						}
					}));
				}, bad)
			});
		}
	}
});