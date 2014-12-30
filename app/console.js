define([], function() {
	var myLog = [], consoleFunctions = {};
	var flattenSimple = function(d) {
		var recursions = 0;
		var pad = function(times) {
			var s = "";
			for (var i = times; i > 0; i--) {
				s += "   ";
			}
			return s;
		}
		var toString = function(val) {
			var out = "";
			if (++recursions > 5) return "/* MAX DESCENTS REACHED */";

			if (typeof val == "string") { // string
				out = val;
			} else if (typeof val == "number") { // number
				out = val.toString();
			} else if (typeof val == "object" && val.length) { // array
				out = "[\n" + Array.prototype.map.call(val, toString).join(",\n") + "\n]\n";
			} else if (typeof val == "object") { // object
				if (val.toString == Object.toString) // JS Object
					out = val.toString();
				else // Native Object
					out = "{\n" + Object.keys(val).filter(function(k) {
						return k != "apikey" && (typeof val[k] != "function");
					}).map(function(k) {
						return pad(recursions) + k + ": " + toString(val[k]);
					}).join(",\n") + "\n" +  pad(recursions - 1) + "}";
			} else if (typeof val == "boolean") { // boolean
				out = val.toString();
			} else { // null or undefined
				out = "";
			}
			--recursions;
			return pad(recursions) + out;
		}
		var result = d.map(toString);
		if (typeof d[0] == "string") {
			var template = result.shift();
			template = template.replace(/%\w/g, function(match) {
				return result.shift();
			});
			return template + " " + result.join(" ");
		} else {
			return result.join(" ");
		}
	};
	var console = "console" in window? window.console: {};
	["log", "warn", "info", "error", "debug"].forEach(function(fn) { consoleFunctions[fn] = console[fn] || function() { }; });
	["log", "warn", "info", "error", "debug"].forEach(function(fn) {
		console[fn] = function() {
			var stack = {};
			try {
				throw new Error();
			} catch (e) {
				stack = e.stack;
			}
			stack = stack
				.split("\n") // big string
				.slice(3) // throw away intro and this fn's invocation
				.map(function(line) {
					return line.trim();
				})
				.filter(function(line) {
					return line.indexOf("jquery") == -1;
				}).map(function(line) {
					var parts = line.split(":");
					return {
						file: parts[1]
							.split("/")
							.slice(3) // throw away chrome-extension part
							.join("/"),
						line: parseInt(parts[2],10)
					};
				});
			var args = Array.prototype.slice.call(arguments);
			myLog.push(fn.toUpperCase() + ": " + stack[0].file + ":" + stack[0].line + ": " + flattenSimple(args));
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
	return console;
});