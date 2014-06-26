define(function() {
	var stats;
	var Stats = function(a) {
		var r = {
			mean: 0,
			variance: 0,
			deviation: 0
		},
		t = a.length;
		for(var m, s = 0, l = t; l--; s += a[l]);
		for(m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
		r.deviation = Math.sqrt(r.variance = s / t);
		this.stats = r;
	};
	Stats.prototype.withinSD = function(meal, val, stdev) {
		var low = mean-(stdev*x.deviation);
		var hi = mean+(stdev*x.deviation);
		return (val > low) && (val < hi);
	};
	return Stats;
});