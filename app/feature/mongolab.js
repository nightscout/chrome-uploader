define(["../waiting", "../store/egv_records", "/app/config.js!"], function(waiting, egvrecords, config) {
	var mongolabUrl = "https://api.mongolab.com/api/1/databases/";

	var mongolab = { };
	
	navigator.getBattery().then(function(battery) {
		var update = function() {
			console.debug("[Mongolab] Setting battery to %i in Mongolab", battery.level * 100)
			$.ajax({
				url: mongolabUrl + config.mongolab.database + "/collections/devicestatus?apiKey=" + config.mongolab.apikey + "&u=true&q={\"id\":\"config\"}",
				data: JSON.stringify({
					"$set": {
						uploaderBattery: battery.level * 100
					}
				}),
				type: "PUT",
				contentType: "application/json"
			});
		}
		if (config.mongolab && config.mongolab.apikey) {
			update();
			battery.addEventListener('levelchange', update);
		}
	});

	// http://stackoverflow.com/a/8462701
	function formatFloat(num,casasDec,sepDecimal,sepMilhar) {
		if (num < 0)
		{
			num = -num;
			sinal = -1;
		} else
			sinal = 1;
		var resposta = "";
		var part = "";
		if (num != Math.floor(num)) // decimal values present
		{
			part = Math.round((num-Math.floor(num))*Math.pow(10,casasDec)).toString(); // transforms decimal part into integer (rounded)
			while (part.length < casasDec)
				part = '0'+part;
			if (casasDec > 0)
			{
				resposta = sepDecimal+part;
				num = Math.floor(num);
			} else
				num = Math.round(num);
		} // end of decimal part
		while (num > 0) // integer part
		{
			part = (num - Math.floor(num/1000)*1000).toString(); // part = three less significant digits
			num = Math.floor(num/1000);
			if (num > 0)
				while (part.length < 3) // 123.023.123  if sepMilhar = '.'
					part = '0'+part; // 023
			resposta = part+resposta;
			if (num > 0)
				resposta = sepMilhar+resposta;
		}
		if (sinal < 0)
			resposta = '-'+resposta;
		return resposta;
	}

	var formatDate = function(d) {
		return (d.getFullYear()) + "/" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes();
	};

	var structureData = function(plot) {
		return {
			device: "dexcom",
			date: plot.displayTime,
			dateString: (new Date(plot.displayTime)).format("c"),
			sgv: formatFloat(plot.bgValue, 2, "."),
			direction: plot.trend,
			type: "sgv"
		};
	};

	var formatData = function(plot) {
		return JSON.stringify(structureData(plot));
	};
	mongolab.insert = function(plot) {
		if (!plot) return;
			
		// have a unique constraint on date to keep it from inserting too much data.
		// mongolab returns a 400 when duplicate attempted

		if (!("mongolab" in config)) return;
		if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
		if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
		if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

		console.log("[mongolab.js insert] Writing record to MongoLab %o", plot);
		
		$.ajax({
			url: mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey,
			data: formatData(plot),
			type: "POST",
			contentType: "application/json"
		});
	};

	mongolab.addAll = function(plots) {
		if (plots.length == 0) return;
			
		// have a unique constraint on date to keep it from inserting too much data.
		// mongolab returns a 400 when duplicate attempted

		if (!("mongolab" in config)) return;
		if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
		if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
		if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

		console.log("[mongolab.js insert] Writing records to MongoLab %o", plots);
		
		$.ajax({
			url: mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey,
			data: JSON.stringify(plots.map(function(egv) {
				return structureData(egv);
			})),
			type: "POST",
			contentType: "application/json"
		});
	};

	mongolab.populateLocalStorage = function() { // (download from mongolab)
		waiting.show("Downloading from Mongolab");
		return new Promise(function(complete) {
			// have a unique constraint on date to keep it from inserting too much data.
			// mongolab returns a 400 when duplicate attempted

			console.log("[mongolab] Requesting all data from MongoLab");
			if (!("mongolab" in config)) return;
			if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
			if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
			if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

			// get count (can't transfer more than 1000 at a time)
			$.getJSON(mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?c=true&apiKey=" + config.mongolab.apikey).then(function(total) {
				var requests = [];
				do {
					requests.push(mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey + "&l=1000&sk=" + 1000 * requests.length);
					total -= 1000;
				} while (total > 0);
				Promise.all(requests.map(function(url) {
					return $.getJSON(url);
				})).then(function() {
					var data = [];
					var args = Array.prototype.slice.call(arguments, 0);
					while (args.length) data = Array.prototype.concat.apply(data, args.shift());
					var existing = egvrecords.map(function(egv_r) {
						return egv_r.displayDate;
					});
					var records = data.filter(function(record) {
						if (Object.keys(record).indexOf("type") > -1) {
							return record.type == "sgv";
						} else {
							return true;
						}
					}).map(function(record) {
						return {
							displayTime: Date.parse(record.dateString) || record.date,
							bgValue: parseInt(record.sgv),
							trend: record.direction,
							recordSource: "mongolab"
						};
					}).filter(function(record){
						return (existing.indexOf(record.displayTime) == -1)
					}).filter(function(rec, ix, all) {
						if (rec.bgValue <= 30) return false;
						if (ix == 0) return true;
						return all[ix - 1].displayTime != rec.displayTime;
					});
					try {
						egvrecords.addAll(records);
					} catch (e) {
						console.log(e)
					}
					complete({ new_records: records, raw_data: data });
					waiting.hide();
				});
			});
		});
	};

	mongolab.publish = function(records) { // (backfill mongolab)
		waiting.show("Sending entire history to MongoLab");
		return new Promise(function(complete) {
			// have a unique constraint on date to keep it from inserting too much data.
			// mongolab returns a 400 when duplicate attempted

			console.log("[mongolab] Publishing all data to MongoLab");
			if (!("mongolab" in config)) return;
			if (!("apikey" in config.mongolab && config.mongolab.apikey.length > 0)) return;
			if (!("collection" in config.mongolab && config.mongolab.collection.length > 0)) return;
			if (!("database" in config.mongolab && config.mongolab.database.length > 0)) return;

			var record_sections = [];
			do {
				record_sections.push(records.slice(record_sections.length * 1000, (record_sections.length + 1) * 1000));
			} while ((record_sections.length * 1000) < records.length);

			Promise.all(record_sections.map(function(records) {
				return $.ajax({
					url: mongolabUrl + config.mongolab.database + "/collections/" + config.mongolab.collection + "?apiKey=" + config.mongolab.apikey,
					data: JSON.stringify(records.map(structureData)),
					type: "POST",
					contentType: "application/json"
				});
			})).then(function() {
				waiting.hide();
				complete();
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
	egvrecords.onChange(function(new_r, all) {
		var datasource = "dexcom";
		if ("datasource" in config) datasource = config.datasource || "dexcom";
		if (datasource == "dexcom") {
			mongolab.addAll(new_r.filter(function(egv) {
				return egv.recordSource != "mongolab";
			}));
		}
	});

	return mongolab;
});
