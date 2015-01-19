define(function() {
	var issaving = false;
	var listeners = {};
	var fire = function(key, old) {
		if (key in listeners)
		listeners[key].forEach(function(fn) {
			fn(config[key], old);
		});
	};

	var isWindows = !!~window.navigator.appVersion.indexOf("Win");

	var config = {
		unit: "mgdl",
		targetrange: {
			low: 70,
			high: 180
		},
		notifications: "important",
		trenddisplaytime: 12
	};

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if (issaving) return;

		if ("config" in changes) {
			for (var property in changes[config].newValue) {
				config.set(property, changes[config].newValue);
			}
		}
	});
	
	return {
		defined: function() {
		},
		load: function(name, require, loaded) {
			chrome.storage.local.get("config", function(local) {
				for (var prop in (local.config || {})) {
					if (prop == "on" || prop == "set") {
						// special case
					} else {
						config[prop] = local.config[prop];
					}
				}
				config.on = function(key, fn) {
					if (key == "loaded" && config.loaded) {
						fn(true,true);
					} else {
						listeners[key] = listeners[key] || [];
						listeners[key].push(fn);
					}
				};
				config.set = function(key, val) {
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
						issaving = true;
						chrome.storage.local.set({
							config: (function(state) {
								// rip "set" and "on" out of config object before saving it
								var out = {};
								for (var key in state) {
									if (["baseUrl", "bundles", "config", "on", "paths", "pkgs", "set", "shim", "waitSeconds"].indexOf(key) == -1) {
										out[key] = state[key];
									}
								}
								return out;
							})(config)
						}, function(local) {
							console.log("[config.js set] saved config");
							setTimeout(function() {
								issaving = false;
							}, 100);
						})
					}
				};
		
				loaded(config);
			});
		}
	};
});