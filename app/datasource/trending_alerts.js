define(["../bloodsugar"], function(convertBg) {
	var current_direction;
	var current_bg = 0;

	var newReading = function(cur_r, last_r) {

	var cur_record = cur_r;
	var last_record = last_r;

	Promise.all([
	new Promise(function(ready) {
	chrome.storage.local.get(["config"], function(values) {
		if ("config" in values && "notifications" in values.config) {
			ready(values.config.notifications || "important");
		} else {
			ready("important");
		}
		});
	})
	]).then(function(setting){

		var now_trend = cur_record.trend;
		var last_bg = last_record? last_record.bgValue: false;
		var now_bg = cur_record.bgValue;

		var at = (function(d) {return function() {
			var h = d.getHours() % 12, m = d.getMinutes();
			if (m < 10) m = "0" + m.toString();
			
			if (h == 0) h = "12";
			var ampm = d.getHours() >= 12? "pm": "am";
			return " at " + h + ":" + m + ampm;
		}; })(new Date());


		if (setting == "none"|| (now_bg==current_bg && current_direction == now_trend)) {
			//do nothing
		
		
		// falling too fast no other considerations
		} else if (now_trend == "DoubleDown" && now_bg < 150) {
			doNotify(2, "You're trending double down. #cgmnow " + convertBg(now_bg) + at());
		

		// falling fast but slowing
		} else if (now_trend == "SingleDown" && now_trend == "DoubleDown") {
			doNotify(1, "Your fall has slowed. You were double down but are now single down. #cgmnow " + convertBg(now_bg) + at());

		// falling too fast considering current bg
		} else if (now_trend == "SingleDown" && now_bg < 130 && (last_bg? last_bg >= 130: true)) {
			doNotify(2, "You're trending single down. #cgmnow " + convertBg(now_bg) + at());


		// falling but slowing
		} else if (now_trend == "FortyFiveDown" && (["SingleDown", "DoubleDown"].indexOf(now_trend) > -1)) {
			doNotify(1, "Your fall has slowed. You were " + now_trend + " but are now forty five down down. #cgmnow " + convertBg(now_bg) + at());

		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveDown" && now_bg < 110 && (last_bg? last_bg >= 110: true)) {
			doNotify(2, "You're trending forty five down. #cgmnow " + convertBg(now_bg) + at());

		

		// raising too fast
		} else if (now_trend == "DoubleUp" && now_bg > 110 && ( last_bg? last_bg <= 110: true)) {
			doNotify(2, "You're trending double up. #cgmnow " + convertBg(now_bg) + at());

		// rising fast but slowing
		} else if (now_trend == "SingleUp" && now_trend == "DoubleUp") {
			doNotify(1, "Your rise has slowed. You were double up but are now single up. #cgmnow " + convertBg(now_bg) + at());

		// rising too fast considering current bg
		} else if (now_trend == "SingleUp" && now_bg > 130 && (last_bg? last_bg <= 130: true)) {
			doNotify(2, "You're trending single up. #cgmnow " + convertBg(now_bg) + at());


		// rising but slowing
		} else if (now_trend == "FortyFiveUp" && (["SingleUp", "DoubleUp"].indexOf(now_trend) > -1)) {
			doNotify(1, "Your rise has slowed. You were " + now_trend + " but are now forty five up up. #cgmnow " + convertBg(now_bg) + at());

		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveUp" && now_bg > 150 && (last_bg? last_bg <= 150: true)) {
			doNotify(2, "You're trending forty five up. #cgmnow " + convertBg(now_bg) + at());

		

		} else if (current_direction && current_direction != now_trend) {
			doNotify(1, "Trend direction changed to " + now_trend + ". You're #cgmnow " + convertBg(now_bg) + at());

		} else if (setting == "all" && (!last_bg || current_bg != now_bg)){
			doNotify(3, "You're #cgmnow " + convertBg(now_bg) + at() + ". The trend is " + now_trend +".");

		} else {
			console.log("No notification fit.");
		}
		current_direction = now_trend;
		current_bg = now_bg;
		});
	};



	function doNotify(priority, message){
		chrome.notifications.create("", {
			type: "basic",
			title: "NightScout.info CGM Utility",
			message: "" + message,
			iconUrl: "/public/assets/icon.png",
			priority: priority,
		}, function(notification_id) {
			if (priority >=3 ) setTimeout(function(){
				chrome.notifications.clear(notification_id, function(notification_id) {
					//nothing
				});
			},5000);
		});
 	}
					
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
