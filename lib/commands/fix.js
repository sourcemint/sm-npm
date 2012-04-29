
var PATH = require("path");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["fix"] = new ARGS_PARSER();

command.help("Fix a package/program aspect.");
command.arg(".../[package.json|program.json]").optional();
command.option("-g", "--git").bool().help("Open \0red([\0bold(git\0)]\0) with `stree` - Sourcetree (http://www.sourcetreeapp.com) \0magenta([No affiliation with sourcemint]\0)");
command.option("-d", "--dirty").bool().help("Only fix \0red([\0bold(git dirty\0)]\0)");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    // Default to `-gd`.
    if (options.git === false) {
        options.git = true;
        options.tests = true;
        options.dirty = true;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(basePath, pm).then(function(pm) {
            return pm.fix(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
