var myApp;
var makeAWindow = function(title) {
	return $([
		'<div class="modal fade">',
			'<div class="modal-dialog">',
				'<div class="modal-content">',
					'<div class="modal-header">',
						'<h4 class="modal-title">' + title + '</h4>',
					'</div>',
					'<div class="modal-body">',
						'<div class="progress progress-info progress-striped active">',
							'<div class="bar" style="width: 0;"></div>',
						'</div>',
					'</div>',
					'<div class="modal-footer">',
					'<p>This may take a moment</p>',
					'</div>',
				'</div>',
			'</div>',
		'</div>'
	].join(""));
};

var pleaseWaitDiv = makeAWindow("Communicating");

define("waiting", {
	show: function(title) {
		var me = this;
		if (title) {
			pleaseWaitDiv = makeAWindow(title);
		}
		pleaseWaitDiv.modal();
		return function() {
			me.hide();
		};
	},
	hide: function () {
		pleaseWaitDiv.modal('hide');
	},
	setProgress: function(progress) {
		pleaseWaitDiv.find(".bar").width(progress + "%")
	}
});
