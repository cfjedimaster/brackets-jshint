/*
 * Copyright (c) 2012 Raymond Camden
 *
 * See the file LICENSE for copying permission.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/* global define, brackets, $, JSHINT */
define(function (require, exports, module) {
    "use strict";

    var CodeInspection          = brackets.getModule("language/CodeInspection"),
        FileSystem              = brackets.getModule("filesystem/FileSystem"),
        FileUtils               = brackets.getModule("file/FileUtils"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
	    pm = PreferencesManager.getExtensionPrefs("jshint"),
		defaultConfig;

	pm.definePreference("options", "object", {"undef": true})
        .on("change", function () {
            defaultConfig.options = pm.get("options");
        });

	pm.definePreference("globals", "object", {})
        .on("change", function () {
            defaultConfig.globals = pm.get("globals");
        });

	defaultConfig = {
		"options": pm.get("options"),
		"globals": pm.get("globals")
	};

    require("jshint/jshint");

    var PREF_SCAN_PROJECT_ONLY = "scanProjectOnly",
        JSHINT_NAME = "JSHint";

    pm.definePreference(PREF_SCAN_PROJECT_ONLY, "boolean", false)
        .on("change", function () {
            var val = pm.get(PREF_SCAN_PROJECT_ONLY);
            if (_scanProjectOnly !== val) {
                _scanProjectOnly = val;
                CodeInspection.requestRun(JSHINT_NAME);
            }
        });

    /**
     * Extension preference which when set to true will limit the look up for configuration file
     * to the project sub-tree. If false, the entire file tree will be searched. The default is
     * false.
     * @private
     * @type {boolean}
     */
    var _scanProjectOnly = pm.get(PREF_SCAN_PROJECT_ONLY);

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
            config = {};
        }

        var resultJH = JSHINT(text,
							  deepExtend(true, defaultConfig.options, config.options),
							  deepExtend(true, defaultConfig.globals, config.globals));

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
            .then(_applyOverrides(fullPath))
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
        if (configFileName === "jshint.globals") {
            result.resolve(deepExtend(true, {}, defaultConfig));
        } else {
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
                        var extendFile = FileSystem.getFileForPath(dir + config.extends);
                        baseConfigResult = _readConfig(extendFile.parentPath, extendFile.name);
                        delete config.extends;
                    } else {
                        baseConfigResult.resolve({});
                    }
                    baseConfigResult.done(function (baseConfig) {
                        cfg.globals = deepExtend(true, baseConfig.globals, config.globals);
                        if (config.globals) { delete config.globals; }
                        cfg.options = deepExtend(true, baseConfig.options, config);
                        result.resolve(cfg);
                    }).fail(function (e) {
                        result.reject(e);
                    });

                } else {
                    result.reject(err);
                }
            });
        }
        return result.promise();
    }

    /**
     * Applies per-file overrides, if any were provided in the configuration.
     * Follows format supported in commit #df60b9c on JSHint repository:
     * https://github.com/jshint/jshint/commit/df60b9c75daa4321a4d064fcab04e14692c94039
     *
     * @param   {string} fullPath  absolute path to the processed file
     * @returns {Function}         function that returns a promise for configuration object with overrides applied
     */
    function _applyOverrides(fullPath) {

        var basePath = ProjectManager.getProjectRoot().fullPath,
            filePath = FileUtils.getRelativeFilename(basePath, fullPath);

        return function (cfg) {

            var bundle,
                has = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty),
                overrides = cfg.options.overrides,
                pattern;

            if (overrides) {
                delete cfg.options.overrides;

                for (pattern in overrides) {
                    if (has(overrides, pattern) && (new RegExp(pattern)).test(filePath)) {
                        bundle = overrides[pattern];

                        if (bundle.globals) {
                            deepExtend(true, cfg.globals, bundle.globals);
                            delete bundle.globals;
                        }
                        deepExtend(true, cfg.options, bundle);

                    }
                }
            }

            return cfg;
        };
    }

    /**
     * Looks up the configuration file in the filesystem hierarchy and loads it.
     *
     * @param   {String}    root       Path to the current project root.
     * @param   {string}    dir        Relative path to directory to start with.
     * @param   {function}  readConfig Function to read and load configuration file.
     *
     * @returns {$.Promise} A promise for configuration.
     */
    function _lookupAndLoad(root, dir, readConfig) {
        var deferred = new $.Deferred(),
            done = false,
            cdir = dir,
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
            rootPath;

        if (!projectRootEntry) {
            return result.reject().promise();
        }

        if (!_scanProjectOnly) {
            // scan entire filesystem
            rootPath = projectRootEntry.fullPath.substring(0, projectRootEntry.fullPath.indexOf("/") + 1);
        } else {
            rootPath = projectRootEntry.fullPath;
        }

        // for files outside the root, use default config
        if (!(relPath = FileUtils.getRelativeFilename(rootPath, fullPath))) {
            result.resolve(defaultConfig);
            return result.promise();
        }

        relPath = FileUtils.getDirectoryPath(relPath);

        _lookupAndLoad(rootPath, relPath, _readConfig)
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

    /**
     * jQuery's extend function, modified to merge arrays when they do not contain any object (only strings or numbers)
     * See here:
     * http://stackoverflow.com/questions/9399365/deep-extend-like-jquerys-for-nodejs
     *
     * @param   {object}   target the destination object or true to make deep copy
     * @param   {object}   successive arguments are the objects to be copied to target
     * @returns {Function} extended object
     */
    function deepExtend() {
        var options, name, src, copy, copyIsArray, clone, s, isMergeArrays, target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false,
            toString = Object.prototype.toString,
            hasOwn = Object.prototype.hasOwnProperty,
            class2type = {
                "[object Boolean]": "boolean",
                "[object Number]": "number",
                "[object String]": "string",
                "[object Function]": "function",
                "[object Array]": "array",
                "[object Date]": "date",
                "[object RegExp]": "regexp",
                "[object Object]": "object"
            },
            jQuery = {
                isFunction: function (obj) {
                    return jQuery.type(obj) === "function";
                },
                isArray: Array.isArray ||
                    function (obj) {
                        return jQuery.type(obj) === "array";
                    },
                type: function (obj) {
                    return obj === null ? String(obj) : class2type[toString.call(obj)] || "object";
                },
                isPlainObject: function (obj) {
                    if (!obj || jQuery.type(obj) !== "object" || obj.nodeType) {
                        return false;
                    }
                    try {
                        if (obj.constructor && !hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                            return false;
                        }
                    } catch (e) {
                        return false;
                    }
                    var key;
                    for (key in obj) {}
                    return key === undefined || hasOwn.call(obj, key);
                }
            };
        if (typeof target === "boolean") {
            deep = target;
            target = arguments[1] || {};
            i = 2;
        }
        if (typeof target !== "object" && !jQuery.isFunction(target)) {
            target = {};
        }
        if (length === i) {
          target = this;
          --i;
        }
        for (i; i < length; i++) {
            if ((options = arguments[i]) !== null) {
                for (name in options) {
                    if (hasOwn.call(options, name)) {
                        src = target[name];
                        copy = options[name];
                        if (target === copy) {
                            continue;
                        }
                        if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                            isMergeArrays = true;
                            for (s in src) {
                                if (jQuery.isArray(src[s]) || jQuery.isPlainObject(src[s]) || jQuery.isFunction(src[s])) {
                                    isMergeArrays = false;
                                    break;
                                }
                            }
                            if (copyIsArray && isMergeArrays) {
                                clone = src && jQuery.isArray(src) ? src : [];
                                clone = clone.concat(copy);
                                target[name] = arrayUnique(clone);
                                continue;

                            } else if (copyIsArray) {
                                copyIsArray = false;
                                clone = src && jQuery.isArray(src) ? src : [];
                            } else {
                                clone = src && jQuery.isPlainObject(src) ? src : {};
                            }
                            // WARNING: RECURSION
                            target[name] = deepExtend(deep, clone, copy);
                        } else if (copy !== undefined) {
                            target[name] = copy;
                        }
                    }
                }
            }
        }
        return target;
    }

    /**
     * Eliminate duplicate elements from array
     *
     * @param   {array} array the array to be cleaned
     * @returns {array} de-duplicated array
     */
    function arrayUnique(array) {
        var i, j, a = array.concat();
        for (i = 0; i < a.length; i += 1) {
            for (j = i + 1; j < a.length; j += 1) {
                if (a[i] === a[j]) {
                    a.splice(j, 1);
                    j += 1;
                }
            }
        }
        return a;
    }

    CodeInspection.register("javascript", {
        name: JSHINT_NAME,
        scanFile: handleHinter,
        scanFileAsync: handleHinterAsync
    });

});
