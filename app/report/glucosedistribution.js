Promise.all([
new Promise(function(ready) {
	chrome.storage.local.get("egvrecords", function(values) {
		ready(values.egvrecords);
	});
})
]).then(function(o) {
	var data = o[0];
	var days = 3 * 30; // months
	var config = { low: 70, high: 180 };
	var threemonthsago = new Date(Date.now() - days.days());
	threemonthsago.setSeconds(0);
	threemonthsago.setMinutes(0);
	threemonthsago.setHours(0);
	threemonthsago.setMilliseconds(0);
	var report = $("#report");
	var minForDay, maxForDay;
	var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
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
			if (range == "Low") {
				return r.bgValue > 0 && r.bgValue < config.low;
			} else if (range == "Normal") {
				return r.bgValue >= config.low && r.bgValue < config.high;
			} else {
				return r.bgValue >= config.high;
			}
		});
		stats.push(rangeRecords.length);

		$("<td>" + range + "</td>").appendTo(tr);
		$("<td>" + Math.floor(100 * rangeRecords.length / data.length) + "%</td>").appendTo(tr);
		$("<td>" + rangeRecords.length + "</td>").appendTo(tr);
		$("<td>" + Math.floor(rangeRecords.map(function(r) { return r.bgValue; }).reduce(function(o,v) { return o+v; }, 0) / rangeRecords.length) + "</td>").appendTo(tr);
		$("<td colspan=\"2\">I didn't calculate this because I don't care</td>").appendTo(tr);

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

});