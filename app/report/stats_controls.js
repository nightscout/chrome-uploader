/* Adrian:

This script will add two DatePicker (from, to), two arrow buttons to jump to the neighbouring timeframe and a "Print" button to a <div> with id "stats_controls".
"Generate Report" will pre-filter the data according to the dates given by the DatePickers and then call a function "generate_report(data, high, low);" that has to be provided by the programmer.

data - array of datapoints in the timerange.
high - the value of the option targetrange.high.
low- the value of the option targetrange.low.

To use this script in an html-file:

1st: Import it: <script src="stats_controls.js"></script>
2nd: Add a div with id "stats_controls" in your html-file where you want the controls placed. This could look like: <div id="stats_controls"/>
3rd: Provide the function "generate_report(data, high, low);", that will actually generate the report.
4th: Import css for a more beautiful DatePicker: <link rel="stylesheet" href="/vendor/jquery-ui/jquery-ui.min.css"/>

*/

var fromold = "";
var toold = "";

var general_generate_report = function() {
    require(["../bloodsugar"], function(convertBg) {
        var low, high;
        Promise.all([
            new Promise(function(ready) {
                chrome.storage.local.get(["egvrecords", "config"], function(values) {
                    if ("config" in values && "targetrange" in values.config) {
                        low = values.config.targetrange.low || 70;
                        high = values.config.targetrange.high || 130;
                    } else {
                        low = 70;
                        high = 130;
                    }
                    ready(values.egvrecords.map(function(r) {
                        r.localBg = parseFloat(convertBg(r.bgValue));
                        return r;
                    }));
                });
            })
        ]).then(function(o) {
            var data = o[0];
            var config = {
                low: convertBg(low),
                high: convertBg(high)
            };
            var one = 1;
            var startdate = Date.parse($("#fromdate").val());
            var enddate = Date.parse($("#todate").val()) + one.days();

	    $("#dateselectionerrormessage").empty();
	    if(startdate>=enddate){
		$("#fromdate").val(fromold);
		$("#todate").val(toold);
	    	$("#dateselectionerrormessage").append("reset to previous date (To was after From)!");
		return;
	    } 
	    fromold = $("#fromdate").val();
            toold = $("#todate").val();
	    var datestring = $("#fromdate").val() + " - " + $("#todate").val();
	    $("#dateoutput").empty();
	    $("#dateoutput").append(datestring);
            data = data.filter(function(record) {
                return (record.displayTime >= startdate) && (record.displayTime < enddate);
            });

            generate_report(data, high, low);
        });
    });
}


$(function() {

    Promise.all([
        new Promise(function(ready) {

            var controlshtml = "<p>From Date: <input type='text' id='fromdate'>  To Date: <input type='text' id='todate'><button class='dateleft' id='dateleft'>&#x21E6;</button><button class='dateright' id='dateright'>&#x21E8;</button> <button class='print'>Print</button> <output id='dateselectionerrormessage'style='color:red;'></output></p>";
            ready($("#stats_controls").append($(controlshtml)));
        })
    ]).then(function(o) {
        //register datepicker
        require(["jquery", "/vendor/jquery-ui/jquery-ui.min.js"], function($) {
            $("#fromdate").datepicker({onClose: general_generate_report});
            $("#todate").datepicker({onClose: general_generate_report});
        });

        //add presets for dates
        var now = new Date();
        $("#todate").val((now.getMonth() + 1) + "/" + now.getDate() + "/" + now.getFullYear());
	toold = $("#todate").val();
        var one = 1;
        var then = new Date(Date.now() - one.months());
        $("#fromdate").val((then.getMonth() + 1) + "/" + then.getDate() + "/" + then.getFullYear());
	fromold = $("#fromdate").val();

        //add handler
        $(".print").click(function(e) {
            e.preventDefault();
            window.print();
        });

        $("#dateleft").click(function() {
	    var from = Date.parse($("#fromdate").val());
	    var to = Date.parse($("#todate").val());
	    //daylight saving time may make diffs just very close to full days:
	    var diff = Math.round((to - from)/(1000 * 60 * 60 * 24))*(1000 * 60 * 60 * 24);
	    var one = 1;
	    to = from - one.days();
	    from = to - diff;
	    to = new Date(to);
	    from = new Date(from);
            $("#todate").val("" + (to.getMonth()+1) + "/" + to.getDate() + "/" + to.getFullYear());
            $("#fromdate").val("" + (from.getMonth()+1) + "/" + from.getDate() + "/" + from.getFullYear());
            general_generate_report();
        });

        $("#dateright").click(function() {
	    var from = Date.parse($("#fromdate").val());
	    var to = Date.parse($("#todate").val());
	    //daylight saving time may make diffs just very close to full days:
	    var diff = Math.round((to - from)/(1000 * 60 * 60 * 24))*(1000 * 60 * 60 * 24);
	    var one = 1;
	    from = to + one.days();
	    to = from + diff;
	    to = new Date(to);
	    from = new Date(from);
            $("#todate").val("" + (to.getMonth()+1) + "/" + to.getDate() + "/" + to.getFullYear());
            $("#fromdate").val("" + (from.getMonth()+1) + "/" + from.getDate() + "/" + from.getFullYear());
            general_generate_report();
        });




    }).then(function(x){general_generate_report();});

});
