
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["ssh"] = new ARGS_PARSER();

command.help("SSH to a deployed package/program.");
command.arg(".../[package.json|program.json]");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(null, pm).then(function(pm) {
            return pm.ssh(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
