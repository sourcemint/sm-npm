
var PATH = require("path");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");


var command = exports["clone"] = new ARGS_PARSER();

command.help("Clone a package/program from a URI.");
command.arg("URI");
command.arg("TARGET_PATH");
command.option("--dev").bool().help("Same as --create --write --install");
command.option("-c", "--create").bool().help("Create parent path `dirname(TARGET_PATH)` of `TARGET_PATH` if it does not exist.");
command.option("--delete").bool().help("Delete `TARGET_PATH` if it already exists.");
command.option("-w", "--write").bool().help("Clone in write mode.");
command.option("-i", "--install").bool().help("Install after cloning.");
command.helpful();

command.action(function (options) {

    if (options.dev === true) {
        options.create = true;
        options.write = true;
        options.install = true;
    }

    options.locator = options.args[0];
    options.help = true;
    options.verbose = true;

    PM.clone(PATH.resolve(options.args[1]), options).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
