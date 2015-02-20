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
				var expressionTiddlerFilter = configurationTiddler.getFieldString("expression_tiddler_filter"); // Any tiddler with this tag will be an expression tiddler.
				var tiddlersFilter = expressionTiddlerFilter + "+[evaluate[true]!has[draft.of]]";
				var expressionTiddlerList = $tw.wiki.filterTiddlers(tiddlersFilter);
				var fields;
				//Iterate through the list of expression tidders and evaluate each one if there has been a change.
				if(expressionTiddlerList.length !== 0) {
					for (var j = 0; j < expressionTiddlerList.length; j++) {
						var expressionTiddler = $tw.wiki.getTiddler(expressionTiddlerList[j]);
						if(expressionTiddler) {
							if(expressionTiddler.getFieldString("listen_target") !== "true") {
								fields = {};
								fields["listen_target"] = "true";
								$tw.wiki.addTiddler(new $tw.Tiddler(expressionTiddler,fields,undefined));
							}
							// If the expression tiddler has changed, update its output.
							if($tw.utils.hop(changes,expressionTiddlerList[j])) {
								evaluateExpression(expressionTiddler);
							} else {
								// If any of the tiddlers listed in the listenFilter change update the output.
								var listenFilter = expressionTiddler.getFieldString("listen_filter");
								var listenTiddlerList = $tw.wiki.filterTiddlers(listenFilter);
								if(listenTiddlerList.length !== 0) {
									for (var p = 0; p < listenTiddlerList.length; p++) {
										var currentListenTiddler = $tw.wiki.getTiddler(listenTiddlerList[p]);
										if(currentListenTiddler.getFieldString("listen_target") !== "true") {
											fields = {};
											fields["listen_target"] = "true";
											$tw.wiki.addTiddler(new $tw.Tiddler(currentListenTiddler,fields,undefined));
										}
										if($tw.utils.hop(changes,listenTiddlerList[p])) {
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

	// This returns the content of all fields execpt: title, text, modified, created, creator, tags, evaluate, listen_filter, action_filter
	function getTiddlerFields(tiddler) {
		var results = [];		
		if(tiddler) {
			for(var fieldName in tiddler.fields) {
				if(fieldName != "title" && fieldName != "text" && fieldName != "modified" && fieldName != "created" && fieldName != "creator" && fieldName !="tags" && fieldName != "evaluate" && fieldName != "listen_filter" && fieldName != "action_filter") {
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
		var expressionFilter = expressionTiddler.getFieldString("action_filter"); // This is in a specific field in the expressionTiddler.
		var fieldList = getTiddlerFields(expressionTiddler); // This lists all of the action fields in the expression tiddler
		var actionList = getActionList(expressionTiddler, fieldList); // This lists the contents of all other fields of the expressionTiddler;
		var actionItem;
		var parsed;
		var widgets;
		var container;

		// I need to  have two things here, one for when the filter returns actual tiddlers, another for when the filter returns a list of non-tiddler values. How do I distinguish between them?
		// Iterate through the values returned by the expressionFilter and for each value execute each action in the actionList.
		var actionTiddlers = $tw.wiki.filterTiddlers(expressionFilter);
		for(var i=0; i<actionTiddlers.length; i++) {
			var currentActionTiddler = $tw.wiki.getTiddler(actionTiddlers[i]);
			// If the current value is a tiddler.
			if(currentActionTiddler) {
				// Only act if changing the current action tiddler will not trigger another set of actions.
				if(currentActionTiddler.getFieldString("listen_target") !== "true") {
					for(var l=0; l<actionList.length; l++) {
						actionItem = actionList[l];
						parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", actionList[l], {});
						widgets = $tw.wiki.makeWidget(parsed, {});
						container = $tw.fakeDocument.createElement("div");
						widgets.setVariable("currentTiddler", currentActionTiddler.getFieldString("title"));
						widgets.render(container, null);
						if(widgets) {
							widgets.invokeActions({});
						}
					}
				}
			} /* else { //If the current value isn't a tiddler you don't have to worry about infinite loops. This isn't true, if the current value is a field in a tiddler you can get infinite loops. I can't add this part until I find a way around that.
				for(var p=0; p<actionList.length; p++) {
					actionItem = actionList[p];
					parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", actionList[p], {});
					widgets = $tw.wiki.makeWidget(parsed, {});
					container = $tw.fakeDocument.createElement("div");
					widgets.setVariable("currentTiddler", actionTiddlers[i]);
					widgets.render(container, null);
					if(widgets) {
						widgets.invokeActions({});
					}
				}
			}*/
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