/* Adrian:

This script will add two DatePicker (from, to), a "Generate Report" button and a "Print" button to a <div> with id "stats_controls".
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

            var controlshtml = "<p>From Date: <input type='text' id='fromdate'>  To Date: <input type='text' id='todate'> <button class='generatrereport' id='generatrereport'>Generate Report</button><button class='print'>Print</button></p>";
            ready($("#stats_controls").append($(controlshtml)));
        })
    ]).then(function(o) {
        //register datepicker
        require(["jquery", "/vendor/jquery-ui/jquery-ui.min.js"], function($) {
            $("#fromdate").datepicker();
            $("#todate").datepicker();
        });

        //add presets for dates
        var now = new Date();
        $("#todate").val((now.getMonth() + 1) + "/" + now.getDate() + "/" + now.getFullYear());

        var one = 1;
        var then = new Date(Date.now() - one.months());
        $("#fromdate").val((then.getMonth() + 1) + "/" + then.getDate() + "/" + then.getFullYear());

        //add handler
        $("#generatrereport").click(function() {
            general_generate_report();
        });

        $(".print").click(function(e) {
            e.preventDefault();
            window.print();
        });

    }).then(function(x){general_generate_report();});

});
