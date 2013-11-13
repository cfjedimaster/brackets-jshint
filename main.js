/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT*/
define(function (require, exports, module) {
    "use strict";

    var AppInit                 = brackets.getModule("utils/AppInit"),
        CodeInspection          = brackets.getModule("language/CodeInspection"),
        FileSystem              = brackets.getModule("filesystem/FileSystem"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        defaultConfig = {
            "options": {"undef": true},
            "globals": {}
        },
        config = defaultConfig;

    require("jshint/jshint");
  
    /**
     * @private
     * @type {string}
     */
    var _configFileName = ".jshintrc";

    function handleHinter(text,fullPath) {
        var resultJH = JSHINT(text, config.options, config.globals);

        if (!resultJH) {
            var errors = JSHINT.errors;

            var result = { errors: [] };
            for(var i=0, len=errors.length; i<len; i++) {
                var messageOb = errors[i];
                //encountered an issue when jshint returned a null err
                if(!messageOb) continue;
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

    /**
     * Loads project-wide JSHint configuration.
     *
     * JSHint project file should be located at <Project Root>/.jshintrc. It
     * is loaded each time project is changed or the configuration file is
     * modified.
     * 
     * @return Promise to return JSHint configuration object.
     *
     * @see <a href="http://www.jshint.com/docs/options/">JSHint option
     * reference</a>.
     */
    function _loadProjectConfig() {

        var projectRootEntry = ProjectManager.getProjectRoot(),
            result = new $.Deferred(),
            file,
            config;

        file = FileSystem.getFileForPath(projectRootEntry.fullPath + _configFileName);
        file.read(function (err, content) {
            if (!err) {
                var cfg = {};
                try {
                    config = JSON.parse(content);
                } catch (e) {
                    console.error("JSHint: error parsing " + file.fullPath + ". Details: " + e);
                    result.reject(e);
                    return;
                }
                cfg.globals = config.globals || {};
                if ( config.globals ) { delete config.globals; }
                cfg.options = config;
                result.resolve(cfg);
            } else {
                result.reject(err);
            }
        });
        return result.promise();
    }
    
    /**
     * Attempts to load project configuration file.
     */
    function tryLoadConfig() {
        /**
         * Makes sure JSHint is re-ran when the config is reloaded
         * 
         * This is a workaround due to some loading issues in Sprint 31. 
         * See bug for details: https://github.com/adobe/brackets/issues/5442
         */
        function _refreshCodeInspection() {
            CodeInspection.toggleEnabled();
            CodeInspection.toggleEnabled();
        }
        _loadProjectConfig()
            .done(function (newConfig) {
                config = newConfig;
            })
            .fail(function () {
                config = defaultConfig;
            })
            .always(function () {
                _refreshCodeInspection();
            });
    }

    AppInit.appReady(function () {

        CodeInspection.register("javascript", {
            name: "JSHint",
            scanFile: handleHinter
        });

        $(DocumentManager)
            .on("documentSaved.jshint documentRefreshed.jshint", function (e, document) {
                // if this project's JSHint config has been updated, reload
                if (document.file.fullPath ===
                            ProjectManager.getProjectRoot().fullPath + _configFileName) {
                    tryLoadConfig();
                }
            });
        
        $(ProjectManager)
            .on("projectOpen.jshint", function () {
                tryLoadConfig();
            });
        
        tryLoadConfig();
        
    });

});
