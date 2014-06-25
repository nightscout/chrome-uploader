chrome.app.runtime.onLaunched.addListener(function() {
	// UI Code here
	var app = chrome.app.window.create('app/window.html', {
		id: "dexcomcharting",
		bounds: {
			width: 800,
			height: 350
		}
	});
});
