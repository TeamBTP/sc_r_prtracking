/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"sc_r/prtracking/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
