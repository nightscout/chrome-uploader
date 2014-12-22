var log = console.log, debug = console.debug, info = console.info;

define(function() {
	var listeners = {};
	var out = {};
	out.on = function(event, cb) {
		if (!(event in listeners)) {
			listeners[event] = [];
		}
		listeners[event].push(cb);
	}
	out.fire = function(event, details) {
		(listeners[event] || []).forEach(function(cb) {
			cb.call({}, details);
		})
	}
	console.log = function() {
		out.fire("output", arguments);
		log.apply(console, arguments);
	}

	console.debug = function() {
		out.fire("output", arguments);
		debug.apply(console, arguments);
	}

	console.info = function() {
		out.fire("input", arguments);
		info.apply(console, arguments);
	}

	return out;
});