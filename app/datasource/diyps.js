define(function() {
	console.debug("[diyps] Loading config");
	var config = $.getJSON("/diypsconfig.json", function(d) {
		console.debug("[diyps] loaded config");
	});

	var formatData = function(data) {
		return JSON.stringify(data.map(function(plot) {
			return [
				+plot.displayTime,
				plot.bgValue,
				plot.trend
			];
		}));
	};

	var diyps = { };
	diyps.replace = function(data) { config.then(function(diypsconfig) {
		if (!("endPoint" in diypsconfig || diypsconfig.endPoint.length > 0)) return;

		console.debug("[saveToDiyPS] firing off");
		$.post(diypsconfig.endPoint, {
			records: formatData(data)
		});
	}); };

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			diyps.replace(changes.egvrecords.newValue);
		}
	});

	return diyps;
});