chrome.app.runtime.onLaunched.addListener(function() {
	// UI Code here
	var app = chrome.app.window.create('window.html', {
		id: "dexcomcharting",
		bounds: {
			width: 600,
			height: 300
		}
	});
});