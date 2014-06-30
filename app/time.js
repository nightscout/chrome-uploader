if (!("milliseconds" in Number.prototype))
	Number.prototype.milliseconds = function() { return this; };
if (!("seconds" in Number.prototype))
	Number.prototype.seconds = function() {	return this.milliseconds() * 1000; };
if (!("minutes" in Number.prototype))
	Number.prototype.minutes = function() { return this.seconds() * 60; };
if (!("hours" in Number.prototype))
	Number.prototype.hours = function() { return this.minutes() * 60; };
if (!("days" in Number.prototype))
	Number.prototype.days = function() { return this.hours() * 24; };
if (!("weeks" in Number.prototype))
	Number.prototype.weeks = function() { return this.days() * 7; };
if (!("months" in Number.prototype))
	Number.prototype.months = function() { return this.days() * 30; };

if (!("toDays" in Number.prototype))
	Number.prototype.toDays = function() { return this.toHours() / 24; };
if (!("toHours" in Number.prototype))
	Number.prototype.toHours = function() { return this.toMinutes() / 60; };
if (!("toMinutes" in Number.prototype))
	Number.prototype.toMinutes = function() { return this.toSeconds() / 60; };
if (!("toSeconds" in Number.prototype))
	Number.prototype.toSeconds = function() { return this.toMilliseconds() / 1000; };
if (!("toMilliseconds" in Number.prototype))
	Number.prototype.toMilliseconds = function() { return this; };