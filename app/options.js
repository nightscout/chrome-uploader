require(["./datasource/dexcom", "./datasource/remotecgm", "./datasource/mongolab", "waiting"], function(dexcom, remotecgm, mongolab, alerts, waiting) {

new Promise(function(done) {
	chrome.storage.local.get("config", function(config) {
		config.config.serialport = config.config.serialport || "/dev/tty.usbmodem";
		config.config.unit = config.config.unit || "mgdl";
		done(config.config);
	});
}).then(function(config) {
	console.log(config);
	function getValue(param, options) {
		var parts = param.split(".");
		var key = parts.shift();
		if (parts.length > 0) {
			return getValue(parts.join("."), options[key]);
		} else {
			return (typeof options == "object" && key in options)? options[key]: "";
		}
	}
	$("#optionsui input,#optionsui select").map(function(ix) {
		$(this).val(getValue(this.name, config));
	});
});
chrome.serial.getDevices(function(ports) {
	var isWindows = !!~window.navigator.appVersion.indexOf("Win");
	document.getElementById("serialportlist").innerHTML += (isWindows? "<li>Default is <code>COM3</code>. Other's available when NightScout.info CGM Utility started include</li>": "<li>Default is <code>/dev/tty.usbmodem</code>. Others available when NightScout.info CGM Utility started include</li>") + ports.map(function(sp) {
		if (!isWindows || sp.path != "COM3") return "<li><code>" + sp.path + "</code></li>"; else return "";
	}).join("");
	$("#serialportlist code").click(function(event) {
		$("input[name=serialport]").val(this.textContent);
	});
});

$("#optionsui").on("click", "#savesettings", function(){
	chrome.storage.local.set({
		config: $("#optionsui input, #optionsui select").toArray().reduce(function(out, field) {
			var parts = field.name.split(".");
			var key = parts.shift();
			var working = out;
			while (parts.length > 0) {
				if (!(key in working)) {
					working[key] = {};
				}
				working = working[key];
				key = parts.shift();
			}
			working[key] = field.value;
			return out;
		}, {})
	}, function() {
		window.close();
	});
});
$("#optionsui").on("click", "#resetchanged", function(){
	// $("#optionsui").hide();
	// $("#receiverui").show();
	window.close();
});

$(document).on("click", "#testconnection", function(){
	var config = $("#optionsdatabase input").toArray().reduce(function(out, field) {
		out[field.name] = field.value;
		return out;
	}, {});
	var worker = function() { };
	var applyChoice = function(notification_id, button) {
		worker.apply(this,arguments);
	};
	chrome.notifications.onButtonClicked.removeListener(applyChoice);
	mongolab.testConnection(config["mongolab.apikey"], config["mongolab.database"], config["mongolab.collection"]).then(function ok() {
		console.log("[mongolab] connection check ok");
		chrome.notifications.create("", {
			type: "basic",
			title: "NightScout.info CGM Utility",
			message: "This mongolab configuration checks out ok",
			iconUrl: "/public/assets/icon.png"
		}, function(chrome_notification_id) { });
	}, function fail(error) {
		console.log("[mongolab] " + error.error, error.avlb);
		if (error.type == "database") {
			chrome.notifications.create("", {
				type: (error.avlb.length > 0? "list": "basic"),
				title:  error.error + ": " + error.selected,
				message: "The " + error.type + " was not correct",
				iconUrl: "/public/assets/icon.png",
				buttons: (error.avlb.length > 0 && error.avlb.length <= 2)? error.avlb.map(function(choice) {
					return { title: "Use " + choice };
				}) : undefined,
				items: error.avlb.map(function(option) {
					return {
						title: option,
						message: error.type
					};
				})
			}, function(chrome_notification_id) {
				worker = function(notification_id, button) {
					if (notification_id == chrome_notification_id) {
						var selection = error.avlb[button];
						var fields = {
							database: "#options-database-name",
							collection: "#options-database-collection",
							apikey: "#options-database-apiuser"
						};
						$(fields[error.type]).val(selection);
					}
					chrome.notifications.onButtonClicked.removeListener(applyChoice);
				};
				chrome.notifications.onButtonClicked.addListener(applyChoice);
			});
		} else if (error.type == "collection") {
			if (error.avlb.length > 0) {
				chrome.notifications.create("", {
					type: "list",
					iconUrl: "/public/assets/icon.png",
					title: "Collection not found",
					message: "",
					buttons: [{
						title: "Keep " + error.selected + " (creates new collection)"
					}].concat(error.avlb.map(function(choice) {
						return { title: "Use " + choice };
					})).slice(0,2),
					items: error.avlb.map(function(option) {
						return {
							title: option,
							message: error.type
						};
					})
				}, function(chrome_notification_id) {
					worker = function(notification_id, button) {
						if (notification_id == chrome_notification_id && button > 0) {
							var selection = error.avlb[button - 1] || error.selected;
							var fields = {
								database: "#options-database-name",
								collection: "#options-database-collection",
								apikey: "#options-database-apiuser"
							};
							$(fields[error.type]).val(selection);
						}
						chrome.notifications.onButtonClicked.removeListener(applyChoice);
					};
					chrome.notifications.onButtonClicked.addListener(applyChoice);
				});
			} else {
				console.log("collection name not found but it will be automatically made");
			}
		} else {
			chrome.notifications.create("", {
				type: error.avlb.length > 0? "list": "basic",
				title:  error.error + ": " + error.selected,
				message: "The " + error.type + " was not correct",
				iconUrl: "/public/assets/icon.png",
				buttons: (error.avlb.length > 0 && error.avlb.length <= 2)? error.avlb.map(function(choice) {
					return { title: "Use " + choice };
				}) : undefined,
				items: error.avlb.map(function(option) {
					return {
						title: option,
						message: error.type
					};
				})
			}, function(chrome_notification_id) {
				worker = function(notification_id, button) {
					if (notification_id == chrome_notification_id) {
						var selection = error.avlb[button];
						var fields = {
							database: "#options-database-name",
							collection: "#options-database-collection",
							apikey: "#options-database-apiuser"
						};
						$(fields[error.type]).val(selection);
					}
					chrome.notifications.onButtonClicked.removeListener(applyChoice);
				};
				chrome.notifications.onButtonClicked.addListener(applyChoice);
			});
		}
	});
});

});
