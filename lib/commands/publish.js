
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["publish"] = new ARGS_PARSER();

command.help("Publish package/program.");
command.arg(".../[package.json|program.json]").optional();
command.helpful();

command.action(function (options) {
    
    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(basePath, pm).then(function(pm) {
            return pm.publish(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
