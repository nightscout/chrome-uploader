Promise.all([
	new Promise(function(ready) {
		chrome.storage.local.get("egvrecords", function(values) {
			ready(values.egvrecords);
		});
	}),
	new Promise(function(ready) {
		require(["../bloodsugar"], function(convertBg) {
			ready(convertBg)
		});	
	}),
	new Promise(function(ready) {
		chrome.storage.local.get("config", function(values) {
			ready(values.config.targetrange || {
				low: 70,
				high: 180
			});
		});
	})
]).then(function(o) {
	var data = o[0],
		convertBg = o[1],
		range = o[2];
	var low = range.low,
		high = range.high;
	var config = {
		low: convertBg(low),
		high: convertBg(high)
	};
	var now = Date.now();
	var period = (7).days();
	var firstDataPoint = Math.min.apply(Math, data.map(function(record) {
		return record.displayTime;
	}));
	var quarters = Math.floor((Date.now() - firstDataPoint) / period);

	var grid = $("#grid");

	if (quarters == 0) {
		// insufficent data
		grid.append("<p>There is not yet sufficent data to run this report. Try again in a couple days.</p>");
		return;
	}

	var dim = function(n) {
		var a = [];
		for (i = 0; i < n; i++) {
			a[i]=0;
		}
		return a;
	}
	var sum = function(a) {
		return a.reduce(function(sum,v) {
			return sum+v;
		}, 0);
	}
	quarters = dim(quarters).map(function(blank, n) {
		var starting = new Date(now - (n+1) * period),
			ending = new Date(now - (n * period));
		return {
			starting: starting,
			ending: ending,
			records: data.filter(function(record) {
				return record.displayTime > starting && record.displayTime <= ending;
			})
		};
	}).map(function(quarter) {
		var bgValues = quarter.records.map(function(record) {
			return parseInt(record.bgValue,10);
		});
		quarter.standardDeviation = ss.standard_deviation(bgValues);
		quarter.average = bgValues.length > 0? (sum(bgValues) / bgValues.length): "N/A";
		quarter.lowerQuartile = ss.quantile(bgValues, 0.25); 
		quarter.upperQuartile = ss.quantile(bgValues, 0.75);
		quarter.numberLow = bgValues.filter(function(bg) {
			return bg < config.low;
		}).length;
		quarter.numberHigh = bgValues.filter(function(bg) {
			return bg >= config.high;
		}).length;
		quarter.numberInRange = bgValues.length - (quarter.numberHigh + quarter.numberLow);
		return quarter;
	});

	table.append("<thead><tr><th>Period</th><th>Lows</th><th>In Range</th><th>Highs</th><th>Standard Deviation</th><th>Low Quartile</th><th>Average</th><th>Upper Quartile</th></tr></thead>");
	table.append("<tbody>" + quarters.filter(function(quarter) {
		return quarter.records.length > 0;
	}).map(function(quarter) {
		return "<tr>" + [
			quarter.starting.format("M d Y") + " - " + quarter.ending.format("M d Y"),
			quarter.numberLow,
			quarter.numberInRange,
			quarter.numberHigh,
			Math.round(quarter.standardDeviation),
			convertBg(quarter.lowerQuartile),
			convertBg(quarter.average),
			convertBg(quarter.upperQuartile)
		].map(function(v) {
			return "<td>" + v + "</td>";
		}).join("") + "</tr>"
	}).join("") + "</tbody>");
	table.appendTo(grid);
});