
var PATH = require("path");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var TERM = require("sourcemint-util-js/lib/term");
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["clone"] = new ARGS_PARSER();

command.help("Clone a package/program from a URI.");
command.arg("URI");
command.arg("TARGET_PATH");
command.option("--dev").bool().help("Clone and setup for development.");
command.option("--cache").bool().help("Clone from local cache if available (will not aggressively fetch latest remote info).");
command.option("--delete").bool().help("Delete `TARGET_PATH` if it already exists.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    if (options.args.length === 0) {
        TERM.stdout.writenl("\0red([sm] ERROR: You must specify a URI and TARGET_PATH argument!\0)");
        process.exit(1);
    } else
    if (options.args.length === 1) {
        TERM.stdout.writenl("\0red([sm] ERROR: You must specify a TARGET_PATH as second argument!\0)");
        process.exit(1);
    } else
    if (options.args.length > 2) {
        TERM.stdout.writenl("\0red([sm] ERROR: You have specified more than two arguments! You only need a URI and TARGET_PATH!\0)");
        process.exit(1);
    }

    if (options.dev === true) {

        // TODO: Deprecated?
        options.forceClone = true;

        options.keepTopVcs = true;

        options.create = true;
        options.install = true;
    }

    options.all = true;
    options.update = false;
    options.now = true;
    if (options.cache) {
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
