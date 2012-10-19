
const PATH = require("path");
const SPAWN = require("child_process").spawn;
const ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
const TERM = require("sourcemint-util-js/lib/term");
const CLI = require("../cli");


var command = exports["install-npm"] = new ARGS_PARSER();

command.help("Install latest `npm`.");
command.helpful();

command.action(function (options) {
    var proc = SPAWN("sh", [
        PATH.join(__dirname, "../npm-install.sh")
    ]);
    proc.on("error", function(err) {
        CLI.failAndExit(err);
    });
    proc.stdout.on("data", function(data) {
        process.stdout.write(data);
    });
    proc.stderr.on("data", function(data) {
        TERM.stderr.write("\0red(");
        process.stderr.write(data);
        TERM.stderr.write("\0)");
    });
    proc.on("exit", function(code) {
        if (code !== 0) return CLI.failAndExit(new Error("`npm` install error"));
        process.exit(0);
    });
});
