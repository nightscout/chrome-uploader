define(["/app/config.js!"], function(config) {
	var convertBg;
	function makeItMgDl() {
		convertBg = function displayAsMgDl(bg) {
			return Math.floor(bg);
		};
	}

	function makeItMmol() {
		convertBg = function displayAsMmol(bg) {
			// http://twitter.com/david_jansson/status/517430131846291456
			return (Math.round((bg / 18) * 10) / 10).toFixed(1);
		};
	}
	var changeUnit = function(unit) {
		if (unit == "mmol") {
			makeItMmol();
		} else {
			makeItMgDl();
		}
	};

	config.on("unit", changeUnit);
	changeUnit(config.unit);

	return function(mgdl) {
		return convertBg(mgdl);
	};
})