function drawReceiverChart(data) {
	var t = 3; //parseInt($("#timewindow").val(),10);
	var now = (new Date()).getTime();
	var trend = data.map(function(plot) {
		return [
			+plot.displayTime,
			plot.bgValue
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
	$("#cgmnow").text(data[data.length - 1].bgValue);
	$("#cgmdirection").text(data[data.length - 1].trend);
	$("#cgmtime").text((new Date(data[data.length - 1].displayTime)).format("h:ia"));
}

// updated database
chrome.storage.onChanged.addListener(function(changes, namespace) {
	if ("egvrecords" in changes)  {
		drawReceiverChart(changes.egvrecords.newValue);
	}
});

// first load, before receiver's returned data
chrome.storage.local.get("egvrecords", function(values) {
	drawReceiverChart(values.egvrecords);
});