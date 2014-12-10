define(function() {
	var listeners = {};
	var fire = function(key, old) {
		listeners[key].forEach(function(fn) {
			fn(config[key], old);
		});
	};

	var isWindows = !!~window.navigator.appVersion.indexOf("Win");

	var config = {
		on: function(key, fn) {
			listeners[key] = listeners[key] || [];
			listeners[key].push(fn);
		},

		set: function(key, val) {
			var working = config;
			var old;
			while (key.indexOf(".") > -1) {
				working = working[key.substr(0, key.indexOf("."))];
				key = key.substr(key.indexOf(".") + 1);
			}
			var old = working[key];
			if (val != old) {
				working[key] = val;
				fire(key, old);
				chrome.storage.local.set({
					config: (function(state) {
						// rip "set" and "on" out of config object before saving it
						var out = {};
						for (var key in state) {
							if (key == "set") {
							} else if (key == "on") {
							} else {
								out[key] = state[key];
							}
						}
						return out;
					})(config)
				}, function(local) {
						console.log("[config.js set] saved config");
				})
			}
		},

		unit: "mgdl",
		serialport: (isWindows? "COM3": "/dev/tty.usbmodem") ,
		targetrange: {
			low: 70,
			high: 180
		},
		notifications: "important",
		trenddisplaytime: 12
	};
	
	// default config object
	chrome.storage.local.get("config", function(local) {
		for (var prop in local.config) {
			if (prop == "on" || prop == "set") {
			} else {
				config[prop] = local.config[prop];
			}
		}
	});

	return config;
});