(function(console, log, warn, info, error, debug) {
	var myLog = [];
	var flattenSimple = function(d) {
		var toString = function(val) {
			if (typeof val == "string") { // string
				return val;
			} else if (typeof val == "number") { // number
				return val.toString();
			} else if (typeof val == "object" && val.length) { // array
				return "[" + Array.prototype.map.call(val, toString).join(",") + "]";
			} else if (typeof val == "object") { // object
				if (val.toString == Object.toString) {
					return val.toString();
				} else {
					return "{" + Object.keys(val).map(function(k) {
						return k + ": " + val[k];
					}).join(",") + "}";
				}
			} else if (typeof val == "boolean") { // boolean
				return val.toString();
			} else { // null or undefined
				return "";
			}
		}
		return d.map(toString).join(" ");
	};

	console.log = function() {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("LOG: " + flattenSimple(args));
		log.apply(console, arguments);
	};
	console.warn = function() {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("WARN: " + flattenSimple(args));
		warn.apply(console, arguments);
	};
	console.info = function() {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("INFO: PERSONAL INFORMATION REMOVED");
		info.apply(console, arguments);
	};
	console.error = function() {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("ERROR: " + flattenSimple(args));
		error.apply(console, arguments);	
	};
	console.debug = function() {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("DEBUG: " + flattenSimple(args));
		debug.apply(console, arguments);	
	};
	console.fixMyStuff = function() {
		return myLog.join("\n");
	};
})(console, console.log, console.warn, console.info, console.error, console.debug);