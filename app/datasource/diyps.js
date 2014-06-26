define(function() {
	return {
		replace: function(data, diypsconfig) {
			console.debug("[saveToDiyPS] firing off");
			$.post(diypsconfig.endPoint,
				{
					records: JSON.stringify(data.map(function(plot) {
						return [
							+plot.displayTime,
							plot.bgValue,
							plot.trend
						];
					}))
				}
			);
		}
	}
});