define(function() {
	function makeItMgDl() {
		convertBg = function displayAsMgDl(bg) {
			return bg;
		};
	}

	function makeItMmol() {
		convertBg = function displayAsMmol(bg) {
			// http://twitter.com/david_jansson/status/517430131846291456
			return (Math.round((bg / 18) * 10) / 10).toFixed(1);
		};
	}
	var convertBg;
	makeItMgDl();

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("config" in changes) {
			if (changes.config.newValue.unit == "mmol") {
				makeItMmol();
			} else {
				makeItMgDl();
			}
		}
	});
	chrome.storage.local.get("config", function(local) {
		if (local.config.unit == "mmol") makeItMmol();
		else makeItMgDl();
	});

	return function(mgdl) {
		return convertBg(mgdl);
	};
})