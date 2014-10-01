define(["../bloodsugar"], function(convertBg) {
	var current_direction;

	var newReading = function(cur_record, last_record) {
		var now_trend = cur_record.trend;
		var now_bg = cur_record.bgValue, last_bg = last_record? now_bg: false;

		var intPriorities = {
			"Flat": 0,
			"FortyFiveDown": -1,
			"SingleDown": -2,
			"DoubleDown": -3,
			"FortyFiveUp": 1,
			"SingleUp": 2,
			"DoubleUp": 3
		};

		var at = (function(d) {return function() {
			var h = d.getHours() % 12, m = d.getMinutes();
			if (m < 10) m = "0" + m.toString();
			
			if (h == 0) h = "12";
			var ampm = d.getHours() >= 12? "pm": "am";
			return " at " + h + ":" + m + ampm;
		}; })(new Date());
		
		// falling too fast no other considerations
		if (now_trend == "DoubleDown" && now_bg < 150) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending double down. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		// falling fast but slowing
		else if (now_trend == "SingleDown" && now_trend == "DoubleDown") {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Your fall has slowed. You were double down but are now single down. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 1,
			}, function(notification_id) {
			});
		// falling too fast considering current bg
		} else if (now_trend == "SingleDown" && now_bg < 130 && (last_bg? last_bg >= 130: true)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending single down. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		// falling but slowing
		else if (now_trend == "FortyFiveDown" && (["SingleDown", "DoubleDown"].indexOf(now_trend) > -1)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Your fall has slowed. You were " + now_trend + " but are now forty five down down. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 1,
			}, function(notification_id) {
			});
		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveDown" && now_bg < 110 && (last_bg? last_bg >= 110: true)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending forty five down. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		// raising too fast
		else if (now_trend == "DoubleUp" && now_bg > 110 && ( last_bg? last_bg <= 110: true)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending double up. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		// rising fast but slowing
		else if (now_trend == "SingleUp" && now_trend == "DoubleUp") {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Your rise has slowed. You were double up but are now single up. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 1,
			}, function(notification_id) {
			});
		// rising too fast considering current bg
		} else if (now_trend == "SingleUp" && now_bg > 130 && (last_bg? last_bg <= 130: true)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending single up. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		// rising but slowing
		else if (now_trend == "FortyFiveUp" && (["SingleUp", "DoubleUp"].indexOf(now_trend) > -1)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Your rise has slowed. You were " + now_trend + " but are now forty five up up. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 1,
			}, function(notification_id) {
			});
		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveUp" && now_bg > 150 && (last_bg? last_bg <= 150: true)) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "You're trending forty five up. #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 2,
			}, function(notification_id) {
			});
		}

		else if (current_direction && current_direction != now_trend) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Trend direction changed to " + now_trend + ". You're #cgmnow " + convertBg(now_bg) + at(),
				iconUrl: "/public/assets/icon.png",
				priority: 1,
			}, function(notification_id) {
			});
		}

		current_direction = now_trend;
	};
					
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		if ("egvrecords" in changes)  {
			var cur_record = changes.egvrecords.newValue[changes.egvrecords.newValue.length - 1],
			last_record = null;
			if (changes.egvrecords.newValue.length > 1) {
				last_record = changes.egvrecords.newValue[changes.egvrecords.newValue.length - 2];
			}
			newReading(cur_record, last_record);
		}
	});
});