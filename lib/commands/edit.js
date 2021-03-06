
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");
var TERM = require("sourcemint-util-js/lib/term");


var command = exports["edit"] = new ARGS_PARSER();

command.help("Setup a dependency (see `sm status -ai`) package for editing.");
command.arg("DEPENDENCY");
command.arg("SOURCE_URI").optional();
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.option("--debug").bool().help("Show debug output.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(".");

    if (options.args.length === 0) {
        TERM.stderr.writenl("\0red([sm] ERROR: Must specify DEPENDENCY argument. See `sm edit -h`." + "\0)");
        CLI.failAndExit();
    }

    PM.forProgramPath(basePath).then(function(pm) {
        return PM.forPackagePath(basePath, pm).then(function(pm) {
            return pm.edit(options);
        });
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
