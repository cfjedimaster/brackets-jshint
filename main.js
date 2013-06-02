/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT */

define(function (require, exports, module) {
	'use strict';

	var Commands                = brackets.getModule("command/Commands"),
		CommandManager          = brackets.getModule("command/CommandManager"),
		EditorManager           = brackets.getModule("editor/EditorManager"),
		DocumentManager         = brackets.getModule("document/DocumentManager"),
		ProjectManager				= brackets.getModule("project/ProjectManager"),
		Menus                   = brackets.getModule("command/Menus"),
		NativeFileSystem		= brackets.getModule("file/NativeFileSystem").NativeFileSystem,
		FileUtils				= brackets.getModule("file/FileUtils"),
		Dialogs					= brackets.getModule("widgets/Dialogs"),
		Resizer                 = brackets.getModule("utils/Resizer"),

		//current module's directory
		moduleDir				= FileUtils.getNativeModuleDirectoryPath(module),
		configFile				= new NativeFileSystem.FileEntry(moduleDir + '/config.js'),
		config					= { options:{}, globals: {} };

	require("jshint/jshint-2.0.1");

	//commands
	var VIEW_HIDE_JSHINT = "jshint.run";
	
	//Determines if we are enabled or not. Previously we based this on if we could
	//see the panel, but now the panel will be hidden on non-JS files
	var jsHintEnabled = false;

	var $jshint;

	function isJSDoc(fileEntry) {
		var filename = fileEntry.file.name;
		var ext = filename.split(".").pop();
		return (ext === "js");
	}

	function _handleHint() {
		var messages, result;

		var editor = EditorManager.getCurrentFullEditor();

		if (!editor) {
			$jshint.hide();
			EditorManager.resizeEditor();
			return;
		}

		if(!isJSDoc(editor.document)) {
			$jshint.hide();
			EditorManager.resizeEditor();
			return;
		} else {
			$jshint.show();
			EditorManager.resizeEditor();
		}

		//sniff for .jshintrc
		var options = config.options;
		var globals = config.globals;

		var projectConfig = new NativeFileSystem.FileEntry(ProjectManager.getProjectRoot().fullPath + '.jshintrc');

		FileUtils.readAsText(projectConfig).done(function (text, readTimestamp) {
			if(text.length) {
				try {
					var thisConfig = JSON.parse(text);
					/*
					From what I see of the jshint docs, a .jshintrc has root keys that are options and
					a key called globals. Possibly. So we need to copy everything *but* globals into
					ob.options to make it work right with the call below. Actually screw that. I'm going to 
					rewrite the default config.js to *not* use options as a subkey. I'll check with the
					person who added this support since maybe they did it wrong.

					Nope, screw my screw. I'm going to leave it as is and just make it work.
					*/
					options = thisConfig;
					if(thisConfig.globals) {
						globals = thisConfig.globals;
						delete thisConfig.globals;
					} else globals = {};

					console.log('overwriting with:',thisConfig);
				} catch(e) {
				}
			}
		}).then(function() {

			var text = editor.document.getText();

			result = JSHINT(text, options, globals);

			if (!result) {
				var errors = JSHINT.errors;

				var $jshintTable = $("<table class='zebra-striped condensed-table' style='table-layout: fixed; width: 100%'>").append("<tbody>");
				$("<tr><th>Line</th><th>Declaration</th><th>Message</th></tr>").appendTo($jshintTable);

				var $selectedRow;

				errors.forEach(function (item) {
					var makeCell = function (content) {
						return $("<td style='word-wrap: break-word'/>").text(content);
					};

					/*
					if item is null, it means a fatal error, for now, not going to say anything about it.
					*/
					if (item) {

						if (!item.line) { item.line = ""; }
						if (!item.evidence) { item.evidence = ""; }

						var $row = $("<tr/>")
									.append(makeCell(item.line))
									.append(makeCell(item.evidence))
									.append(makeCell(item.reason))
									.appendTo($jshintTable);

						$row.click(function () {
							if ($selectedRow) {
								$selectedRow.removeClass("selected");
							}
							$row.addClass("selected");
							$selectedRow = $row;

							var editor = EditorManager.getCurrentFullEditor();
							editor.setCursorPos(item.line - 1, item.col - 1);
							EditorManager.focusEditor();
						});

					}

				});

				$("#jshint .table-container")
					.empty()
					.append($jshintTable);

			} else {
				//todo - tell the user no issues
				$("#jshint .table-container")
					.empty()
					.append("<p>No issues.</p>");
			}

		});
	}

	function _handleEnableJSHint() {
		if(jsHintEnabled) {
			jsHintEnabled = false;
			CommandManager.get(VIEW_HIDE_JSHINT).setChecked(false);
			$(DocumentManager).off("currentDocumentChange documentSaved", null,  _handleHint);
			//if visible, hide
			$jshint.hide();
			EditorManager.resizeEditor();

		} else {
			jsHintEnabled = true;
			CommandManager.get(VIEW_HIDE_JSHINT).setChecked(true);            
			$(DocumentManager).on("currentDocumentChange documentSaved", _handleHint);
			_handleHint();
		}
	}

	CommandManager.register("Enable JSHint", VIEW_HIDE_JSHINT, _handleEnableJSHint);

	function init() {
		
		//add the HTML UI
		var content =          '  <div id="jshint" class="bottom-panel">'
							 + '  <div class="toolbar simple-toolbar-layout">'
							 + '    <div class="title">JSHint</div><a href="#" class="close">&times;</a>'
							 + '  </div>'
							 + '  <div class="table-container"/>'
							 + '</div>';

		$(content).insertBefore("#status-bar");

		$jshint = $("#jshint");

		$jshint.hide();
		
		var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
		menu.addMenuItem(VIEW_HIDE_JSHINT, "", Menus.AFTER);

		$('#jshint .close').click(function () {
			CommandManager.execute(VIEW_HIDE_JSHINT);
		});

		// AppInit.htmlReady() has already executed before extensions are loaded
		// so, for now, we need to call this ourself
		Resizer.makeResizable($('#jshint').get(0), "vert", "top", 200);

	}

	function showJSHintConfigError() {
		Dialogs.showModalDialog(
			Dialogs.DIALOG_ID_ERROR,
			"JSHINT error",
			"Unable to parse config file"
		);
	}
	
	FileUtils.readAsText(configFile)
	.done(function (text, readTimestamp) {

		//try to parse the config file
		try {
			config = JSON.parse(text);
		} catch (e) {
			console.log("Can't parse config file - " + e);
			showJSHintConfigError();
		}
	})
	.fail(function (error) {
		showJSHintConfigError();
	})
	.then(init);
	
});
