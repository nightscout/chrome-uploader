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
		var data = o[0];
		var days = 3 * 30; // months
		var config = { low: convertBg(low), high: convertBg(high) };
		var threemonthsago = new Date(Date.now() - days.days());
		threemonthsago.setSeconds(0);
		threemonthsago.setMinutes(0);
		threemonthsago.setHours(0);
		threemonthsago.setMilliseconds(0);
		var report = $("#report");
		var stats = [];
		var pivotedByHour = {};

		data = data.filter(function(record) {
			data.localBg = parseFloat(data.localBg);
			return record.displayTime > threemonthsago;
		});
		for (var i = 0; i < 24; i++) {
			pivotedByHour[i] = [];
		}
		data.forEach(function(record) {
			var d = new Date(record.displayTime);
			pivotedByHour[d.getHours()].push(record);
		});
		var table = $("<table width=\"100%\" border=\"1\">");
		var thead = $("<tr/>");
		$("<th>Time</th>").appendTo(thead);
		$("<th>Readings</th>").appendTo(thead);
		$("<th>Avg</th>").appendTo(thead);
		$("<th>Min</th>").appendTo(thead);
		$("<th>Quartile 25</th>").appendTo(thead);
		$("<th>Median</th>").appendTo(thead);
		$("<th>Quartile 75</th>").appendTo(thead);
		$("<th>Max</th>").appendTo(thead);
		$("<th>St Dev</th>").appendTo(thead);
		thead.appendTo(table);

		[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23].forEach(function(hour) {
			var tr = $("<tr>");
			var display = hour % 12;
			if (hour === 0) {
				display = "12";
			}
			display += ":00 ";
			if (hour >= 12) {
				display += "PM";
			} else {
				display += "AM";
			}

			var avg = Math.floor(pivotedByHour[hour].map(function(r) { return r.localBg; }).reduce(function(o,v){ return o+v; }, 0) / pivotedByHour[hour].length);
			var d = new Date(hour.hours());
			// d.setHours(hour);
			// d.setMinutes(0);
			// d.setSeconds(0);
			// d.setMilliseconds(0);

			var dev = ss.standard_deviation(pivotedByHour[hour].map(function(r) { return r.localBg; }));
			stats.push([
				new Date(d),
				ss.quantile(pivotedByHour[hour].map(function(r) { return r.localBg; }), 0.25),
				ss.quantile(pivotedByHour[hour].map(function(r) { return r.localBg; }), 0.75),
				avg - dev,
				avg + dev
				// Math.min.apply(Math, pivotedByHour[hour].map(function(r) { return r.localBg; })),
				// Math.max.apply(Math, pivotedByHour[hour].map(function(r) { return r.localBg; }))
			]);
			$("<td>" + display + "</td>").appendTo(tr);
			$("<td>" + pivotedByHour[hour].length + " (" + Math.floor(100 * pivotedByHour[hour].length / data.length) + "%)</td>").appendTo(tr);
			$("<td>" + avg + "</td>").appendTo(tr);
			$("<td>" + Math.min.apply(Math, pivotedByHour[hour].map(function(r) { return r.localBg; })) + "</td>").appendTo(tr);
			$("<td>" + ss.quantile(pivotedByHour[hour].map(function(r) { return r.localBg; }), 0.25) + "</td>").appendTo(tr);
			$("<td>" + ss.quantile(pivotedByHour[hour].map(function(r) { return r.localBg; }), 0.5) + "</td>").appendTo(tr);
			$("<td>" + ss.quantile(pivotedByHour[hour].map(function(r) { return r.localBg; }), 0.75) + "</td>").appendTo(tr);
			$("<td>" + Math.max.apply(Math, pivotedByHour[hour].map(function(r) { return r.localBg; })) + "</td>").appendTo(tr);
			$("<td>" + Math.floor(dev*10)/10 + "</td>").appendTo(tr);
			table.append(tr);
		});

		report.append(table);


		setTimeout(function() {
			// var data = $.plot.candlestick.createCandlestick({
			// 	label:"my Company",
			// 	data:stats,
			// 	candlestick:{
			// 		show:true,
			// 		lineWidth:"1"
			// 	}
			// });
			$.plot(
				"#overviewchart",
				[{
					data:stats,
					candle:true
				}],
				{
					series: {
						candle: true,
						lines: false		//Somehow it draws lines if you dont disable this. Should investigate and fix this ;)
					},
					xaxis: {
						mode: "time",
						timeFormat: "%h:00",
						min: 0,
						max: (24).hours()-(1).seconds()
					},
					yaxis: {
						min: 0,
						max: convertBg(400),
						show: true
					},
					grid: {
						show: true
					}
				}
			);
		},100);

		$(".print").click(function(e) {
			e.preventDefault();
			window.print();
		});
	});
});