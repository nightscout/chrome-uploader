define(function() {
	var config = new Promise(function(loaded) {
		console.debug("[diyps] Loading config");
		$.ajax({
			url: "/diypsconfig.json", 
			success: function(d) {
				console.debug("[diyps] loaded config");
				loaded(JSON.parse(d));
			}
		});
	});
	var diyps = {
		replace: function(data) {
			config.then(function(diypsconfig) {
				if (!("endPoint" in diypsconfig || diypsconfig.endPoint.length > 0)) return;

				console.debug("[saveToDiyPS] firing off");
				$.post(diypsconfig.endPoint, {
					records: JSON.stringify(data.map(function(plot) {
						return [
							+plot.displayTime,
							plot.bgValue,
							plot.trend
						];
					}))
				});
			});
		}
	};
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			diyps.replace(changes.egvrecords.newValue);
		}
	});
	return diyps;
});