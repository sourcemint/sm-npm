
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["install"] = new ARGS_PARSER();

command.help("Install package/program.");
command.arg(".../[package.json|program.json]").optional();
command.option("--dev").bool().help("Install dev dependencies as well.");
// NOTE: We don't default to 'now' on install as we want to be able to install 100% from cache in case network is down.
command.option("-n", "--now").bool().help("Aggressively fetch latest remote info (equivalent to `sm update`).");
command.option("-N", "--no-native-install").bool().help("Don't call native package installer (if applicable).");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    if (options.now) {
        options.update = true;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.install(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
