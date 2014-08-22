// var executionQueue = function() {
// 	var args = Array.prototype.slice.apply(arguments, 0);
// 	while (args.length) {
// 		this.push(args.shift());
// 	}
// 	var currFn = queue.shift();
// 	var queue = this;
// 	var promiseImpl = function(promise_ok, promise_fail) {
// 		currFn(function ok() {
// 			currFn = queue.shift();
// 			if (typeof currFn == "function") {
// 				new Promise(promiseImpl);
// 			} else {
// 				promise_ok.apply(queue, arguments);
// 			}
// 		}, function fail() {
// 			promise_fail.apply(queue, arguments);
// 		});
// 	};
// 	var myPromise = new Promise(promiseImpl);
// };

// executionQueue.prototype = [];



define(function() {
	var formatDate = function(d) {
		return (1900 + d.getFullYear()) + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
	};

	var structureData = function(plot) {
		return {
			device: "dexcom",
			date: plot.displayTime,
			dateString: formatDate(new Date(plot.displayTime)),
			sgv: plot.bgValue,
			direction: plot.trend
		};
	};

	var formatData = function(plot) {
		return JSON.stringify(structureData(plot));
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

	mongolab.populateLocalStorage = function() {
		return new Promise(function(complete) {
			(new Promise(function(done) {
				chrome.storage.local.get("config", function(local) {
					done(local.config || {});
				});
			})).then(function(config) {
				// have a unique constraint on date to keep it from inserting too much data.
				// mongolab returns a 400 when duplicate attempted

				console.log("[mongolab] Requesting all data from MongoLab");
				if (!("mongolab" in config)) return;
				if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
				if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
				if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

				$.getJSON(mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey).then(function(data) {
					chrome.storage.local.get("egvrecords", function(local) {
						var records = (local.egvrecords || []).concat(data.map(function(record) {
							return {
								displayTime: record.date,
								bgValue: record.sgv,
								trend: record.direction
							};
						}));
						records.sort(function(a,b) {
							return a.displayTime - b.displayTime;
						});
						records = records.filter(function(rec, ix, all) {
							if (ix === 0) return true;
							return all[ix - 1].displayTime != rec.displayTime;
						});

						chrome.storage.local.set({ egvrecords: records }, console.debug.bind(console, "[mongolab] grabbed all records from interwebs"));
						complete(records);
					});
				});
			});
		});
	};

	mongolab.publish = function(records) {
		return new Promise(function(complete) {
			(new Promise(function(done) {
				chrome.storage.local.get("config", function(local) {
					done(local.config || {});
				});
			})).then(function(config) {
				// have a unique constraint on date to keep it from inserting too much data.
				// mongolab returns a 400 when duplicate attempted

				console.log("[mongolab] Publishing all data to MongoLab");
				if (!("mongolab" in config)) return;
				if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
				if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
				if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

				$.ajax({
					url: mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey,
					data: JSON.stringify(records.map(structureData)),
					type: "POST",
					contentType: "application/json"
				}).then(complete);
			});
		});
	};

	mongolab.testConnection = function(apikey, databasename, collectionname) {
		return new Promise(function(ok, fail) {
			$.getJSON(mongolabUrl + "?apiKey=" + apikey).then(function(r) {
				// db ok
				if (r.filter(function(ml_db_name) {
					return ml_db_name == databasename;
				}).length > 0) {
					$.getJSON(mongolabUrl + databasename +  "/collections?apiKey=" + apikey).then(function(r) {
						// db ok
						if (r.filter(function(ml_col_name) {
							return ml_col_name == collectionname;
						}).length > 0) {
							ok();
						} else {
							fail({ error: "Bad collection name", type: "collection", avlb: r.filter(function(choice) {
								return choice.substr(0,7) !== "system.";
							}), selected: collectionname });
						}
					}, function(r) {
						// db fail
						fail({ error: "Bad API Key", type: "apikey", avlb: [], selected: apikey });
					});
				} else {
					fail({ error: "Bad database name", type: "database", avlb: r, selected: databasename });
				}
			}, function(r) {
				// db fail
				fail({ error: "Bad API Key", type: "apikey", avlb: [], selected: apikey });
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
