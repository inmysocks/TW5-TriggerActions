/*\
title: $:/plugins/inmysocks/TriggerActions/startup-actions.js
type: application/javascript
module-type: startup

Startup Actions Script thing

\*/
(function () {

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	// Export name and synchronous status
	exports.name = "trigger-actions-daemon";
	exports.platforms = ["browser"];
	exports.after = ["startup"];
	exports.synchronous = true;

	var Wiki = require("$:/core/modules/wiki.js");

	exports.startup = function() {
		// Do all actions on startup.
		var tiddlersFilter = "[tag[$:/tags/StartupAction]!has[draft.of]]";
		var expressionTiddlerList = $tw.wiki.filterTiddlers(tiddlersFilter);
		if(expressionTiddlerList.length !== 0) {
			for (var j = 0; j < expressionTiddlerList.length; j++) {
				var expressionTiddler = $tw.wiki.getTiddler(expressionTiddlerList[j]);
				if(expressionTiddler) {
					evaluateExpression(expressionTiddler);
				}
			}
		}
	};

	// This should be simple, it just takes each expression tiddler and triggers all of the action widgets in its text field
	function evaluateExpression(expressionTiddler) {
		if(expressionTiddler) {
			// Only act if changing the current action tiddler will not trigger another set of actions.
			var parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", expressionTiddler.getFieldString("text"), {});
			var widgets = $tw.wiki.makeWidget(parsed, {});
			var container = $tw.fakeDocument.createElement("div");
			widgets.setVariable("currentTiddler", expressionTiddler.getFieldString("title"));
			widgets.render(container, null);
			if(widgets.children[0]) {
				widgets.children[0].invokeActions({});
			}
		}
	}

})();