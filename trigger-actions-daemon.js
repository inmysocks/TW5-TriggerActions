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

	var Wiki = require("$:/core/modules/wiki.js");

	// Configuration tiddler
	var CONFIGURATION_TIDDLER = "$:/plugins/inmysocks/TriggerActions/TriggerActionsSettingsTiddler";
	var configurationTiddler = $tw.wiki.getTiddler(CONFIGURATION_TIDDLER);

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
				var actionTag = configurationTiddler.getFieldString("action_tag"); // Any tiddler with this tag will be an expression tiddler.
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
							} 
						}
					}
				}
			}
		});
	};

	// This returns the content of all fields execpt: title, text, modified, created, creator, tags, evaluate
	function getTiddlerFields(tiddler) {
		var results = [];		
		if(tiddler) {
			for(var fieldName in tiddler.fields) {
				if(fieldName != "title" && fieldName != "text" && fieldName != "modified" && fieldName != "created" && fieldName != "creator" && fieldName !="tags" && fieldName != "evaluate") {
					$tw.utils.pushTop(results,fieldName);
				}
			}
		}
		return results;
	}

	// This returns the content of all fields execpt: title, text, modified, created, creator, tags, evaluate
	function getActionList(expressionTiddler, fieldList) {
		var results = [];		
		if(fieldList) {
			for(var m =0; m < fieldList.length; m++) {
				if(fieldList[m]) {
					$tw.utils.pushTop(results,expressionTiddler.getFieldString(fieldList[m]));
				}
			}
		}
		return results;
	}

	// This should be simple, it just takes each expression tiddler, evaluates its filter and then performs the actions on each tiddler returned by the filter.
	// The probelm is I don't know how to evaluate a wikitext string from javascript.
	function evaluateExpression(expressionTiddler) {
		var expressionFilter = expressionTiddler.getFieldString("text"); // This is in a specific field in the expressionTiddler.
		var fieldList = getTiddlerFields(expressionTiddler); // This lists all of the action fields in the expression tiddler
		var actionList = getActionList(expressionTiddler, fieldList); // This lists the contents of all other fields of the expressionTiddler;

		// Iterate through the tiddlers returned by the expressiotFilter and for each tiddler execute each action in the actionList.
		var actionTiddlers = $tw.wiki.filterTiddlers(expressionFilter); // This lists the tiddlers acted upon.
		for(var i=0; i<actionTiddlers.length; i++) {
			var currentActionTiddler = $tw.wiki.getTiddler(actionTiddlers[i]); // How do we set currentActionTiddler as the current tiddler?
			if(currentActionTiddler) {
				for(var l=0; l<actionList.length; l++) {
					var actionItem = actionList[l];
					var parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", actionList[l], {});
					var widgets = $tw.wiki.makeWidget(parsed, {});
					var container = $tw.fakeDocument.createElement("div");
					widgets.setVariable("currentTiddler", currentActionTiddler.getFieldString("title"));
					widgets.render(container, null);
					widgets.children[0].invokeActions({});
				}
			}
		}
	}

	function triggerActionsFull() {
		var CONFIGURATION_TIDDLER = "$:/plugins/inmysocks/TriggerActions/TriggerActionsSettingsTiddler";
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