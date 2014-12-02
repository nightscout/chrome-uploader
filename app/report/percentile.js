function generate_report(data, high, low) {
	require(["../bloodsugar"], function(convertBg) {
		var Statician = ss;
		var config = {
			low: convertBg(low),
			high: convertBg(high)
		};
		var window = 30; //minute-window should be a divisor of 60 
		var bins = [];
		for (hour = 0; hour < 24; hour++) {
			for (minute = 0; minute < 60; minute = minute + window) {
				var date = new Date();
				date.setHours(hour);
				date.setMinutes(minute);
				var readings = data.filter(function(record) {
					return "bgValue" in record && /\d+/.test(record.bgValue.toString());
				}).filter(function(record) {
					var recdate = new Date(record.displayTime);
					return recdate.getHours() == hour && recdate.getMinutes() >= minute &&
						recdate.getMinutes() < minute + window;;
				});
				readings = readings.map(function(record) {
					return record.localBg;
				});
				bins.push([date, readings]);
				//console.log(date +  " - " + readings.length);
				//readings.forEach(function(x){console.log(x)});
			}
		}
		dat10 = bins.map(function(bin) {
			return [bin[0], ss.quantile(bin[1], 0.1)];
		});
		dat25 = bins.map(function(bin) {
			return [bin[0], ss.quantile(bin[1], 0.25)];
		});
		dat50 = bins.map(function(bin) {
			return [bin[0], ss.quantile(bin[1], 0.5)];
		});
		dat75 = bins.map(function(bin) {
			return [bin[0], ss.quantile(bin[1], 0.75)];
		});
		dat90 = bins.map(function(bin) {
			return [bin[0], ss.quantile(bin[1], 0.9)];
		});
		high = parseFloat(convertBg(high));
		low = parseFloat(convertBg(low));
		//dat50.forEach(function(x){console.log(x[0] + " - " + x[1])});
		$.plot(
			"#percentilechart", [{
				label: "median",
				data: dat50,
				id: 'c50',
				color: "#000000",
				points: {
					show: false
				},
				lines: {
					show: true,
					//fill: true
				}
			}, {
				label: "25%/75% percentile",
				data: dat25,
				id: 'c25',
				color: "#000055",
				points: {
					show: false
				},
				lines: {
					show: true,
					fill: true
				},
				fillBetween: 'c50'
			}, {
				data: dat75,
				id: 'c75',
				color: "#000055",
				points: {
					show: false
				},
				lines: {
					show: true,
					fill: true
				},
				fillBetween: 'c50'
			}, {
				label: "10%/90% percentile",
				data: dat10,
				id: 'c10',
				color: "#a0a0FF",
				points: {
					show: false
				},
				lines: {
					show: true,
					fill: true
				},
				fillBetween: 'c25'
			}, {
				data: dat90,
				id: 'c90',
				color: "#a0a0FF",
				points: {
					show: false
				},
				lines: {
					show: true,
					fill: true
				},
				fillBetween: 'c75'
			}, {
				label: "high",
				data: [],
				color: '#FFFF00',
			}, {
				label: "low",
				data: [],
				color: '#FF0000',
			}], {
				xaxis: {
					mode: "time",
					timezone: "browser",
					timeformat: "%H:%M",
					tickColor: "#555",
				},
				yaxis: {
					min: 0,
					max: convertBg(400),
					tickColor: "#555",
				},
				grid: {
					markings: [{
						color: '#FF0000',
						lineWidth: 2,
						yaxis: {
							from: low,
							to: low
						}
					}, {
						color: '#FFFF00',
						lineWidth: 2,
						yaxis: {
							from: high,
							to: high
						}
					}],
					//hoverable: true
				}
			}
		);
	});
};
