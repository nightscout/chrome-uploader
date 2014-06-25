Promise.all([
new Promise(function(ready) {
	chrome.storage.local.get("egvrecords", function(values) {
		ready(values.egvrecords);
	});
})
]).then(function(o) {
	var data = o[0];
});