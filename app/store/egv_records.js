define(function() {
	var table = []; // representation of chrome.storage.local.get("egvrecords")
	var listeners = [];
	var readyToWrite = false;

	var callback = function(newRecords) {
		listeners.forEach(function(fn) {
			try {
				fn(newRecords, table);
			} catch (e) {
				console.log(e);
			}
		});
	};

	var write = function(new_r, all) {
		if (!readyToWrite) return;
		
		chrome.storage.local.set({
			egvrecords: table.slice()
		}, function(local) {
			console.debug("[egv_records.js write] Wrote %i new records to local storage.", new_r.length)
		})
	};

	chrome.storage.local.get("egvrecords", function(local) {
		// replace table with egvrecords from localstorage without loosing methods that've been tacked on here
		var localRecords = [(local.egvrecords || []).slice()];
		while (localRecords[0].length > 0xfff0) {
			localRecords.push(localRecords[0].splice(0, 0xfff0))
		}

		localRecords.forEach(function(page) {
			Array.prototype.splice.apply(table, [table.length, 0].concat(page));
		});

		table.sort(function(a,b) {
			return a.displayTime - b.displayTime;
		});

		callback([]); // run callback with no new records
		readyToWrite = true;
	});

	table.add = function(record) {
		table.push(record);
		callback([record]);
	};

	table.addAll = function(records) {
		var localRecords = [records.slice()];
		while (localRecords[0].length > 0xfff0) {
			localRecords.push(localRecords[0].splice(0, 0xfff0))
		}

		localRecords.forEach(function(page) {
			Array.prototype.splice.apply(table, [table.length, 0].concat(page));
		})
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