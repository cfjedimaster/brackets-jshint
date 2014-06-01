/*
 * Copyright (c) 2012 Raymond Camden
 *
 * See the file LICENSE for copying permission.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, JSHINT*/
define(function (require, exports, module) {
    "use strict";

    var CodeInspection          = brackets.getModule("language/CodeInspection"),
        FileSystem              = brackets.getModule("filesystem/FileSystem"),
        FileUtils               = brackets.getModule("file/FileUtils"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        defaultConfig = {
            "options": {"undef": true},
            "globals": {}
        };

    require("jshint/jshint");

    /**
     * @private
     * @type {string}
     */
    var _configFileName = ".jshintrc";

    /**
     * Synchronous linting entry point.
     *
     * @param {string} text File contents.
     * @param {string} fullPath Absolute path to the file.
     * @param {object} config  JSHint configuration object.
     *
     * @return {object} Results of code inspection.
     */
    function handleHinter(text, fullPath, config) {
        
        // make sure that synchronous linter does not break
        if (!config) {
            config = defaultConfig;
        }
        
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
                        pos: {line: messageOb.line - 1, ch: messageOb.character - 1},
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
     * Asynchronous linting entry point.
     *
     * @param {string} text File contents.
     * @param {string} fullPath Absolute path to the file.
     * 
     * @return {$.Promise} Promise to return results of code inspection.
     */
    function handleHinterAsync(text, fullPath) {
        var deferred = new $.Deferred();
        _loadConfig(fullPath)
            .done(function (cfg) {
                deferred.resolve(handleHinter(text, fullPath, cfg));
            });
        return deferred.promise();
    }
    
    /**
     * Reads configuration file in the specified directory. Returns a promise for configuration object.
     *
     * @param {string} dir absolute path to a directory.
     * @param {string} configFileName name of the configuration file (optional)
     *
     * @returns {$.Promise} a promise to return configuration object.
     */
    function _readConfig(dir, configFileName) {
        var result = new $.Deferred(),
            file;
        configFileName = configFileName || _configFileName;
        file = FileSystem.getFileForPath(dir + configFileName);
        file.read(function (err, content) {
            if (!err) {
                var cfg = {},
                    config;
                try {
                    config = JSON.parse(removeComments(content));
                } catch (e) {
                    console.error("JSHint: error parsing " + file.fullPath + ". Details: " + e);
                    result.reject(e);
                    return;
                }
                // Load any base config defined by "extends".
                // The same functionality as in
                // jslints -> cli.js -> loadConfig -> if (config['extends'])...
                var baseConfigResult = $.Deferred();
                if (config.extends) {
                    var baseConfigResult = _readConfig(dir, config.extends);
                    delete config.extends;
                }
                else {
                    baseConfigResult.resolve({});
                }
                baseConfigResult.done( function (baseConfig) {
                    cfg.globals = $.extend({}, baseConfig.globals, config.globals);
                    if (config.globals) { delete config.globals; }
                    cfg.options = $.extend({}, baseConfig.options, config);
                    result.resolve(cfg);
                }).fail(function (e) {
                    result.reject(e);
                });
            } else {
                result.reject(err);
            }
        });
        return result.promise();
    }
    
    /**
     * Looks up the configuration file in the filesystem hierarchy and loads it.
     *
     * @param {string} dir Relative path to directory to start with.
     * @param {function} proc Function to read and load configuration file.
     *
     * @returns {$.Promise} A promise for configuration.
     */
    function _lookupAndLoad(root, dir, readConfig) {
        var deferred = new $.Deferred(),
            done = false,
            cdir = dir,
            file,
            iter = {
                next: function () {
                    if (done) {
                        return;
                    }
                    readConfig(root + cdir)
                        .then(function (cfg) {
                            this.stop(cfg);
                        }.bind(this))
                        .fail(function () {
                            if (!cdir) {
                                this.stop(defaultConfig);
                            }
                            if (!done) {
                                cdir = FileUtils.getDirectoryPath(cdir.substring(0, cdir.length - 1));
                                this.next();
                            }
                        }.bind(this));
                },
                stop: function (cfg) {
                    deferred.resolve(cfg);
                    done = true;
                }
            };
        if (cdir === undefined || cdir === null) {
            deferred.resolve(defaultConfig);
        } else {
            iter.next();
        }
        return deferred.promise();
    }

    /**
     * Loads JSHint configuration for the specified file.
     *
     * The configuration file should have name .jshintrc. If the specified file is outside the
     * current project root, then defaultConfiguration is used. Otherwise, the configuration file
     * is looked up starting from the directory where the specified file is located, going up to
     * the project root, but no further.
     *
     * @param {string} fullPath Absolute path for the file linted.
     *
     * @return {$.Promise} Promise to return JSHint configuration object.
     *
     * @see <a href="http://www.jshint.com/docs/options/">JSHint option
     * reference</a>.
     */
    function _loadConfig(fullPath) {

        var projectRootEntry = ProjectManager.getProjectRoot(),
            result = new $.Deferred(),
            relPath,
            file,
            config;

        if (!projectRootEntry) {
            return result.reject().promise();
        }
        
        // for files outside the project root, use default config
        if (!(relPath = FileUtils.getRelativeFilename(projectRootEntry.fullPath, fullPath))) {
            result.resolve(defaultConfig);
            return result.promise();
        }

        relPath = FileUtils.getDirectoryPath(relPath);
        
        _lookupAndLoad(projectRootEntry.fullPath, relPath, _readConfig)
            .done(function (cfg) {
                result.resolve(cfg);
            });        
        return result.promise();
    }

    /**
     * Removes JavaScript comments from a string by replacing
     * everything between block comments and everything after
     * single-line comments in a non-greedy way.
     *
     * English version of the regex:
     *   match '/*'
     *   then match zero or more instances of any character (incl. \n)
     *   except for instances of '* /' (without a space, obv.)
     *   then match '* /' (again, without a space)
     *
     * @param {string} str a string with potential JavaScript comments.
     * @returns {string} a string without JavaScript comments.
     */
    function removeComments(str) {
        str = str || "";

        str = str.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\//g, "");
        str = str.replace(/\/\/[^\n\r]*/g, ""); // Everything after '//'

        return str;
    }

    CodeInspection.register("javascript", {
        name: "JSHint",
        scanFile: handleHinter,
        scanFileAsync: handleHinterAsync
    });
    
});
