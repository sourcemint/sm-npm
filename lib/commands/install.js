
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["install"] = new ARGS_PARSER();

command.help("Install package/program.");
command.arg(".../[package.json|program.json]").optional();
command.option("-c", "--cached").bool().help("Create from cache if exists. i.e. Don't check latest sources. Use `sm update` later.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    options.latest = true;
    options.verbose = true;

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.install(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
