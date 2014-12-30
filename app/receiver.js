require(["/app/config.js!"], function(config) {
	function putTheChartOnThePage(remotecgmuri) {
		$("#receiverui").html("");
		if (typeof remotecgmuri == "string" && remotecgmuri.length > 0) {
			if (remotecgmuri.indexOf("://") == -1) {
				remotecgmuri = "http://" + remotecgmuri;
			}
			// load remote
			console.log("[app.js putTheChartOnThePage] Using remote CGM monitor");
			$("#receiverui").append($("<div class='row'/>").append($("<webview class='container col-xs-12'/>").attr({
				src: remotecgmuri
			})));
		} else {
			// load hosted
			console.log("[app.js putTheChartOnThePage] Using built-in chart");
			$("#receiverui").load('receiver.html', launchReceiverUI);
		}
	}

	config.on("remotecgmuri", putTheChartOnThePage);

	$(function() {
		putTheChartOnThePage(config.remotecgmuri);
	});
});

function launchReceiverUI() {

require(["bloodsugar", "/app/config.js!", "store/egv_records"], function(convertBg, config, egvrecords) {
	var jqShow = $.fn.show;
	$.fn.show = function(domid) {
		var o = jqShow.apply(this, [domid]);
		if (this.selector === "#receiverui") {
			window.requestAnimationFrame(firstLoad);
		}
		return o;
	}

	var currData = null;
	$("#dexcomtrend").bind("plothover", function (event, pos, item) {
		if (item != null) {
			if ((currData == null) || currData[0] != item.datapoint[0] || currData[1] != item.datapoint[1]) {
				currData = item.datapoint;
				$("#hover").remove();
				var date = new Date(item.datapoint[0]);
				hover(item.pageX, item.pageY, '' + date.format("D n/j H:i") + '- ' + item.datapoint[1]);
			}
		} else {
			$("#hover").remove();
			currData = null;
		}
	});

	function hover(x, y, contents) {
		//Adrian: Had to use workaround with container as maximum opacity is inherited from parent.
		//Make text opaque and background transparent.
		var hovercontainer = jQuery('<div id="hover"></div>').css({
			position: 'absolute',
			top: y + 8,
			left: x + 8
		});

		var hovertext = jQuery('<div id="hovertext">' + contents + '</div>').css( {
			position: 'relative',
			top: 0,
			left: 0,
	 		width: '100%',
			height: '100%',
			padding: '2px',
			'text-align': 'center',
			'font-size': '120%',
			'z-index': 2,
			opacity: 1
		});

		var hoverbg = jQuery('<div id="hoverbg"></div>').css( {
			'background-color': '#fff',
			position: 'absolute',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			border: '2px outset #fff',
			'z-index': 1,
			opacity: .75
		});
		hovercontainer.append(hovertext);
		hovercontainer.append(hoverbg);
		hovercontainer.appendTo("body").fadeIn(200);
	}

	function drawReceiverChart(data) {
		var low = config.targetrange.low, high = config.targetrange.high, time = config.trenddisplaytime;
		var t = time;
		var now = (new Date()).getTime();
		var trend = data.map(function(plot) {
			return [
				+plot.displayTime,
				parseFloat(convertBg(plot.bgValue))
			];
		}).filter(function(plot) {
			return plot[0] + t.hours() > now;
		});

		high = parseFloat(convertBg(high));
		low = parseFloat(convertBg(low));

		var trendIn = trend.filter(function(plot){
			return plot[1]<=high && plot[1]>=low;
		});
		var trendHigh = trend.filter(function(plot){
			return plot[1]>high;
		});
		var trendLow = trend.filter(function(plot){
			return plot[1]<low;
		
		});

		var ticksz = [1, "hour"];
		var timeformat = "%H:%M"
		if (t<3){
			ticksz = [15, "minute"];
		}
		if (t>24){
			ticksz = [1, "day"];
			timeformat = "%m/%d"
		}

		$.plot(
			"#dexcomtrend",
			[
				{
					data: trendIn,
					color: "#00FF00",
					points: {
						show: true
					},
					lines: {
						show: false
					}
				},
				{
					data: trendHigh,
					color: "#FFFF00",
					points: {
						show: true,
						fill: true,
						fillColor: "#FFDD00"
					},
					lines: {
						show: false
					}
				},
				{
					data: trendLow,
					color: "#FF0000",
					points: {
						show: true
					},
					lines: {
						show: false
					}
				}
			],
			{
				xaxis: {
					mode: "time",
					timezone: "browser",
					timeformat: timeformat,
					minTickSize: ticksz,
					tickColor: "#555",
				}, 
				yaxis: {
					min: 0,
					max: convertBg(400),
					tickColor: "#555",
				},
				grid: {
					markings: [
							{
								color: '#FF0000',
								lineWidth: 2,
								yaxis: {
									from: low,
									to: low
								}
							},
						{
							color: '#FFFF00',
							lineWidth: 2,
							yaxis: {
								from: high,
								to: high
							}
						}
					],
					hoverable: true
				}
			}
		);
		if (data.length) {
			$("#cgmnow").text(convertBg(data[data.length - 1].bgValue));
			$("#cgmdirection").text(data[data.length - 1].trend);
			$("#cgmtime").text((new Date(data[data.length - 1].displayTime)).format("h:ia"));
		}
	}

	// updated database
	egvrecords.onChange(function(new_r, all) {
		drawReceiverChart(all);
	});
	config.on("trenddisplaytime", function() {
		drawReceiverChart(egvrecords);
	});

	$(function() {
		//Adrian: Timeframe(ZOOM)-handlers:
		$("[data-hours]").click(function() {
			config.set("trenddisplaytime", $(this).attr("data-hours"));
		})
	});

	// first load, before receiver's returned data
	var firstLoad = function() { // called in overriden $.fn.show above
		drawReceiverChart(egvrecords);
	};

	$(".dropdown-toggle").dropdown();
});

}