
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var TERM = require("sourcemint-util-js/lib/term");
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["update"] = new ARGS_PARSER();

command.help("Update package/program.");
command.arg("DEPENDENCY").optional();
command.arg("POINTER").optional();
command.option("--cache").bool().help("Update from local cache if available (will not aggressively fetch latest remote info).");
command.option("--dry-run").bool().help("Go through motions but don't actually update.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.option("--debug").bool().help("Show debug output.");
command.helpful();

command.action(function (options) {

    if (options.args.length > 2) {
        TERM.stdout.writenl("\0red([sm] ERROR: You have specified more than two arguments! You only need a DEPENDENCY and optional POINTER argument to update a specific dependency!\0)");
        process.exit(1);
    }

    var basePath = CLI.checkPackageProgramPathInArguments(".");
    if (!basePath) {
        return;
    }

    options.now = true;
    if (options.cache) {
        options.now = false;
    }
    if (options.debug) {
        options.verbose = true;
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return pm.update(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
