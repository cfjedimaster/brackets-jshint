/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT */

define(function (require, exports, module) {
    'use strict';

    var Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        Menus                   = brackets.getModule("command/Menus");

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
        
        result = JSHINT(text);
                
        if (!result) {
            var errors = JSHINT.errors;

            var $jshintTable = $("<table class='zebra-striped condensed-table'>").append("<tbody>");
            $("<tr><th>Line</th><th>Declaration</th><th>Message</th></tr>").appendTo($jshintTable);
            
            var $selectedRow;
            
            errors.forEach(function (item) {
                var makeCell = function (content) {
                    return $("<td/>").text(content);
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
    
    init();
    
});