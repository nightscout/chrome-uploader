// todo: use config object
define(["../bloodsugar", "../store/egv_records", "/app/config.js!"], function(convertBg, egvrecords, config) {
	var current_direction;
	var current_bg = 0;

	var newReading = function(cur_r, last_r) {

		var cur_record = cur_r;
		var last_record = last_r;
		var high = 400
		var low = 0

		high = config.targetrange.high;
		low = config.targetrange.low;

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


		if (config.notifications == "none"|| (now_bg==current_bg && current_direction == now_trend)) {
			//do nothing
		
		
		// falling too fast no other considerations
		} else if (now_trend == "DoubleDown" && now_bg < 150) {
			doNotify(now_bg, 2, "You're trending double down. #cgmnow " + convertBg(now_bg) + at(), high, low);
		

		// falling fast but slowing
		} else if (now_trend == "SingleDown" && now_trend == "DoubleDown") {
			doNotify(now_bg,1, "Your fall has slowed. You were double down but are now single down. #cgmnow " + convertBg(now_bg) + at(), high, low);

		// falling too fast considering current bg
		} else if (now_trend == "SingleDown" && now_bg < 130 && (last_bg? last_bg >= 130: true)) {
			doNotify(now_bg,2, "You're trending single down. #cgmnow " + convertBg(now_bg) + at(), high, low);


		// falling but slowing
		} else if (now_trend == "FortyFiveDown" && (["SingleDown", "DoubleDown"].indexOf(now_trend) > -1)) {
			doNotify(now_bg,1, "Your fall has slowed. You were " + now_trend + " but are now forty five down down. #cgmnow " + convertBg(now_bg) + at(), high, low);

		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveDown" && now_bg < 110 && (last_bg? last_bg >= 110: true)) {
			doNotify(2, "You're trending forty five down. #cgmnow " + convertBg(now_bg) + at(), high, low);

		

		// raising too fast
		} else if (now_trend == "DoubleUp" && now_bg > 110 && ( last_bg? last_bg <= 110: true)) {
			doNotify(now_bg,2, "You're trending double up. #cgmnow " + convertBg(now_bg) + at(), high, low);

		// rising fast but slowing
		} else if (now_trend == "SingleUp" && now_trend == "DoubleUp") {
			doNotify(now_bg,1, "Your rise has slowed. You were double up but are now single up. #cgmnow " + convertBg(now_bg) + at(), high, low);

		// rising too fast considering current bg
		} else if (now_trend == "SingleUp" && now_bg > 130 && (last_bg? last_bg <= 130: true)) {
			doNotify(now_bg,2, "You're trending single up. #cgmnow " + convertBg(now_bg) + at(), high, low);


		// rising but slowing
		} else if (now_trend == "FortyFiveUp" && (["SingleUp", "DoubleUp"].indexOf(now_trend) > -1)) {
			doNotify(now_bg,1, "Your rise has slowed. You were " + now_trend + " but are now forty five up up. #cgmnow " + convertBg(now_bg) + at());

		// falling too fast considering current bg
		} else if (now_trend == "FortyFiveUp" && now_bg > 150 && (last_bg? last_bg <= 150: true)) {
			doNotify(now_bg,2, "You're trending forty five up. #cgmnow " + convertBg(now_bg) + at(), high, low);

		} else if (current_direction && current_direction != now_trend) {
			doNotify(now_bg,1, "Trend direction changed to " + now_trend + ". You're #cgmnow " + convertBg(now_bg) + at(), high, low);

		} else if (config.notifications == "all" && (!last_bg || current_bg != now_bg)){
			doNotify(now_bg,3, "You're #cgmnow " + convertBg(now_bg) + at() + ". The trend is " + now_trend +".", high, low);

		} else {
			console.log("No notification fit.");
		}
		current_direction = now_trend;
		current_bg = now_bg;
	};

	function doNotify(bg_value,priority, message, high, low){
		Promise.all([
			new Promise(function(ready) {
				ready(config.notifications_timeout || "no");
			}),
			new Promise(function(ready) {
				ready(config.notifications_bignumbers || "no");
			})
		]).then(function(settings){
			var timeout_funct = function(notification_id){};
			if(settings[0] != "no"){
				timeout_funct = function(notification_id) {
					setTimeout(function(){
						chrome.notifications.clear(notification_id, function(notification_id) {
							//nothing
						});
					}, parseInt(settings[0]).seconds());
				};
			}

			if(settings[1] == "no"){
				chrome.notifications.create("", {
					type: "basic",
					title: "NightScout.info CGM Utility",
					message: "" + message,
					iconUrl: "/public/assets/icon.png",
					priority: priority,
				}, timeout_funct);
			} else{
				//create canvas
				var canvas = document.createElement('canvas');
				canvas.width = 80;
				canvas.height = 45;
				var ctx = canvas.getContext('2d');
				ctx.fillStyle = "";
				ctx.fillRect(0, 0, canvas.width,canvas.height);
				ctx.fillStyle = "rgb(200,0,0)";
				if (bg_value >= low) ctx.fillStyle = "rgb(0,200,0)";
				if (bg_value > high) ctx.fillStyle = "rgb(250,250,0)";
				ctx.font = "30px Verdana";
	 			ctx.fillText(convertBg(bg_value),5,35);
				var dataURL = canvas.toDataURL('image/png');
				//create notification
				chrome.notifications.create("", {
					type: "image",
					title: "NightScout.info CGM Utility",
					message: "" + message,
					iconUrl: "/public/assets/icon.png",
					imageUrl: dataURL,
					priority: priority,
				}, timeout_funct);
			}
		});
	}
	egvrecords.onChange(function(new_r, all) {
		var cur_record = all[all.length - 1],
			last_record = null;
		if (all.length > 1) {
			last_record = all[all.length - 2];
		}
		newReading(cur_record, last_record);
	});
});
