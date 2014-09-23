(function(console) {
	var myLog = [], consoleFunctions = {};
	var flattenSimple = function(d) {
		var recursions = 0;
		var toString = function(val) {
			if (++recursions > 5) return "/* MAX DESCENTS REACHED */";

			if (typeof val == "string") { // string
				return val;
			} else if (typeof val == "number") { // number
				return val.toString();
			} else if (typeof val == "object" && val.length) { // array
				return "[" + Array.prototype.map.call(val, toString).join(",") + "]";
			} else if (typeof val == "object") { // object
				if (val.toString == Object.toString) // JS Object
					return val.toString();
				else // Native Object
					return "{" + Object.keys(val).map(function(k) {
						return k + ": " + val[k];
					}).join(",") + "}";
			} else if (typeof val == "boolean") { // boolean
				return val.toString();
			} else { // null or undefined
				return "";
			}
		}
		var result = d.map(toString);
		if (typeof d[0] == "string") {
			var template = d.shift();
			template = template.replace(/%\w/g, function(match) {
				return d.shift();
			});
			return template + " " + d.join(" ");
		} else {
			return result.join(" ");
		}
	};
	["log", "warn", "info", "error", "debug"].forEach(function(fn) { consoleFunctions[fn] = console[fn]; });
	["log", "warn", "info", "error", "debug"].forEach(function(fn) {
		console[fn] = function() {
			var args = Array.prototype.slice.call(arguments);
			myLog.push(fn.toUpperCase() + ": " + flattenSimple(args));
			consoleFunctions[fn].apply(console, arguments);
		}
	});

	console.info = function(info) {
		var args = Array.prototype.slice.call(arguments);
		myLog.push("INFO: REDACTED");
		consoleFunctions["info"].apply(console, arguments);
	};
	console.fixMyStuff = function() {
		return myLog.join("\n");
	};
})(console);