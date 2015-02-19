/*\
title: $:/plugins/inmysocks/TriggerActions/trigger-actions-daemon.js
type: application/javascript
module-type: startup

Trigger Actions Daemon

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

	// Configuration tiddler
	var CONFIGURATION_TIDDLER = "$:/plugins/inmysocks/TriggerActions/TriggerActionsSettingsTiddler";

	exports.startup = function() {
		// Do all actions on startup.
		triggerActionsFull();

		// Reset the values when any of the tiddlers change.
		$tw.wiki.addEventListener("change",function(changes) {
			//If the configuration changes do a full refresh, otherwise just refresh the changed expression.
			if($tw.utils.hop(changes, CONFIGURATION_TIDDLER)) {
				triggerActionsFull();
			} else {
				//Get the action tag from the configuration tiddler
				var configurationTiddler = $tw.wiki.getTiddler(CONFIGURATION_TIDDLER);
				var actionTag = configurationTiddler.getFieldString("action_tag"); // Any tiddler with this tag will be an expression tiddler.
				console.log(actionTag);
				var tiddlersFilter = "[tag[" + actionTag + "]evaluate[true]!has[draft.of]]";
				var expressionTiddlerList = $tw.wiki.filterTiddlers(tiddlersFilter);
				//Iterate through the list of expression tidders and evaluate each one if there has been a change.
				if(expressionTiddlerList.length !== 0) {
					for (var j = 0; j < expressionTiddlerList.length; j++) {
						var expressionTiddler = $tw.wiki.getTiddler(expressionTiddlerList[j]);
						if(expressionTiddler) {
							// If the expression tiddler has changed, update its output.
							if($tw.utils.hop(changes,expressionTiddlerList[j])) {
								evaluateExpression(expressionTiddler);
							} else {
								// If any of the tiddlers listed in the expression tiddler change, update the expression tiddlers output.
								var inputFilter = expressionTiddler.getFieldString("text","[is[system]!is[system]]");
								console.log(inputFilter);
								var tiddlerList = $tw.wiki.filterTiddlers(inputFilter);
								if(tiddlerList.length !== 0) {
									for (var k = 0; k < tiddlerList.length; k++) {
										var tidTitle = tiddlerList[k];
										if($tw.utils.hop(changes,tidTitle)) {
											evaluateExpression(expressionTiddler);
										}
									}
								}
							}
						}
					}
				}
			}
		});
	};

	// This returns the content of all fields execpt: title, text, modified, created, creator
	function getTiddlerFields(tiddler) {
		var results = [];		
		if(tiddler) {
			for(var fieldName in tiddler.fields) {
				if(fieldName != "title" && fieldName != "text" && fieldName != "modified" && fieldName != "created" && fieldName != "creator") {
					$tw.utils.pushTop(results,fieldName);
				}
			}
		}
		return results;
	}

	// This should be simple, it just takes each expression tiddler, evaluates its filter and then performs the actions on each tiddler returned by the filter.
	// The probelm is I don't know how to evaluate a wikitext string from javascript.
	function evaluateExpression(expressionTiddler) {
		var expressionFilter = $tw.getFieldString("text"); // This is in a specific field in the expressionTiddler.
		var actionList = getTiddlerFields(expressionTiddler); // This lists the contents of all other fields of the expressionTiddler;

		// Iterate through the tiddlers returned by the expressiotFilter and for each tiddler execute each action in the actionList.
		var actionTiddlers = $tw.wiki.filterTiddlers(expressionFilter); // This lists the tiddlers acted upon.
		for(var i=0; i<actionTiddlers.length; i++) {
			var currentActionTiddler = $tw.wiki.getTiddler(actionTiddlers[i]);
			for(var l=0; l<actionList.length; l++) {
				var child = actionList[l];
				var handled = false; // Is this how you do it? I have no idea.
				if(child.invokeAction) { // && child.invokeAction(this,event)) {
					handled = true;
				}
			}
		}
	}

	function triggerActionsFull() {
		var configurationTiddler = $tw.wiki.getTiddler(CONFIGURATION_TIDDLER);
		var actionTag = configurationTiddler.getFieldString("action_tag");
		var tiddlersFilter = "[tag[" + actionTag + "]evaluate[true]!has[draft.of]]";
		var expressionTiddlerList = $tw.wiki.filterTiddlers(tiddlersFilter);
		if(expressionTiddlerList.length !== 0) {
			for (var j = 0; j < expressionTiddlerList.length; j++) {
				var expressionTiddler = $tw.wiki.getTiddler(expressionTiddlerList[j]);
				if(expressionTiddler) {
					evaluateExpression(expressionTiddler);
				}
			}
		}
	}

})();
