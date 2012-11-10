/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT */

define(function (require, exports, module) {
    'use strict';

    var Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        Menus                   = brackets.getModule("command/Menus"),
        NativeFileSystem		= brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils				= brackets.getModule("file/FileUtils"),
        Dialogs					= brackets.getModule("widgets/Dialogs"),

        //current module's directory
        moduleDir				= FileUtils.getNativeModuleDirectoryPath(module),
        configFile				= new NativeFileSystem.FileEntry(moduleDir + '/config.js'),
        config					= { options: {}, globals: {} };

    require("jshint/jshint");
    
    //commands
    var VIEW_HIDE_JSHINT = "jshint.run";
    
    function _handleHint() {
        var messages, result;
        
        var editor = EditorManager.getCurrentFullEditor();
        if (!editor) {
            _handleShowJSHint();
            return;
        }
        var text = editor.document.getText();
        
        result = JSHINT(text, config.options, config.globals);
                
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
        
    }

    function _handleShowJSHint() {
        var $jshint = $("#jshint");
        
        if ($jshint.css("display") === "none") {
            $jshint.show();
            CommandManager.get(VIEW_HIDE_JSHINT).setChecked(true);
            _handleHint();
            $(DocumentManager).on("currentDocumentChange documentSaved", _handleHint);
        } else {
            $jshint.hide();
            CommandManager.get(VIEW_HIDE_JSHINT).setChecked(false);
            $(DocumentManager).off("currentDocumentChange documentSaved", null,  _handleHint);
        }
        EditorManager.resizeEditor();

    }
    
    CommandManager.register("Enable JSHint", VIEW_HIDE_JSHINT, _handleShowJSHint);

    function init() {
        
        //add the HTML UI
        $('.content').append('  <div id="jshint" class="bottom-panel">'
                             + '  <div class="toolbar simple-toolbar-layout">'
                             + '    <div class="title">JSHint</div><a href="#" class="close">&times;</a>'
                             + '  </div>'
                             + '  <div class="table-container"/>'
                             + '</div>');
        $('#csslint').hide();
        
        var menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
        menu.addMenuItem(VIEW_HIDE_JSHINT, "", Menus.AFTER, "menu-view-sidebar");

        $('#jshint .close').click(function () {
            CommandManager.execute(VIEW_HIDE_JSHINT);
        });

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
