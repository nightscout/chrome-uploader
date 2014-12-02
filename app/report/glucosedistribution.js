function generate_report(data, high, low) {
	require(["../bloodsugar"], function(convertBg) {
		var Statician = ss;
		var days = 3 * 30; // months
		var config = { low: convertBg(low), high: convertBg(high) };
		var report = $("#report");
		report.empty();
		var minForDay, maxForDay;
		var stats = [];
		var table = $("<table>");
		var thead = $("<tr/>");
		$("<th>Range</th>").appendTo(thead);
		$("<th>% of Readings</th>").appendTo(thead);
		$("<th># of Readings</th>").appendTo(thead);
		$("<th>Mean</th>").appendTo(thead);
		$("<th>Median</th>").appendTo(thead);
		$("<th>SD</th>").appendTo(thead);
		$("<th>A1c estimation*</th>").appendTo(thead);
		thead.appendTo(table);

		["Low", "Normal", "High"].forEach(function(range) {
			var tr = $("<tr>");
			var rangeRecords = data.filter(function(record) {
				return /\d+/.test(record.bgValue.toString());
			}).filter(function(r) {
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

			$("<td><strong>" + range + ": </strong></td>").appendTo(tr);
			$("<td>" + Math.floor(100 * rangeRecords.length / data.length) + "%</td>").appendTo(tr);
			$("<td>" + rangeRecords.length + "</td>").appendTo(tr);
			if (rangeRecords.length > 0) {
				$("<td>" + Math.floor(10*Statician.mean(localBgs))/10 + "</td>").appendTo(tr);
				$("<td>" + rangeRecords[midpoint].localBg + "</td>").appendTo(tr);
				$("<td>" + Math.floor(Statician.standard_deviation(localBgs)*10)/10 + "</td>").appendTo(tr);
				$("<td> </td>").appendTo(tr);
			} else {
				$("<td>N/A</td>").appendTo(tr);
				$("<td>N/A</td>").appendTo(tr);
				$("<td>N/A</td>").appendTo(tr);
				$("<td> </td>").appendTo(tr);
			}

			table.append(tr);
		});
		
		var tr = $("<tr>");
		$("<td><strong>Overall: </strong></td>").appendTo(tr);
		$("<td> </td>").appendTo(tr);
		$("<td>" + data.length + "</td>").appendTo(tr);
		if (data.length > 0) {
			var localBgs = data.map(function(r) { return r.localBg; });
			var mgDlBgs = data.map(function(r) { return r.bgValue; });
			$("<td>" + Math.round(10*ss.mean(localBgs))/10 + "</td>").appendTo(tr);
			$("<td>" + Math.round(10*ss.quantile(localBgs, 0.5))/10+ "</td>").appendTo(tr);
			$("<td>" + Math.round(ss.standard_deviation(localBgs)*10)/10 + "</td>").appendTo(tr);
			$("<td><center>" + Math.round(10*(ss.mean(mgDlBgs)+46.7)/28.7)/10 + "%<sub>DCCT</sub> | " +Math.round(((ss.mean(mgDlBgs)+46.7)/28.7 - 2.15)*10.929) + "<sub>IFCC</sub></center></td>").appendTo(tr);
		} else {
			$("<td>N/A</td>").appendTo(tr);
			$("<td>N/A</td>").appendTo(tr);
			$("<td>N/A</td>").appendTo(tr);
			$("<td>N/A</td>").appendTo(tr);
		}
		table.append(tr);
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
	});
};
