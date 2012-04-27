
var PATH = require("path");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var Q = require("sourcemint-util-js/lib/q");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");

var PROGRAM = require("sourcemint-pinf-js/lib/program");

var DESCRIPTORS = require("sourcemint-pinf-js/lib/descriptors");
var PACKAGES = require("sourcemint-pinf-js/lib/packages");
var SM_PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["status"] = new ARGS_PARSER();

command.help("Check package/program status.");
command.arg(".../[package.json|program.json]").optional();
command.option("--show").bool().help("Traverse all dependencies (even if parents need attention)");
command.option("--latest").bool().help("Check for latest upstream packages.");
command.option("--dev").bool().help("Include transitive dev dependencies & mappings");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    var time = 5;
    
//    TERM.stdout.write("\n\0magenta(Checked latest upstream packages \0bold(" + time + " minute" + ((time > 1)?"s":"") + "\0) ago ( --latest )\0)\n\n");

    
    // TODO: Move status logic into `sourcemint-pm-sm` package and only keep printing stuff here.
    
    SM_PM.forProgramPath(basePath).then(function(pm) {

        return PACKAGES.loadDependenciesForProgram(pm.context.program).then(function() {

            var hasErrors = false;

            return pm.context.program.walkPackages(options, function(parentPkg, pkgInfo, context) {

                var padding = "";
                for (var i=0 ; i<context.level ; i++) padding += "    ";

                var names = UTIL.unique(pkgInfo[2]);
                
                var summary = [];
                var ok = true;
                var foundInParent = false;

                if (pkgInfo[1].indexOf("devDependencies") >= 0 || pkgInfo[1].indexOf("devMappings") >= 0) {
                    summary.push("\0yellow(" + (names[0] || "(Package)") + " @ " + (pkgInfo[0].descriptor.json.version || "->") + "\0)");
                } else {
                    summary.push("\0yellow(\0bold(" + (names[0] || "(Package)") + "\0) @ " + (pkgInfo[0].descriptor.json.version || "->") + "\0)");
                }

                if (names.length > 1) {
                    ok = false;
                    summary.push("\0red([\0bold(also mapped to alias '" + pkgInfo[2].join("' and '") + "'\0)]\0)");
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
                    summary.push("\0red([\0bold(defined in 'mappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                }
                else if (pkgInfo[1].indexOf("devMappings") >= 0 && (pkgInfo[1].indexOf("mapped_packages/") === -1 && pkgInfo[1].indexOf("node_modules/") === -1)) {
                    ok = false;
                    summary.push("\0red([\0bold(defined in 'devMappings' but not installed in 'node_modules/' nor 'mapped_packages/'\0)]\0)");
                }
                else if (parentPkg) {
                    if (pkgInfo[1].indexOf("node_modules/") >= 0) {
                        if (pkgInfo[1].indexOf("dependencies") >= 0) {
                            summary.push("\0green([dependencies -> node_modules/]\0)");
                        } else
                        if (pkgInfo[1].indexOf("devDependencies")) {
                            summary.push("\0green([devDependencies -> node_modules/]\0)");
                        } else {
                            ok = false;
                            summary.push("\0red([\0bold(found in 'node_modules/' but not defined in 'dependencies' nor 'devDependencies'\0)]\0)");
                        }
                    } else
                    if (pkgInfo[1].indexOf("dependencies") >= 0 || pkgInfo[1].indexOf("devDependencies") >= 0) {
                        function findInParent(pkg, level) {
                            if (pkg.children["node_modules/"][pkgInfo[2][0]] === pkgInfo[0].path) {
                                foundInParent = true;
                                var dirs = "";
                                for (var i=0 ; i<=level ; i++) dirs += "../../";
                                summary.push("\0green([" + pkgInfo[1][0] + " -> " + dirs + "node_modules/]\0)");
                            } else
                            if (pkg.parent) {
                                findInParent(pkg.parent, level + 1);
                            }
                        }
                        findInParent(pkgInfo[0].parent, 0);
                        if (!foundInParent) {
                            if (pkgInfo[1].indexOf("dependencies") >= 0) {
                                ok = false;
                                summary.push("\0red([\0bold(defined in 'dependencies' but not installed in 'node_modules/'\0)]\0)");
                            }
                            else if (pkgInfo[1].indexOf("devDependencies") >= 0) {
                                ok = false;
                                summary.push("\0red([\0bold(defined in 'devDependencies' but not installed in 'node_modules/'\0)]\0)");
                            }
                        }
                    }
                    if (pkgInfo[1].indexOf("mapped_packages/") >= 0) {
                        if (pkgInfo[1].indexOf("mappings") >= 0) {
                            summary.push("\0green([mappings -> mapped_packages/]\0)");
                        }
                        if (pkgInfo[1].indexOf("devMappings") >= 0) {
                            summary.push("\0green([devMappings -> mapped_packages/]\0)");
                        }
                        if (pkgInfo[1].indexOf("mappings") === -1 && pkgInfo[1].indexOf("devMappings") === -1) {
                            ok = false;
                            summary.push("\0red([\0bold(found in 'mapped_packages/' but not defined in 'mappings' nor 'devMappings'\0)]\0)");
                        }
                    }
                }

                var opts = {
                    name: pkgInfo[0].descriptor.json.name,
                    private: pkgInfo[0].descriptor.json.private,
                    versionSelector: ((parentPkg)?parentPkg.descriptor.versionSelectorForDependencyName(pkgInfo[0].descriptor.json.name || ""):pkgInfo[0].descriptor.json.version),
                    latest: options.latest
                };
                
                return gitStatus(pkgInfo[0].path, opts).then(function(gitInfo) {
                    
                    if (gitInfo.type !== false) {
                        function formatBranch() {
                            return ((gitInfo.branch !== "master")?("\0orange(" + gitInfo.branch + "\0)"):gitInfo.branch);
                        }
                        if (gitInfo.dirty) {
                            ok = false;
                            summary.push("\0red([git: " + formatBranch() + " \0bold(dirty\0)]\0)");
                        } else
                        if (gitInfo.ahead) {
                            if (context.level === 0) {
                                summary.push("\0magenta([git: " + formatBranch() + " \0bold(ahead\0)]\0)");
                            } else {
                                ok = false;
                                summary.push("\0red([git: " + formatBranch() + " \0bold(ahead\0)]\0)");
                            }
                        } else
                        if (gitInfo.branch) {
                            summary.push("\0green([git: " + formatBranch() + "]\0)");
                        }
                    }
                    
                    return npmStatus(pkgInfo[0].path, opts).then(function(npmInfo) {
                        if (pkgInfo[1].indexOf("dependencies") >= 0 || pkgInfo[1].indexOf("devDependencies") >= 0) {
                            if (pkgInfo[0].descriptor.json.private === true) {
                                summary.push("\0green([npm: private]\0)");
                            } else
                            if (npmInfo.published) {
                                if (npmInfo.usingLatestSatisfying) {
                                    if (npmInfo.usingLatest) {
                                        summary.push("\0green([npm(" + npmInfo.versionSelector + "): " + npmInfo.actualVersion + "]\0)");
                                    } else {
                                        summary.push("\0green([npm(" + npmInfo.versionSelector + "): \0magenta(new " + npmInfo.latestVersion + "\0)]\0)");
                                    }
                                } else {
                                    if (foundInParent) {
                                        summary.push("\0magenta([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                                    } else if (npmInfo.usingLatest) {
                                        ok = false;
                                        summary.push("\0red([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                                    } else if (npmInfo.latestSatisfyingVersion != npmInfo.latestVersion) {
                                        ok = false;
                                        summary.push("\0red([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0) \0magenta(new " + npmInfo.latestVersion + "\0)]\0)");
                                    } else {
                                        ok = false;
                                        summary.push("\0red([npm(" + npmInfo.versionSelector + "): \0bold(" + npmInfo.latestSatisfyingVersion + "\0)]\0)");
                                    }
                                }
                            } else {
                                ok = false;
                                summary.push("\0red([npm: \0bold(UNPUBLISHED\0)]\0)");
                            }
                        }

                    }).then(function() {

                        function formatPath() {
                            return pkgInfo[0].path.replace(/\/node_modules\//g, "\0bold(/node_modules/\0)").
                                                   replace(/\/mapped_packages\//g, "\0bold(/mapped_packages/\0)");
                        }
                        
                        function formatCircular() {
                            if (!context.circular) return "";
                            return " \0magenta((STOP: circular)\0)";
                        }
    
                        if (foundInParent) {
                            // In parent package.
                            TERM.stdout.write(padding + summary.join(" ") + "  \0white(<-  " + formatPath() + "\0)" + formatCircular() + "\n");
                        } else
                        if (!parentPkg || pkgInfo[0].path.substring(0, parentPkg.path.length) === parentPkg.path) {
                            // In package dependency tree.
                            TERM.stdout.write(padding + summary.join(" ") + "  \0white(->  " + formatPath() + "\0)" + formatCircular() + "\n");
                        } else {
                            // Linked package.
                            TERM.stdout.write(padding + summary.join(" ") + "  \0cyan(<-  " + formatPath() + "\0)" + formatCircular() + "\n");
                        }

                        if (!ok) {
                            hasErrors = true;
                            if (options.show !== true) {
                                if (Object.keys(pkgInfo[0].children.packages).length > 0) {
                                    TERM.stdout.write(padding + "    " + "\0magenta(^ --- Not going deeper until resolved. Use --show to traverse all dependencies (even if parents need attention).\0)" + "\n");
                                }
                                return false;
                            }
                        }

                        return true;
                    });
                });

            }).then(function() {
                if (hasErrors) {
                    TERM.stdout.write("\n" + "\0red(\0bold(We had some errors! See above.\0)\0)" + "\n");
                    CLI.failAndExit(true);
                } else {
                    TERM.stdout.write("\n" + "\0green(\0bold(All good!\0)\0)" + "\n");
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
                return pm.status(opts);
            });
        }
    }).fail(function(err) {
        CLI.failAndExit(err);
    });

});
