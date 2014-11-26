var app;
var isOpen = false;

chrome.storage.local.get(null, function(local) {
	var ok = "config" in local && "egvrecords" in local && "acknowledgements" in local;
	if (ok) return;

	local.config = local.config || { }
	local.config.unit = local.config.unit || "mgdl";
	local.config.serialport = local.config.serialport || "/dev/tty.usbmodem";
	local.config.targetrange = local.config.targetrange || {};
	local.config.targetrange.low = local.config.targetrange.low || 70;
	local.config.targetrange.high = local.config.targetrange.high || 180;
	local.config.notifications = local.config.notifications || "important";
	local.egvrecords = local.egvrecords || [];
	local.acknowledgements = local.acknowledgements || [];

	chrome.storage.local.set(local, function() {
		console.log("[background] Defaulted config");
	});
});

chrome.app.runtime.onLaunched.addListener(function() {
	// UI Code here
	chrome.app.window.create('app/window.html', {
		id: "dexcomcharting",
		bounds: {
			width: 1000,
			height: 525
		}
	}, function(window) {
		isOpen = true;
		app = window;
	});
});

function monitorForConnection () {
	var options = {};
	options.vendorId = 8867; // 0x22a3
	options.productId = 71; // 0x0047
	chrome.usb.getDevices(options, function(devices) {
		// found == devices.length > 0
		if (isOpen) {
			if (devices.length > 0) {
				// no op
			} else {
				// disconnected
				isOpen = false;
			}
		} else {
			if (devices.length > 0) {
				// plugged in
				isOpen = true;
				chrome.app.window.create('app/window.html', {
					id: "dexcomcharting",
					bounds: {
						width: 1000,
						height: 425
					}
				}, function(w) {
					app = w;
				});
			} else {
				// no op
			}
		}
	});
}

// This works too porly if you have multiple chrome profiles
// setInterval(monitorForConnection, 1000);
