/*
 * Copyright (c) 2012 Raymond Camden
 *
 * See the file LICENSE for copying permission.
 */

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

    function handleHinter(text, fullPath) {
        var resultJH = JSHINT(text, config.options, config.globals);

        if (!resultJH) {
            var errors = JSHINT.errors,
                result = { errors: [] },
                i,
                len;

            for (i = 0, len = errors.length; i < len; i++) {
                var messageOb = errors[i],
                    //default
                    type = CodeInspection.Type.ERROR;

                // encountered an issue when jshint returned a null err
                if (messageOb) {
                    var message;
                    if (messageOb.type !== undefined) {
                        // default is ERROR, override only if it differs
                        if (messageOb.type === "warning") {
                            type = CodeInspection.Type.WARNING;
                        }
                    }

                    message = messageOb.reason;
                    if (messageOb.code) {
                        message += " (" + messageOb.code + ")";
                    }

                    result.errors.push({
                        pos: {line: messageOb.line - 1, ch: messageOb.character},
                        message: message,
                        type: type
                    });
                }
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
     * modified. If configuration is given in a package.json file, then it is
     * given priority. If neither exist, then a default configuration is used.
     *
     * @param callback Passed JSHint configuration object.
     *
     * @see <a href="http://www.jshint.com/docs/options/">JSHint option
     * reference</a>.
     */
    function _loadProjectConfig(callback) {
        var projectRootEntry = ProjectManager.getProjectRoot();

        var jshintrcFile = FileSystem.getFileForPath(projectRootEntry.fullPath + _configFileName);
        var packageFile = FileSystem.getFileForPath(projectRootEntry.fullPath + "package.json");

        /**
         * Attempt to read and then JSON parse a given file object.
         */
        function readAndParse(file, fileCb) {
            file.read(function (err, content) {
                if (err) {
                    return fileCb(err);
                }

                var config;

                try {
                    config = JSON.parse(content);
                } catch (e) {
                    console.error("JSHint: error parsing" + file.fullPath + ". Details: " + e);
                    return fileCb(e);
                }

                fileCb(null, config);
            });
        }

        /**
         * Move some fields around in the config object.
         *
         * @return Configuration object.
         */
        function distill(config) {
            var cfg = { globals: config.globals || {} };

            if (config.global) {
                delete config.globals;
            }

            cfg.options = config;

            return cfg;
        }

        // Try to read config from package.json first.
        readAndParse(packageFile, function (err, config) {
            if (!err && config.jshintConfig) {
                return callback(null, distill(config.jshintConfig));
            }

            // Try to read config from the .jshintrc file.
            readAndParse(jshintrcFile, function (err, config) {
                if (!err) {
                    return callback(null, distill(config));
                }

                // If neither files provide config, use the default configuration.
                callback(null, defaultConfig);
            });
        });
    }

    /**
     * Attempts to load project configuration file.
     */
    function tryLoadConfig() {
        /**
         * Makes sure JSHint is re-run when the config is reloaded.
         *
         * This is a workaround due to some loading issues in Sprint 31.
         * See bug for details: https://github.com/adobe/brackets/issues/5442
         */
        function _refreshCodeInspection() {
            CodeInspection.toggleEnabled();
            CodeInspection.toggleEnabled();
        }

        _loadProjectConfig(function (err, cfg) {
            // Here for convention.
            if (err) {
                return console.error(err);
            }

            config = cfg;

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
