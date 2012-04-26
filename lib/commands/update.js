
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["update"] = new ARGS_PARSER();

command.help("Update package/program.");
command.arg(".../[package.json|program.json]").optional();
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.update();
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
