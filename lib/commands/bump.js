
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["bump"] = new ARGS_PARSER();

command.help("Bump the package/program version.");
command.arg(".../[package.json|program.json]").optional();
command.option("--patch").bool().help("Bump patch version.");
command.option("--minor").bool().help("Bump minor version.");
command.option("--major").bool().help("Bump major version.");
command.option("-p", "--publish").bool().help("Publish package after bumping.");
command.helpful();

command.action(function (options) {
    
    if (!options.minor && !options.major) {
        options.patch = true;
    }

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.bump(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
