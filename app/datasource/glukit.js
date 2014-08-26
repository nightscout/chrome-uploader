define(function() {
	var last = false;
	var makeUTC = function(now) {
		return (new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds())).getTime();
	};
	var tz = (new Date()).toString().split(" ").filter(function(part) { return part.indexOf("GMT") === 0; })[0].substr(3);

	return {
		post: function (data) {
			var cur_record = changes.egvrecords.newValue[changes.egvrecords.newValue.length - 1];
			if (last == cur_record.date) return;

			return $.post({
				url: "https://glukit.appspot.com/v1/glucosereads",
				data: data.map(function(record) {
					return {
						value: record.bgValue,
						time: {
							timezone: tz,
							timestamp: makeUTC(record.date)
						},
						unit: "mgPerDL"
					};
				})
			});
		}
	};
});