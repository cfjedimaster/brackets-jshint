/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT*/
define(function (require, exports, module) {
    "use strict";

    var commands = brackets.getModule("command/Commands"),
        FileUtils = brackets.getModule("file/FileUtils"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        AppInit = brackets.getModule("utils/AppInit"),
        CodeInspection          = brackets.getModule("language/CodeInspection"),
        config = {
            "options": {"undef":true},
            "globals": {}
        };


    require("jshint/jshint");
    
    function handleHinter(text,fullPath) {
        var resultJH = JSHINT(text, config.options, config.globals);

        if (!resultJH) {
            var errors = JSHINT.errors;

            var result = { errors: [] };

            for(var i=0, len=errors.length; i<len; i++) {
                var messageOb = errors[i];
                //default
                var type = CodeInspection.Type.WARNING;

                if(messageOb.type === "error") {
                    type = CodeInspection.Type.ERROR;
                } else if(messageOb.type === "warning") {
                    type = CodeInspection.Type.WARNING;
                }

                result.errors.push({
                    pos: {line:messageOb.line, ch:messageOb.character},
                    message:messageOb.reason,
                    type:type
                });
            }
            return result;
        } else {
            return null;
        }


    }


    AppInit.appReady(function () {

        CodeInspection.register("javascript", {
            name: "JSHint",
            scanFile: handleHinter
        });

    });

});