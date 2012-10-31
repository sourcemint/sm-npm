
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");
var TERM = require("sourcemint-util-js/lib/term");


var command = exports["save"] = new ARGS_PARSER();

command.help("Freeze dependency tree and push.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.option("--debug").bool().help("Show debug output.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(".");

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(basePath, pm).then(function(pm) {
            return pm.save(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
