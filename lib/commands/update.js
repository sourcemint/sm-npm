
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["update"] = new ARGS_PARSER();

command.help("Update package/program.");
command.arg(".../[package.json|program.json]").optional();
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    // Always default to 'latest'. If you don't want latest packages and only want to update packages
    // who's version declaration has changed (and no longer matches installed package) use `sm install`.
    options.now = true;

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.update(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
