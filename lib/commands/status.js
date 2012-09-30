
var PATH = require("path");
var FS = require("fs");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var Q = require("sourcemint-util-js/lib/q");
var WAIT_FOR = require("sourcemint-util-js/lib/wait-for");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var EVENTS = require("events");

var PROGRAM = require("sourcemint-pinf-js/lib/program");

var DESCRIPTORS = require("sourcemint-pinf-js/lib/descriptors");
var PACKAGES = require("sourcemint-pinf-js/lib/packages");
var SM_PM = require("sourcemint-pm-sm/lib/pm");
var URI_PARSER = require("sourcemint-pm-sm/lib/uri-parser");


var command = exports["status"] = new ARGS_PARSER();

command.help("Check package/program status.");
command.arg(".../[package.json|program.json]").optional();
command.option("-a", "--all").bool().help("Show transitive dependencies (dependencies of dependencies).");
command.option("-n", "--now").bool().help("Aggressively fetch latest remote info.");
command.option("-d", "--dev").bool().help("Include dev dependencies");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    options.latest = options.now;

    var time = 5;

    // TODO: Move status logic into `sourcemint-pm-sm` package and only keep printing stuff here.

    SM_PM.forProgramPath(basePath).then(function(pm) {

        return exports.getStatusTree(pm, options).then(function(statusTree) {

            return statusTree.refreshStatus(options).then(function() {

                var hasErrors = false;
                var unsynced = false;

                TERM.stdout.writenl("");

                return statusTree.forEachNode(function(node) {

                    var pkgInfo = node.legacy[0];
                    var context = node.legacy[1];

                    if (context.level >= 2 && options.all !== true) {
                        return false;
                    }
                    
                    var padding = "";
                    for (var i=0 ; i<context.level ; i++) padding += "    ";

                    var names = UTIL.unique(pkgInfo[2]);
                    
                    var summary = [];
                    var ok = true;
                    var foundInParent = false;
                    var notInstalled = false;
                    var mappingsUriInfo = false;

                    if (pkgInfo[1].indexOf("devDependencies") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0) {
                        summary.push("\0yellow(" + (node.name || "(Package)") + " @ " + ((node.status.descriptor && node.status.descriptor.version) || "->") + "\0)");
                    } else {
                        summary.push("\0yellow(\0bold(" + (node.name || "(Package)") + "\0) @ " + ((node.status.descriptor && node.status.descriptor.version) || "->") + "\0)");
                    }

                    if (names.length > 1) {
                        ok = false;
                        summary.push("\0red([\0bold(also mapped to alias '" + pkgInfo[2].join("' and '") + "'\0)]\0)");
                    }
                    else if ((pkgInfo[1].indexOf("mappings") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0) && (pkgInfo[1].indexOf("dependencies") >= 0 || pkgInfo[1].indexOf("devDependencies") >= 0)) {
                        ok = false;
                        summary.push("\0red([\0bold(defined in 'mappings' or 'devMappings' and 'dependencies' or 'devDependencies'\0)]\0)");
                    }
                    else if (pkgInfo[1].indexOf("dependencies") >= 0 && pkgInfo[1].indexOf("devDependencies") >= 0) {
                        ok = false;
                        summary.push("\0red([\0bold(defined in both 'dependencies' and 'devDependencies'\0)]\0)");
                    }
                    else if (pkgInfo[1].indexOf("mappings") >= 0 && pkgInfo[1].indexOf("devMappings") >= 0) {
                        ok = false;
                        summary.push("\0red([\0bold(defined in both 'mappings' and 'devMappings'\0)]\0)");
                    }
                    else if (pkgInfo[1].indexOf("mappings") >= 0 && (pkgInfo[1].indexOf("mapped_packages/") === -1 && pkgInfo[1].indexOf("node_modules/") === -1)) {
                        // mapping value of '.'
                        if (node.status.descriptor.mappings[pkgInfo[2][0]] !== ".") {
                            ok = false;
                            notInstalled = true;
                            summary.push("\0red([\0bold(defined in 'mappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                        }
                    }
                    else if (pkgInfo[1].indexOf("devMappings") >= 0 && (pkgInfo[1].indexOf("mapped_packages/") === -1 && pkgInfo[1].indexOf("node_modules/") === -1)) {
                        ok = false;
                        notInstalled = true;
                        summary.push("\0red([\0bold(defined in 'devMappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                    }                

                    var gitInfo = node.status.git;

                    var packageSourceStatus = {};
                    var sourceUriInfo = false;
                    if (PATH.existsSync(PATH.join(pkgInfo[0].path, ".sourcemint", "source.json"))) {
                        packageSourceStatus = JSON.parse(FS.readFileSync(PATH.join(pkgInfo[0].path, ".sourcemint", "source.json")));
                        sourceUriInfo = URI_PARSER.parse(packageSourceStatus.url);
                    }

                    if (ok && node.parent) {

                        if (node.parent.status.descriptor.mappings && 
                            node.parent.status.descriptor.mappings[pkgInfo[2][0]] &&
                            UTIL.isArrayLike(node.parent.status.descriptor.mappings[pkgInfo[2][0]])) {
                            mappingsUriInfo = URI_PARSER.parse(node.parent.status.descriptor.mappings[pkgInfo[2][0]][1]);
                        } else
                        if (node.parent.status.descriptor.devMappings && 
                            node.parent.status.descriptor.devMappings[pkgInfo[2][0]] &&
                            UTIL.isArrayLike(node.parent.status.descriptor.devMappings[pkgInfo[2][0]])) {
                            mappingsUriInfo = URI_PARSER.parse(node.parent.status.descriptor.devMappings[pkgInfo[2][0]][1]);
                        }
                        
                        function formatProperty() {
                            if (pkgInfo[1].indexOf("dependencies") >= 0) {
                                return "d";
                            }
                            else if (pkgInfo[1].indexOf("devDependencies") >= 0) {
                                return "dd";
                            }
                            else if (pkgInfo[1].indexOf("bundleDependencies") >= 0) {
                                return "bd";
                            }
                            else if (pkgInfo[1].indexOf("mappings") >= 0) {
                                return "m";
                            }
                            else if (pkgInfo[1].indexOf("devMappings") >= 0) {
                                return "dm";
                            }
                        }
                        if (pkgInfo[1].indexOf("node_modules/") >= 0) {
                            if (pkgInfo[1].indexOf("dependencies") >= 0 || pkgInfo[1].indexOf("devDependencies") >= 0 || pkgInfo[1].indexOf("bundleDependencies") >= 0) {
                                summary.push("\0green([" + formatProperty() + ": node_modules/]\0)");
                            } else if (pkgInfo[1].indexOf("mappings") === -1 && pkgInfo[1].indexOf("devMappings") === -1) {
                                ok = false;
                                notInstalled = true;
                                summary.push("\0red([\0bold(found in 'node_modules/' but not defined in 'dependencies', 'devDependencies', 'mappings' nor 'devMappings'\0)]\0)");
                            }
                        } else
                        if (pkgInfo[1].indexOf("dependencies") >= 0 || pkgInfo[1].indexOf("devDependencies") >= 0) {
                            function findInParent(pkg, level) {
                                if (pkg.children["node_modules/"][pkgInfo[2][0]] === pkgInfo[0].path) {
                                    foundInParent = true;
                                    var dirs = "";
                                    for (var i=0 ; i<=level ; i++) dirs += "../../";
                                    summary.push("\0green([" + formatProperty() + ": " + dirs + "node_modules/]\0)");
                                } else
                                if (pkg.parent) {
                                    findInParent(pkg.parent, level + 1);
                                }
                            }
                            findInParent(pkgInfo[0].parent, 0);
                            if (!foundInParent) {
                                if (pkgInfo[1].indexOf("dependencies") >= 0) {
                                    ok = false;
                                    notInstalled = true;
                                    summary.push("\0red([\0bold(defined in 'dependencies' but not installed in 'node_modules/'\0)]\0)");
                                }
                                else if (pkgInfo[1].indexOf("devDependencies") >= 0) {
                                    ok = false;
                                    notInstalled = true;
                                    summary.push("\0red([\0bold(defined in 'devDependencies' but not installed in 'node_modules/'\0)]\0)");
                                }
                            }
                        }
                        if (pkgInfo[1].indexOf("mapped_packages/") >= 0) {
                            if (pkgInfo[1].indexOf("mappings") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0) {
                                summary.push("\0green([" + formatProperty() + ": mapped_packages/]\0)");
                            }
                            else if (pkgInfo[1].indexOf("mappings") === -1 && pkgInfo[1].indexOf("devMappings") === -1) {
                                ok = false;
                                summary.push("\0red([\0bold(found in 'mapped_packages/' but not defined in 'mappings' nor 'devMappings'\0)]\0)");
                            }
                        }
                        if (mappingsUriInfo && mappingsUriInfo.vendor) {
                            if (gitInfo && gitInfo.rev != mappingsUriInfo.vendor.rev) {
                                summary.push("\0red([mapping: " + mappingsUriInfo.vendor.rev + " != " + gitInfo.rev + "(git)]\0)");
                            } else
                            if (sourceUriInfo && sourceUriInfo.vendor && sourceUriInfo.vendor.rev !== mappingsUriInfo.vendor.rev) {
                                summary.push("\0red([mapping: " + mappingsUriInfo.vendor.rev + " != " + sourceUriInfo.vendor.rev + "(installed)]\0)");
                            } else {
                                summary.push("\0green([mapping: " + mappingsUriInfo.vendor.rev + "]\0)");
                            }
                        }
                    }                    
                    
                    if (gitInfo) {
                        function formatBranch() {
                            return ((gitInfo.branch !== "master" && (!mappingsUriInfo || !mappingsUriInfo.vendor || gitInfo.rev != mappingsUriInfo.vendor.rev))?("\0orange(" + gitInfo.branch + "\0)"):gitInfo.branch);
                        }
                        function formatTag() {
                            return ((gitInfo.tagged)?" "+gitInfo.tagged:"");
                        }
                        if (gitInfo.dirty) {
                            ok = false;
                            summary.push("\0red([git: " + formatBranch() + " \0bold(dirty\0)]\0)");
                        } else
                        if (gitInfo.behind) {
                            ok = false;
                            summary.push("\0red([git: " + formatBranch() + " \0bold(behind\0)]\0)");
                        } else
                        if (gitInfo.remoteAhead) {
                            if (context.level === 0) {
                                unsynced = true;
                                summary.push("\0magenta([git: " + formatBranch() + " \0bold(unpushed\0)]\0)");
                            } else {
                                ok = false;
                                summary.push("\0red([git: " + formatBranch() + " \0bold(unpushed\0)]\0)");
                            }
                        } else
                        if (gitInfo.branch) {
                            summary.push("\0green([git: " + formatBranch() + formatTag() + "]\0)");
                        }
                    }

                    var npmStatusInfo = false;

                    var npmInfo = node.status.npm || {};

                    npmStatusInfo = npmInfo;

                    if (node.status.descriptor && node.status.descriptor.private === true) {
                        summary.push("\0green([private]\0)");
                    } else
                    if (npmInfo.published) {

                        if (gitInfo && !gitInfo.tagged && context.circular !== true) {
                            if (!npmInfo.versionSelector || npmInfo.versionSelector.indexOf(gitInfo.rev) === -1) {
                                summary.push("\0magenta( -(" + gitInfo.rev + ")>\0)");
                            }
                        }

                        var redColor = (foundInParent)?"orange":"red";
                        if (!npmInfo.versionSelector && (pkgInfo[1].indexOf("mappings") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0)) {
                            npmInfo.versionSelector = "<-";
                            redColor = "magenta";
                        }
                        if (npmInfo.usingLatestSatisfying) {
                            if (npmInfo.usingLatest) {
                                summary.push("\0green([npm(" + npmInfo.versionSelector + "): " + npmInfo.actualVersion + "]\0)");
                            } else {
                                unsynced = true;
                                summary.push("\0green([npm(" + npmInfo.versionSelector + "): \0magenta(new " + npmInfo.latestVersion + "\0)]\0)");
                            }
                        } else if (npmInfo.versionSelector === "<-") {
                            if (npmInfo.usingLatest) {
                                summary.push("\0green([npm: " + npmInfo.latestVersion + "]\0)");
                            } else {
                                unsynced = true;
                                summary.push("\0magenta([npm: " + npmInfo.latestVersion + "]\0)");
                            }
                        } else if (npmInfo.versionSelector) {
                            if (gitInfo && npmInfo.versionSelector.indexOf(gitInfo.rev) >=0) {
                                summary.push("\0green([npm: " + npmInfo.versionSelector + "]\0)");
                            } else
                            if (npmInfo.usingLatest && typeof npmInfo.latestSatisfyingVersion === "undefined") {
                                if (node.status.descriptor._from === (node.name + "@" + npmInfo.versionSelector)) {
                                    summary.push("\0green([npm(" + npmInfo.versionSelector + ")]\0)");
                                } else {
                                    ok = false;
                                    summary.push("\0red([npm(" + npmInfo.versionSelector + ")]\0)");
                                }
                            } else
                            if (npmInfo.usingLatest) {
                                ok = (redColor==="red")?false:ok;
                                summary.push("\0" + redColor + "([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                            } else
                            if (npmInfo.latestSatisfyingVersion != npmInfo.latestVersion) {
                                ok = (redColor==="red")?false:ok;
                                summary.push("\0" + redColor + "([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0) \0magenta(new " + npmInfo.latestVersion + "\0)]\0)");
                            } else
                            if (foundInParent) {
                                unsynced = true;
                                summary.push("\0green([npm(" + npmInfo.versionSelector + "): \0magenta(new " + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                            } else {
                                ok = (redColor==="red")?false:ok;
                                summary.push("\0" + redColor + "([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                            }
                        } else if (!npmInfo.usingLatest) {
                            unsynced = true;
                            summary.push("\0magenta([npm: " + npmInfo.latestVersion + "]\0)");
                        } else {
                            summary.push("\0green([npm: " + npmInfo.latestVersion + "]\0)");
                        }
                    }
                    else if (pkgInfo[1].indexOf("mappings") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0  && node.status.descriptor.pm !== "npm") {
                        // Package is mapped. So we don't mark NPM red if unpublished.
                    } else if (!notInstalled) {
                        ok = false;
                        summary.push("\0red([npm: \0bold(UNPUBLISHED\0)]\0)");
                    }

                    function formatPath() {
                        var path = pkgInfo[0].path;
                        if (path.substring(0, pm.context.program.package.path.length) === pm.context.program.package.path) {
                            var segments = path.substring(pm.context.program.package.path.length + 1).split("/");
                            if (segments[0] === "node_modules" || segments[0] === "mapped_packages") {
                                path = "\0blue(" + segments.slice(1).join("/") + "\0)";
                            } else {
                                path = pm.context.program.package.path + "/" + " \0blue(" + segments.join("/") + "\0)";
                            }
                        }
                        path = path.replace(/\/node_modules\//g, "\0bold(/node_modules/\0)").
                                    replace(/\/mapped_packages\//g, "\0bold(/mapped_packages/\0)");
                        return path;
                    }

                    function formatAge() {
                        if (!npmStatusInfo.published) {
                            return "  ";
                        }
                        if (typeof npmStatusInfo.latestVersionAge !== "undefined") {
                            if (typeof npmStatusInfo.actualVersionAge !== "undefined" && npmStatusInfo.actualVersionAge != npmStatusInfo.latestVersionAge) {
                                return "  \0magenta(" + npmStatusInfo.latestVersionAge + "<-" + npmStatusInfo.actualVersionAge + "\0)";
                            } else {
                                return "  " + npmStatusInfo.latestVersionAge;
                            }
                        }
                        return "  ?";
                    }

                    function formatLink() {
                        function repositoryFromDescriptor(descriptor) {
                            var repositories = descriptor.repository;
                            if (!repositories) {
                                repositories = descriptor.repositories;
                            } else {
                                repositories = [ repositories ];
                            }
                            var url = false;
                            if (repositories) {
                                var repository = repositories[0];
                                var url = false;
                                if (typeof repository === "string") {
                                    url = repository;
                                } else if(repository.url) {
                                    url = repository.url;
                                }
                            }
                            if (!url && node.status.descriptor.homepage) {
                                url = node.status.descriptor.homepage;
                            }
                            return url;
                        }
                        if (!node.status.descriptor) return "";
                        var url = repositoryFromDescriptor(node.status.descriptor);
                        if (!url && node.status.npm && node.status.npm.descriptor) {
                            url = repositoryFromDescriptor({
                                json: node.status.npm.descriptor
                            });
                        }
                        if (!url) return "";
                        return "( \0yellow(" + url + "\0) )";
                    }
                    function formatWritable() {                            
                        padding += " ";
                        if (gitInfo) {
                            if (gitInfo.writable === true) {
                                return " \0cyan(W\0) " + padding.substring(3);
                            } else {
                                return " \0cyan(R\0) " + padding.substring(3);
                            }
                        } else {
                            return padding;
                        }
                    }

                    if (context.circular && !ok) {
                        // Remove error info as it was already printed once (circular) so errors for a package only show up once.
                        summary = summary.slice(0, 1).concat(["\0red([^]\0)"]);
                    }
                    if (notInstalled) {
                        summary = summary.slice(0, 2);
                    }

                    if (foundInParent) {
                        // In parent package.
                        TERM.stdout.writenl(formatWritable() + summary.join(" ") + "  \0white(<-  " + formatPath() + "\0)" + formatAge() + formatLink());
                    } else
                    if (!node.parent || pkgInfo[0].path.substring(0, node.parent.path.length) === node.parent.path) {
                        // In package dependency tree.
                        TERM.stdout.writenl(formatWritable() + summary.join(" ") + "  \0white(->  " + formatPath() + "\0)" + formatAge() + formatLink());
                    } else
                    if (notInstalled) {
                        TERM.stdout.writenl(formatWritable() + summary.join(" ") + "  \0red(->  " + formatPath() + "\0)" + formatAge() + formatLink());
                    } else {
                        // Linked package.
                        TERM.stdout.writenl(formatWritable() + summary.join(" ") + "  \0cyan(<-  " + formatPath() + "\0)" + formatAge() + formatLink());
                    }

                    if (!ok) {
                        hasErrors = true;
                    }

                    if (!/^sourcemint-|^sm$/.test(pm.context.program.package.descriptor.json.name) && /^sourcemint-/.test(names[0])) {
                        TERM.stdout.writenl(padding + "    " + "\0yellow([skip]\0)");
                        return false;
                    }

                    if (node.name === "npm") {
                        TERM.stdout.writenl(padding + "    " + "\0yellow([skip]\0)");
                        return false;
                    }

                    if (notInstalled) {
                        return false;
                    }
                    
                    return true;

                }).then(function() {
                    if (hasErrors) {
                        TERM.stdout.writenl("");
                        TERM.stdout.writenl("  \0red(Solve \0bold(RED\0) states to bring package/program to a publishable state.\0)");
                        TERM.stdout.writenl("");
                        CLI.failAndExit(true);
                    } else
                    if (unsynced) {
                        TERM.stdout.writenl("");
                        TERM.stdout.writenl("  \0magenta(Solve \0bold(PURPLE\0) states to bring package/program in sync with latest sources.\0)");
                        TERM.stdout.writenl("  \0magenta(Use --latest to fetch latest remote info.\0)");
                        TERM.stdout.writenl("");
                        CLI.failAndExit(true);
                    } else {
                        TERM.stdout.writenl("");
                        TERM.stdout.writenl("  \0green(\0bold(All good!\0) Package/program is in a deployable state.\0)");
                        TERM.stdout.writenl("  \0green(Use --latest to fetch latest remote info.\0)");
                        TERM.stdout.writenl("");
                    }
                });
            });
        });

    }).fail(function(err) {
        CLI.failAndExit(err);
    });

});

exports.getStatusTree = function(pm, options) {

    var Tree = function(registry) {
        this.registry = registry;
    }
    Tree.prototype = new EVENTS.EventEmitter();
    Tree.prototype.refreshStatus = function(options) {
        var self = this;
        var globalChanges = {};
        var deferred = Q.defer();
        var waitForNodes = WAIT_FOR.makeParallel(function(err) {
            if (err) return deferred.reject(err);
            deferred.resolve();
        });
        // Traverse all nodes.
        self.registry.forEachNode(function(node) {
            var deferred = Q.defer();
            waitForNodes(function(done) {
                var nodeChanges = {};
                var waitForLoaders = WAIT_FOR.makeParallel(function(err) {
                    if (err) return done(err);
                    self.emit("updated-node", node, nodeChanges);
                    done();
                });
                // Traverse all loaders for node.
                var queue = Q.ref();
                UTIL.forEach(node.loaders, function(loader) {
                    waitForLoaders(function(done) {
                        try {
                            function callLoader() {
                                return Q.call(function() {
                                    return Q.when(loader[1][1](options), function(data) {

                                        if (!data) return done();

                                        if (!node.status[loader[0]]) node.status[loader[0]] = {};

                                        // Determine properties that have actually changed.
                                        var changes = {};
                                        changes[[loader[0]]] = UTIL.deepDiff(data, node.status[loader[0]]);

                                        if (UTIL.len(changes[[loader[0]]]) === 0) return done();

                                        nodeChanges[[loader[0]]] = changes[[loader[0]]];

                                        UTIL.deepUpdate(node.status[loader[0]], changes[loader[0]]);

                                        self.emit("updated-status", node, changes);

                                        if (!globalChanges[[loader[0]]]) globalChanges[[loader[0]]] = [];
                                        globalChanges[[loader[0]]].push([node, changes[loader[0]]]);

                                        done();
                                    });
                                }).fail(done);
                            }
                            if (loader[1][0]) {
                                queue = Q.when(queue, function() {
                                    return callLoader();
                                });
                            } else {
                                Q.when(queue, function() {
                                    callLoader();
                                });
                            }
                        } catch(err) {
                            done(err);
                        }
                    });
                });
                waitForLoaders();
            });
        }).then(function() {
            waitForNodes();
        });
        self.on("updated-status", function(node, changes) {
            if (!node.parent && !node.name && changes.descriptor) {
                node.name = changes.descriptor.name;
            }
        });
        return Q.when(deferred.promise).then(function() {
            self.emit("updated", null, globalChanges);
            return globalChanges;
        });
    }
    Tree.prototype.forEachNode = function(callback) {
        return this.registry.forEachNode(callback);
    }
    Tree.prototype.toString = function() {
        return this.registry.toString();
    }

    return exports.getDependencyRegistry(pm, options).then(function(registry) {
        return new Tree(registry);
    });
}

exports.getDependencyRegistry = function(pm, options) {

    var Node = function(properties) {
        this.name = "";
        this.level = 0;
        this.children = {};
        this.loaders = {};
        this.status = {};
    }
    Node.prototype.init = function(pkgInfo, context) {
        // TODO: Remove this once it is not used above any more.
        this.legacy = [pkgInfo, context];
        this.name = UTIL.unique(pkgInfo[2])[0];
        this.level = context.level;
        this.path = pkgInfo[0].path;
    }
    Node.prototype.forEachNode = function(callback) {
        var self = this;
        return Q.call(function() {
            return Q.when(callback(self), function(oo) {
                if (oo === false) return;
                var done = Q.ref();
                UTIL.forEach(self.children, function(child) {
                    done = Q.when(done, function() {
                        return child[1].forEachNode(callback);
                    });
                });
                return done;
            });
        });
    }
    Node.prototype.addLoader = function(type, waitFor, loader) {
        this.loaders[type] = [waitFor, loader];
    }
    Node.prototype.toString = function() {
        var str = this.level + " : " + this.name + " (" + UTIL.len(this.children) + ")";
        if (this.status.git) {
            str += " git";
        }
        if (this.status.npm) {
            str += " npm:" + this.status.npm.latestVersion;
        }
        str += "\n";
        UTIL.forEach(this.children, function(child) {
            var parts = child[1].toString().split("\n").map(function(line) {
                return "    " + line;
            });
            str += "    " + parts.splice(0, parts.length-1).join("\n") + "\n";
        });
        return str;
    }

    var Registry = function() {
        this.tree = new Node();
        this.list = [];
        this.levels = {};
    }
    Registry.prototype.forEachNode = function(callback) {
        return this.tree.forEachNode(callback);
    }
    Registry.prototype.toString = function() {
        return "    " + this.tree.toString();
    }

    var registry = new Registry();

    // Stream in a set of dependency nodes by traversing a tree.
    var lastNode = null;
    function nodeForNextPackage(pkgInfo, context) {
        if (lastNode === null && context.level === 0) {
            // Root package.
            lastNode = registry.tree;
            lastNode.init(pkgInfo, context);
        } else if (lastNode !== null && context.level > 0) {
            var node = new Node();
            node.init(pkgInfo, context);
            if (context.level === lastNode.level) {
                node.parent = lastNode.parent;
            } else
            if (context.level > lastNode.level) {
                node.parent = lastNode;
            } else
            if (context.level < lastNode.level) {
                for( var i=(lastNode.level-context.level) ; i>=0 ; i--) {
                    lastNode = lastNode.parent;
                }
                node.parent = lastNode;
            }
            node.parent.children[node.name] = node;
            lastNode = node;
        }
        return lastNode;
    }

    // TODO: Load dependency tree much faster than what these calls do.
    return PACKAGES.loadDependenciesForProgram(pm.context.program).then(function() {
        return pm.context.program.walkPackages(options, function(parentPkg, pkgInfo, context) {

            if (context.level >= 2 && options.all !== true) {
                return false;
            }

            var node = nodeForNextPackage(pkgInfo, context);

            node.addLoader("descriptor", true, function(options) {
                var path = PATH.join(node.path, "package.json");
                if (!PATH.existsSync(path)) return false;
                return JSON.parse(FS.readFileSync(path));
            });

            node.addLoader("revision", true, function(options) {
                var revision = {};
                if (!node.parent)  return revision;
                function findDependency(dependencies) {
                    var selector = null;
                    if (Array.isArray(dependencies)) {
                        for (var i=0 ; i<dependencies.length ; i++) {
                            if (dependencies[i] === node.name) {
                                // Found but no version specified.
                                return true;
                            }
                        }
                    } else {
                        for (var key in dependencies) {
                            if (key === node.name) {
                                return dependencies[key];
                            }
                        }
                    }
                }
                revision.selector = findDependency(node.parent.status.descriptor.dependencies || []);
                if (revision.selector) {
                    revision.type = "dependencies";
                } else {
                    revision.selector = findDependency(node.parent.status.descriptor.devDependencies || []);
                    if (revision.selector) {
                        revision.type = "devDependencies";
                    }
                }
                return revision;                
            });

            node.addLoader("git", false, function(options) {
                return SM_PM.forPackagePath(node.path, pm).then(function(pm) {
                    return pm.status({
                        name: node.name,
                        private: (node.status.descriptor && node.status.descriptor.private) || false,
                        versionSelector: node.status.revision.selector,
                        latest: options.now,
                        verbose: options.verbose,
                        pm: "git"
                    });
                }).then(function(gitInfo) {
                    if (gitInfo.type !== "git") return false;
                    delete gitInfo.type;
                    return gitInfo;
                });
            });

            node.addLoader("npm", false, function(options) {                
                if ((node.status.descriptor && node.status.descriptor.private === true) || !node.name) {
                    return false;
                }
                return SM_PM.forPackagePath(node.path, pm).then(function(pm) {
                    return pm.status({
                        name: node.name,
                        private: (node.status.descriptor && node.status.descriptor.private) || false,
                        versionSelector: node.status.revision.selector,
                        latest: options.now,
                        time: options.time,
                        verbose: options.verbose,
                        pm: "npm",
                        includeDescriptor: true
                    });
                });
            });
        });
    }).then(function() {
        return registry;
    });
}
