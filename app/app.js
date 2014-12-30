require(["feature/cgm_download", "feature/mongolab", "feature/trending_alerts", "waiting", "store/egv_records", "/app/config.js!", "blinken_lights"], function(cgm, mongolab, alerts, waiting, egvrecords, config, blinkenLights) {

// OS Flags
// Windows needs a different COM port than everything else because Windows.
// I don't have an older version of OSX to troubleshoot this against
var isWindows = !!~window.navigator.appVersion.indexOf("Win");
var isMac = !!~window.navigator.appVersion.indexOf("Mac OS X");
var macVersion;
if (isMac) {
	var identifier = "Mac OS X";
	var ixVersion = window.navigator.appVersion.indexOf(identifier) + identifier.length;
	if (ixVersion > identifier.length) {
		var v = window.navigator.appVersion.indexOf(")", ixVersion);
		identifier = window.navigator.appVersion.substring(ixVersion, v).trim().split("_").map(function(r) { return parseInt(r, 10); });

		const MAJOR = 0, MINOR = 1, BUGFIX = 2;
		if (identifier[MAJOR] == 10 && identifier[MINOR] >= 7 && identifier[MINOR] <= 10) {
			// ok
		} else if (identifier[MAJOR] == 10 && identifier[MINOR] > 10) {
			// probably ok
		} else if (identifier[MAJOR] > 10) {
			// *shrugs*
			setTimeout(waiting.show("You're on a much newer version of OSX than this has been tested against. Please provide feedback on what happens."), (10).seconds());
		} else {
			// fail
			setTimeout(waiting.show("You're on an old version of OSX and this is unlikely to work."), (10).seconds());
		}
	}
}

$(function() {
	// event handlers
	$("#disclaimer").modal();
	$("#disclaimer").show();
	$("#acknowledge-agree").click(function() {
		$("#disclaimer.modal").modal('hide');
		$("#receiverui").show();
	});
	$("#acknowledge-disagree").click(function() {
		window.close();
	});
	$("#openhelp").click(function(e) {
		chrome.app.window.create('app/help.html', {
			id: "help",
			bounds: {
				width: 800,
				height: 600
			}
		});	
		e.preventDefault();
	});

	$("#backfilldatabase").click(function() {
		mongolab.publish(egvrecords).then(function() {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Published " + local.egvrecords.length + " records to MongoLab",
				iconUrl: "/public/assets/icon.png",
			}, function(notification_id) {
			});
			console.log("[app.js publishtomongolab] publish complete, %i records", local.egvrecords.length);
		});
	});

	$('#reset').confirmation({
		title: "Are you sure? This will delete all your local data and cannot be undone.",
		onConfirm: egvrecords.removeAll
	});

	$(".downloadallfromdexcom").click(cgm.getAllRecords);

	$("#fixit").click(function() {
		$("#errorrreporting").modal();
		$("#errorrreporting").show();
		$("#whatswrong").val("");
	});


	$('.dropdown-toggle').dropdown();
	$("#menuinsights").click(function() {
		chrome.app.window.create('app/report/insights.html', {
			id: "insightsreport",
			bounds: {
				width: 800,
				height: 600
			}
		});
	});
	$("#menusuccess").click(function() {
		chrome.app.window.create('app/report/success.html', {
			id: "successreport",
			bounds: {
				width: 800,
				height: 600
			}
		});
	});
	$("#menudailystats").click(function() {
		chrome.app.window.create('app/report/dailystats.html', {
			id: "dailystatsreport",
			bounds: {
				width: 600,
				height: 650
			}
		});
	});
	$("#menudistribution").click(function() {
		chrome.app.window.create('app/report/glucosedistribution.html', {
			id: "glucosedistribution",
			bounds: {
				width: 960,
				height: 400
			}
		});
	});
	$("#menuhourlystats").click(function() {
		chrome.app.window.create('app/report/hourlystats.html', {
			id: "hourlystats",
			bounds: {
				width: 960,
				height: 800
			}
		});
	});

	$("#menupercentilechart").click(function() {
		chrome.app.window.create('app/report/percentile.html', {
			id: "percentilechart",
			bounds: {
				width: 960,
				height: 578
			}
		});
	});

	$("#openoptions").click(function(){
		chrome.app.window.create('app/options.html', {
			id: "options",
			bounds: {
				width: 960,
				height: 600
			}
		});
		
	});
	
	$("#pulldatabase").click(function() {
		mongolab.populateLocalStorage().then(function(r, ml) {
			chrome.notifications.create("", {
				type: "basic",
				title: "NightScout.info CGM Utility",
				message: "Pulled " + r.raw_data.length + " records from MongoLab. You might have already had some, and any duplicates were discarded.",
				iconUrl: "/public/assets/icon.png"
			}, function(chrome_notification_id) { });
		});
	});
	$("#errorreporting-agree").click(function(){
		var github = "https://api.github.com";
		console.debug(config);
		$.ajax({
			url: github + "/gists",
			accept: "application/vnd.github.v3+json",
			dataType: "json",
			data: JSON.stringify({
				"description": $("#whatswrong").val() || "Console details",
				"public": false,
				"files": {
					"console": {
						"content":console.fixMyStuff()
					}
				}
			}),
			type: "POST",
			contentType: "application/json"
		}).then(function(r) {
			$("#errorrreporting").modal('hide');
			window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent("@bosh I have a problem with Nightscout CGM Uploader") + "&url=" + encodeURIComponent(r.html_url))
		});
	})
	$("#errorreporting-disagree").click(function() {
		$("#errorrreporting").modal('hide');
	});
	$("#export").click(function() {
		Promise.all([
			new Promise(function(done) {
				chrome.fileSystem.chooseEntry({
					type: 'saveFile',
					suggestedName: "blood sugars.csv"
				}, function(writableFileEntry) {
					writableFileEntry.createWriter(done);
				});
			}),
			new Promise(function(done) {
				require(["./bloodsugar"], done);
			})
		]).then(function(params) {
			var writer = params[0],
				convertBg = params[1];
			writer.write(new Blob(
				egvrecords.map(function(record) {
					return [
						(new Date(record.displayTime)).format("M j Y H:i"),
						convertBg(record.bgValue),
						record.trend
					].join(",") + "\n";
				}), {
					type: 'text/plain'
				}
			));
		})
	});

	blinkenLights.on("output", (function() {
		var to = false;
		var tx = $("#tx");
		var txLabel = tx.next();
		tx.css("background-color", "#040");
		txLabel.css("color", "#666");
		return function() {
			tx.css("background-color", "#0f0");
			txLabel.css("color", "#aaa");
			if (to) clearTimeout(to);
			to = setTimeout(function() {
				tx.css("background-color", "#040");
				txLabel.css("color", "#666");
			}, 300);
		};
	}).call());

	blinkenLights.on("input", (function() {
		var to = false;
		var rx = $("#rx");
		var rxLabel = rx.next();
		rx.css("background-color", "#400");
		rxLabel.css("color", "#666");
		return function(a) {
			if (a[0].length == 2) return;
			rx.css("background-color", "#f00");
			rxLabel.css("color", "#aaa");
			if (to) clearTimeout(to);
			to = setTimeout(function() {
				rx.css("background-color", "#400");
				rxLabel.css("color", "#666");
			}, 500);
		};
	}).call());
});

});
