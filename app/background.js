var app;
var isOpen = false;

chrome.app.runtime.onLaunched.addListener(function() {
	// UI Code here
	chrome.app.window.create('app/window.html', {
		id: "dexcomcharting",
		bounds: {
			width: 800,
			height: 400
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
						width: 800,
						height: 400
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

setInterval(monitorForConnection, 1000);