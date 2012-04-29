
var PATH = require("path");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["fix"] = new ARGS_PARSER();

command.help("Fix a package/program aspect.");
command.arg(".../[package.json|program.json]").optional();
command.option("-g", "--git").bool().help("Open dirty/unpushed with `stree` - Sourcetree (http://www.sourcetreeapp.com) [No affiliation with sourcemint]");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
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
