
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["deploy"] = new ARGS_PARSER();

command.help("Deploy the package/program.");
command.arg(".../[package.json|program.json]");
command.arg("TARGET_URI").optional();
command.option("-d", "--delete").bool().help("Delete existing `TARGET_URI` if it already exists.");
command.option("--no-archive").bool().help("Do not create an archive.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    options.targetUri = options.args[1];
    options.verbose = true;

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(null, pm).then(function(pm) {
            return pm.deploy(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
