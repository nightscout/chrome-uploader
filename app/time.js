Number.prototype.milliseconds = function() { return this; };
Number.prototype.seconds = function() {	return this.milliseconds() * 1000; };
Number.prototype.minutes = function() { return this.seconds() * 60; };
Number.prototype.hours = function() { return this.minutes() * 60; };
Number.prototype.days = function() { return this.hours() * 24; };
Number.prototype.weeks = function() { return this.days() * 7; };
Number.prototype.months = function() { return this.days() * 30; };

Number.prototype.toDays = function() { return this.toHours() / 24; };
Number.prototype.toHours = function() { return this.toMinutes() / 60; };
Number.prototype.toMinutes = function() { return this.toSeconds() / 60; };
Number.prototype.toSeconds = function() { return this.toMilliseconds() / 1000; };
Number.prototype.toMilliseconds = function() { return this; };