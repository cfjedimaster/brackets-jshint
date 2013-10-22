/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, JSHINT*/
define(function (require, exports, module) {
    "use strict";

    var AppInit         = brackets.getModule("utils/AppInit"),
        CodeInspection  = brackets.getModule("language/CodeInspection"),
        FileEntry       = brackets.getModule("file/NativeFileSystem").NativeFileSystem.FileEntry,
        FileUtils       = brackets.getModule("file/FileUtils"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        defaultConfig = {
            "options": {"undef":true},
            "globals": {}
        },
        config = defaultConfig;

    require("jshint/jshint");

    function loadJsHintOptions() {
        var projectRootDir = ProjectManager.getProjectRoot().fullPath;
        FileUtils.readAsText(new FileEntry(projectRootDir + "/.jshintrc")).done(function (content) {
            config = JSON.parse(content);
        }).fail(function () {
            config = defaultConfig;
        });
    }

    function handleHinter(text/*, fullPath*/) {
        var resultJH = JSHINT(text, config.options, config.globals);

        if (!resultJH) {
            var errors = JSHINT.errors;

            var result = { errors: [] };
            for(var i=0, len=errors.length; i<len; i++) {
                var messageOb = errors[i];
                //encountered an issue when jshint returned a null err
                if (!messageOb) { continue; }
                //default
                var type = CodeInspection.Type.ERROR;

                if("type" in messageOb) {
                    if(messageOb.type === "error") {
                        type = CodeInspection.Type.ERROR;
                    } else if(messageOb.type === "warning") {
                        type = CodeInspection.Type.WARNING;
                    }
                }

                result.errors.push({
                    pos: {line:messageOb.line-1, ch:messageOb.character},
                    message:messageOb.reason,
                    type:type
                });
            }
            return result;
        } else {
            return null;
        }
    }

    CodeInspection.register("javascript", {
        name: "JSHint",
        scanFile: handleHinter
    });

    AppInit.appReady(function () {
        //- projectOpen won't execute on Brackets startup
        loadJsHintOptions();
        //- every project might have different jshintrc file or none at all, so reload
        $(ProjectManager).on("projectOpen", function () {
            loadJsHintOptions();
        });

        /*
        CodeInspection.register("javascript", {
            name: "JSHint",
            scanFile: handleHinter
        });
        //This is a workaround due to some loading issues in Sprint 31. 
        //See bug for details: https://github.com/adobe/brackets/issues/5442
        CodeInspection.toggleEnabled();
        CodeInspection.toggleEnabled();
        */
    });
});
