
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["run-script"] = new ARGS_PARSER();

command.help("Run a package/program script.");
command.arg("SCRIPT_NAME");
command.arg(".../[package.json|program.json]");
command.option("--chown").set().help("Change ownership of process before running script.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    options.scriptName = options.args.shift();

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    if (typeof options.chown !== "undefined") {

        var ownership = options.chown.split(":");

        process.setgid(parseInt(ownership[0]));
        process.setuid(parseInt(ownership[1]));
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(null, pm).then(function(pm) {
            return pm.runScript(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
