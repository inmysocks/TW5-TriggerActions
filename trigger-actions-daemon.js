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
				//Get the action tag from the configuration tiddler and filter to get a list of expression tiddlers.
				var expressionTiddlerFilter = configurationTiddler.getFieldString("expression_tiddler_filter");
				var tiddlersFilter = expressionTiddlerFilter + "+[evaluate[true]!has[draft.of]]";
				var expressionTiddlerList = $tw.wiki.filterTiddlers(tiddlersFilter);
				var fields;
				//Iterate through the list of expression tidders and evaluate any that have changed.
				if(expressionTiddlerList.length !== 0) {
					for (var j = 0; j < expressionTiddlerList.length; j++) {
						var expressionTiddler = $tw.wiki.getTiddler(expressionTiddlerList[j]);
						if(expressionTiddler) {
							// Label the current expression tiddler as a listen target if it isn't already labeled.
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
										// Make sure all the listen targets are labeled correctly to prevent infinite loops.
										if(currentListenTiddler && currentListenTiddler.getFieldString("listen_target") !== "true") {
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

	// This returns the content of all fields in the fieldList.
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
	function evaluateExpression(expressionTiddler) {
		// Get information from the expressionTiddler.
		var expressionFilter = expressionTiddler.getFieldString("action_filter");
		var fieldList = getTiddlerFields(expressionTiddler);
		var actionList = getActionList(expressionTiddler, fieldList);

		var parsed;
		var widgets;
		var container;
		var stringPassed;

		// Iterate through the values returned by the expressionFilter and for each value execute each action in the actionList.
		var actionTiddlers = $tw.wiki.filterTiddlers(expressionFilter);
		for(var i=0; i<actionTiddlers.length; i++) {
			var currentActionTiddler = $tw.wiki.getTiddler(actionTiddlers[i]);
			// If the current value is a tiddler.
			if(currentActionTiddler) {
				// Only act if changing the current action tiddler will not trigger another set of actions.
				if(currentActionTiddler.getFieldString("listen_target") !== "true") {
					for(var l=0; l<actionList.length; l++) {
						if(!changesListenTarget(actionList[l])) {
							// Variables have to be imported in order for macros to work.
							stringPassed = "<$importvariables filter='[[$:/core/ui/PageMacros]] [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]'>"+actionList[l]+"</$importvariables>";
							parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", stringPassed, {});
							widgets = $tw.wiki.makeWidget(parsed, {parentWidget:$tw.rootWidget});
							container = $tw.fakeDocument.createElement("div");
							widgets.setVariable("currentTiddler", actionTiddlers[i]);
							widgets.render(container, null);
							var widgetChild1 = widgets.children[0]; //This is to prevent infinite loops. I don't like how I did this.
							widgetChild1.children[0].invokeActions({});
						}
					}
				}
			}  else { 
			//If the current value isn't a tiddler it is handled differently.
				for(var p=0; p<actionList.length; p++) {
					if(!changesListenTarget(actionList[p])) {
						// Variables have to be imported in order for macros to work.
						stringPassed = "<$importvariables filter='[[$:/core/ui/PageMacros]] [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]]'>"+actionList[p]+"</$importvariables>";
						parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", stringPassed, {});
						widgets = $tw.wiki.makeWidget(parsed, {parentWidget:$tw.rootWidget});
						container = $tw.fakeDocument.createElement("div");
						widgets.setVariable("currentTiddler", actionTiddlers[i]);
						widgets.render(container, null);
						var widgetChild1 = widgets.children[0]; //This is to prevent infinite loops. I don't like how I did this.
						widgetChild1.children[0].invokeActions({});
					}
				}
			}
		}
	}

	// This checks to see if the actionTiddler variable in the current action widget is set to one of the listen targets and if so returns true, otherwise returns false.
	function changesListenTarget(actionItem) {
		// This is terrible, but it is the only way I can come up with that lets you both avoid infinite loops and use macros. I am sorry for this code.
		var parsed = $tw.wiki.parseText("text/vnd.tiddlywiki", actionItem, {});
		var widgets = $tw.wiki.makeWidget(parsed, {});
		var container = $tw.fakeDocument.createElement("div");
		widgets.setVariable("currentTiddler", actionItem);
		widgets.render(container, null);
		var widgetChild1 = widgets.children[0];
		if(widgetChild1 && widgetChild1.children[0].actionTiddler) {
			var listenTargets = $tw.wiki.filterTiddlers("[listen_target[true]]");
			if(listenTargets.indexOf(widgetChild1.children[0].actionTiddler) === -1) {
				return false;
			} else {
				return true;
			}
		}
		return true;
	}

	// On startup make sure expressions are up to date.
	function triggerActionsFull() {
		var CONFIGURATION_TIDDLER = "$:/plugins/inmysocks/TriggerActions/TriggerActionsSettingsTiddler";
		var configurationTiddler = $tw.wiki.getTiddler(CONFIGURATION_TIDDLER);
		var expressionTiddlerFilter = configurationTiddler.getFieldString("expression_tiddler_filter");
		var tiddlersFilter = expressionTiddlerFilter + "+[evaluate[true]!has[draft.of]]";
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