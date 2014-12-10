var app;
var isOpen = false;

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