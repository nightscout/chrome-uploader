define(function() {
	var table = []; // representation of chrome.storage.local.get("egvrecords")
	var listeners = [];

	var callback = function(newRecords) {
		listeners.forEach(function(fn) {
			fn(newRecords, table);
		});
	};

	var write = function(new_r, all) {
		chrome.storage.local.set({
			egvrecords: table.slice()
		}, function(local) {
			console.debug("[egv_records.js write] Wrote %i new records to local storage.", new_r.length)
		})
	};

	chrome.storage.local.get("egvrecords", function(local) {
		// replace table with egvrecords from localstorage without loosing methods that've been tacked on here
		Array.prototype.splice.apply(table, [0, table.length].concat(local.egvrecords || []))

		callback([]); // run callback with no new records
	});

	table.add = function(record) {
		table.push(record);
		callback([record]);
	};

	table.addAll = function(records) {
		table.splice(table.length,0);
		Array.prototype.splice.apply(table, [table.length, 0].concat(records));
		table.sort(function(a,b) {
			return a.displayTime - b.displayTime;
		});
		records.sort(function(a,b) {
			return a.displayTime - b.displayTime;
		});
		callback(records);
	};

	table.removeAll = function() {
		table.splice(0, table.length);
		callback([]);
	};

	table.onChange = function(callback) {
		listeners.push(callback);
	};

	table.onChange(write); // every time it changes re-save

	return table;
});