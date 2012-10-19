
var PATH = require("path");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["clone"] = new ARGS_PARSER();

command.help("Clone a package/program from a URI.");
command.arg("URI");
command.arg("TARGET_PATH");
command.option("--dev").bool().help("Clone and setup for development.");
command.option("--cached").bool().help("Clone from local cache if available (will not aggressively fetch latest remote info).");
command.option("--delete").bool().help("Delete `TARGET_PATH` if it already exists.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    if (options.dev === true) {
        options.forceClone = true;
        options.create = true;
        options.install = true;
    }

    // Update newInVersions but don't fetch latest remote info.
    options.update = true;
    options.now = true;
    if (options.cached) {
        options.now = false;
    }

    options.locator = options.args[0];
    options.help = true;

    PM.clone(PATH.resolve(options.args[1]), options).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
