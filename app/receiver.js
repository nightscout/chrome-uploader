var convertBg = function(n) { return n; };

var jqShow = $.fn.show;
$.fn.show = function(domid) {
	var o = jqShow.apply(this, [domid]);
	if (this.selector === "#receiverui") {
		window.requestAnimationFrame(firstLoad);
	}
	return o;
}

function drawReceiverChart(data) {
	var t = 3; //parseInt($("#timewindow").val(),10);
	var now = (new Date()).getTime();
	var trend = data.map(function(plot) {
		return [
			+plot.displayTime,
			convertBg(plot.bgValue)
		];
	}).filter(function(plot) {
		return plot[0] + t.hours() > now;
	});
	$.plot(
		"#dexcomtrend",
		[{
			data: trend
		}],
		{
			xaxis: {
				mode: "time",
				timezone: "browser",
				timeformat: "%I:%m",
				twelveHourClock: true,
				minTickSize: [45, "minute"]
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
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if ("egvrecords" in changes)  {
		drawReceiverChart(changes.egvrecords.newValue);
	}
	if ("config" in changes) {
		if (changes.config.newValue.unit == "mmol") {
			convertBg = function(n) {
				return Math.ceil(n * 0.5555) / 10;
			};
		} else {
			convertBg = function(n) {
				return n;
			};
		}
		chrome.storage.local.get("egvrecords", function(values) {
			drawReceiverChart(values.egvrecords);
		});
	}
});

// first load, before receiver's returned data
var firstLoad = function() {
	chrome.storage.local.get(["egvrecords", "config"], function(values) {
		if ("config" in values && values.config.unit == "mmol") {
			convertBg = function(n) {
				return Math.ceil(n * 0.5555) / 10;
			};
		} else {
			convertBg = function(n) {
				return n;
			};
		}
		drawReceiverChart(values.egvrecords);
	});
}

firstLoad();