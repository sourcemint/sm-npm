
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["update"] = new ARGS_PARSER();

command.help("Update package/program.");
command.arg(".../[package.json|program.json]").optional();
command.arg("DEPENDENCY");
command.option("--cached").bool().help("Update from local cache if available (will not aggressively fetch latest remote info).");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    options.now = true;
    if (options.cached) {
        options.now = false;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.update(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
