require(["../bloodsugar"], function(convertBg) {
	var low, high;
	Promise.all([
		new Promise(function(ready) {
			chrome.storage.local.get(["egvrecords", "config"], function(values) {
				if ("config" in values && "targetrange" in values.config) {
					low = values.config.targetrange.low || 70;
					high = values.config.targetrange.high || 180;
				} else {
					low = 70;
					high = 180;
				}
				
				ready(values.egvrecords.map(function(r) {
					r.localBg = convertBg(r.bgValue);
					return r;
				}));
			});
		})
	]).then(function(o) {
		var data = o[0], Statician = ss;
		var days = 3 * 30; // months
		var config = { low: convertBg(low), high: convertBg(high) };
		var threemonthsago = new Date(Date.now() - days.days());
		threemonthsago.setSeconds(0);
		threemonthsago.setMinutes(0);
		threemonthsago.setHours(0);
		threemonthsago.setMilliseconds(0);
		var report = $("#report");
		var minForDay, maxForDay;
		var stats = [];

		data = data.filter(function(record) {
			return record.displayTime > threemonthsago;
		});
		var table = $("<table>");
		var thead = $("<tr/>");
		$("<th>Range</th>").appendTo(thead);
		$("<th>% of Readings</th>").appendTo(thead);
		$("<th># of Readings</th>").appendTo(thead);
		$("<th>Mean</th>").appendTo(thead);
		$("<th>Median</th>").appendTo(thead);
		$("<th>SD</th>").appendTo(thead);
		thead.appendTo(table);

		["Low", "Normal", "High"].forEach(function(range) {
			var tr = $("<tr>");
			var rangeRecords = data.filter(function(r) {
				r.localBg = parseFloat(r.localBg);
				if (range == "Low") {
					return r.localBg > 0 && r.localBg < config.low;
				} else if (range == "Normal") {
					return r.localBg >= config.low && r.localBg < config.high;
				} else {
					return r.localBg >= config.high;
				}
			});
			stats.push(rangeRecords.length);
			rangeRecords.sort(function(a,b) {
				return a.localBg - b.localBg;
			});
			var localBgs = rangeRecords.map(function(r) { return r.localBg; });

			var midpoint = Math.floor(rangeRecords.length / 2);
			//var statistics = ss.(new Statician(rangeRecords.map(function(r) { return r.localBg; }))).stats;

			$("<td>" + range + "</td>").appendTo(tr);
			$("<td>" + Math.floor(100 * rangeRecords.length / data.length) + "%</td>").appendTo(tr);
			$("<td>" + rangeRecords.length + "</td>").appendTo(tr);
			if (rangeRecords.length > 0) {
				$("<td>" + Math.floor(10*Statician.mean(localBgs))/10 + "</td>").appendTo(tr);
				$("<td>" + rangeRecords[midpoint].localBg + "</td>").appendTo(tr);
				$("<td>" + Math.floor(Statician.standard_deviation(localBgs)*10)/10 + "</td>").appendTo(tr);
			} else {
				$("<td>N/A</td>").appendTo(tr);
				$("<td>N/A</td>").appendTo(tr);
				$("<td>N/A</td>").appendTo(tr);
			}

			table.append(tr);
		});

		report.append(table);

		setTimeout(function() {
			$.plot(
				"#overviewchart",
				stats,
				{
					series: {
						pie: {
							show: true
						}
					},
					colors: ["#f88", "#8f8", "#ff8"]
				}
			);
		});

		$(".print").click(function(e) {
			e.preventDefault();
			window.print();
		});
	});
});