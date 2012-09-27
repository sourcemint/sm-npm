
var PATH = require("path");
var FS = require("fs");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var Q = require("sourcemint-util-js/lib/q");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");

var PROGRAM = require("sourcemint-pinf-js/lib/program");

var DESCRIPTORS = require("sourcemint-pinf-js/lib/descriptors");
var PACKAGES = require("sourcemint-pinf-js/lib/packages");
var SM_PM = require("sourcemint-pm-sm/lib/pm");
var URI_PARSER = require("sourcemint-pm-sm/lib/uri-parser");


var command = exports["status"] = new ARGS_PARSER();

command.help("Check package/program status.");
command.arg(".../[package.json|program.json]").optional();
command.option("-a", "--all").bool().help("Show transitive dependencies (dependencies of dependencies).");
command.option("-l", "--latest").bool().help("Fetch latest remote info.");
command.option("-d", "--dev").bool().help("Include dev dependencies");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    var time = 5;

    // TODO: Move status logic into `sourcemint-pm-sm` package and only keep printing stuff here.

    SM_PM.forProgramPath(basePath).then(function(pm) {

        return PACKAGES.loadDependenciesForProgram(pm.context.program).then(function() {

            var hasErrors = false;
            var unsynced = false;

            TERM.stdout.writenl("");
            
            return pm.context.program.walkPackages(options, function(parentPkg, pkgInfo, context) {

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
                    summary.push("\0yellow(" + (names[0] || "(Package)") + " @ " + (pkgInfo[0].descriptor.json.version || "->") + "\0)");
                } else {
                    summary.push("\0yellow(\0bold(" + (names[0] || "(Package)") + "\0) @ " + (pkgInfo[0].descriptor.json.version || "->") + "\0)");
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
                    ok = false;
                    notInstalled = true;
                    summary.push("\0red([\0bold(defined in 'mappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                }
                else if (pkgInfo[1].indexOf("devMappings") >= 0 && (pkgInfo[1].indexOf("mapped_packages/") === -1 && pkgInfo[1].indexOf("node_modules/") === -1)) {
                    ok = false;
                    notInstalled = true;
                    summary.push("\0red([\0bold(defined in 'devMappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                }                

                var opts = {
                    name: pkgInfo[0].descriptor.json.name || names[0],
                    private: pkgInfo[0].descriptor.json.private,
                    versionSelector: ((parentPkg)?parentPkg.descriptor.versionSelectorForDependencyName(pkgInfo[0].descriptor.json.name || ""):false),
                    latest: options.latest,
                    verbose: options.verbose
                };
                
                return gitStatus(pkgInfo[0].path, opts).then(function(gitInfo) {

                    var packageSourceStatus = {};
                    var sourceUriInfo = false;
                    if (PATH.existsSync(PATH.join(pkgInfo[0].path, ".sourcemint", "source.json"))) {
                        packageSourceStatus = JSON.parse(FS.readFileSync(PATH.join(pkgInfo[0].path, ".sourcemint", "source.json")));
                        sourceUriInfo = URI_PARSER.parse(packageSourceStatus.url);
                    }

                    if (ok && parentPkg) {

                        if (parentPkg.descriptor.json.mappings && parentPkg.descriptor.json.mappings[pkgInfo[2][0]]) {
                            mappingsUriInfo = URI_PARSER.parse(parentPkg.descriptor.json.mappings[pkgInfo[2][0]][1]);
                        } else
                        if (parentPkg.descriptor.json.devMappings && parentPkg.descriptor.json.devMappings[pkgInfo[2][0]]) {
                            mappingsUriInfo = URI_PARSER.parse(parentPkg.descriptor.json.devMappings[pkgInfo[2][0]][1]);
                        }
                        
                        function formatProperty() {
                            if (pkgInfo[1].indexOf("dependencies") >= 0) {
                                return "d";
                            }
                            else if (pkgInfo[1].indexOf("devDependencies") >= 0) {
                                return "dd";
                            }
                            else if (pkgInfo[1].indexOf("mappings") >= 0) {
                                return "m";
                            }
                            else if (pkgInfo[1].indexOf("devMappings") >= 0) {
                                return "dm";
                            }
                        }
                        if (pkgInfo[1].indexOf("node_modules/") >= 0) {
                            if (pkgInfo[1].indexOf("dependencies") >= 0) {
                                summary.push("\0green([" + formatProperty() + ": node_modules/]\0)");
                            } else
                            if (pkgInfo[1].indexOf("devDependencies") >= 0) {
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
                            if (gitInfo.type !== false && gitInfo.rev != mappingsUriInfo.vendor.rev) {
                                summary.push("\0red([mapping: " + mappingsUriInfo.vendor.rev + " != " + gitInfo.rev + "(git)]\0)");
                            } else
                            if (sourceUriInfo && sourceUriInfo.vendor && sourceUriInfo.vendor.rev !== mappingsUriInfo.vendor.rev) {
                                summary.push("\0red([mapping: " + mappingsUriInfo.vendor.rev + " != " + sourceUriInfo.vendor.rev + "(installed)]\0)");
                            } else {
                                summary.push("\0green([mapping: " + mappingsUriInfo.vendor.rev + "]\0)");
                            }
                        }
                    }                    
                    
                    if (gitInfo.type !== false) {
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
                    
                    return npmStatus(pkgInfo[0].path, opts).then(function(npmInfo) {
                        
                        npmStatusInfo = npmInfo;

                        if (pkgInfo[0].descriptor.json.private === true) {
                            summary.push("\0green([private]\0)");
                        } else
                        if (npmInfo.published) {

                            if (gitInfo.type !== false && !gitInfo.tagged && context.circular !== true) {
                                if (!npmInfo.versionSelector || npmInfo.versionSelector.indexOf(gitInfo.rev) === -1) {
                                    summary.push("\0magenta( -(" + gitInfo.rev + ")>\0)");
                                }
                            }

                            var redColor = "red";
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
                                if (npmInfo.versionSelector.indexOf(gitInfo.rev) >=0) {
                                    summary.push("\0green([npm: " + npmInfo.versionSelector + "]\0)");
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
                        else if (pkgInfo[1].indexOf("mappings") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0  && pkgInfo[0].descriptor.json.pm !== "npm") {
                            // Package is mapped. So we don't mark NPM red if unpublished.
                        } else if (!notInstalled) {
                            ok = false;
                            summary.push("\0red([npm: \0bold(UNPUBLISHED\0)]\0)");
                        }
                    }).then(function() {

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
                                var repositories = descriptor.json.repository;
                                if (!repositories) {
                                    repositories = descriptor.json.repositories;
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
                                if (!url && pkgInfo[0].descriptor.json.homepage) {
                                    url = pkgInfo[0].descriptor.json.homepage;
                                }
                                return url;
                            }
                            var url = repositoryFromDescriptor(pkgInfo[0].descriptor);
                            if (!url && npmStatusInfo.descriptor) {
                                url = repositoryFromDescriptor({
                                    json: npmStatusInfo.descriptor
                                });
                            }
                            if (!url) return "";
                            return "( \0yellow(" + url + "\0) )";
                        }
                        function formatWritable() {                            
                            padding += " ";
                            if (gitInfo.type === "git") {
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
                        if (!parentPkg || pkgInfo[0].path.substring(0, parentPkg.path.length) === parentPkg.path) {
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
                        
                        if (notInstalled) {
                            return false;
                        }
                        
                        return true;
                    });
                });

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

        function gitStatus(packagePath, options) {
            return SM_PM.forPackagePath(packagePath, pm).then(function(pm) {
                var opts = UTIL.copy(options);
                opts.pm = "git";
                return pm.status(opts);
            });
        }

        function npmStatus(packagePath, options) {
            if (options.private === true || !options.name) {
                return Q.call(function() {
                    return {};
                });
            }
            return SM_PM.forPackagePath(packagePath, pm).then(function(pm) {
                var opts = UTIL.copy(options);
                opts.pm = "npm";
                opts.includeDescriptor = true;
                return pm.status(opts);
            });
        }
    }).fail(function(err) {
        CLI.failAndExit(err);
    });

});
