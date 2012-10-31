
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var TERM = require("sourcemint-util-js/lib/term");
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["install"] = new ARGS_PARSER();

command.help("Install package/program.");
command.arg(".../[package.json|program.json]").optional();
command.option("--dev").bool().help("Install dev dependencies as well.");
// NOTE: We don't default to 'now' on install as we want to be able to install 100% from cache in case network is down.
command.option("-n", "--now").bool().help("Aggressively fetch latest remote info (equivalent to `sm update`).");
command.option("-N", "--no-native-install").bool().help("Don't call native package installer (if applicable).");
command.option("--dry-run").bool().help("Go through motions but don't actually install.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.option("--debug").bool().help("Show debug output.");
command.helpful();

command.action(function (options) {

    if (options.args.length > 1) {
        TERM.stdout.writenl("\0red([sm] ERROR: You have specified more than one argument! You only need a .../[package.json|program.json]!\0)");
        process.exit(1);
    }

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    if (options.now) {
        options.update = true;
    }
    if (options.debug) {
        options.verbose = true;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.install(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
