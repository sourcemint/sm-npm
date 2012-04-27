
var PATH = require("path");
var FS = require("fs");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var ERROR = require("sourcemint-util-js/lib/error");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;


//TODO: Only enable this in debug mode.
process.on("uncaughtException", function (err)
{
    // NOTE: `err.stack` seems to be useless here.
    console.error("Uncaught exception: " + err);
}); 


function main() {

    var optParser = new ARGS_PARSER();
    optParser.masthead([
        "\0magenta(------------------ sourcemint.org ------------------",
        "|          \0bold(Sourcemint Open Source Tooling\0)          |",
        "|         ~ Package Management. Evolved. ~         |",
        "|   News   : twitter.com/sourcemint                |",
        "|   Discuss: groups.google.com/group/sourcemint    |",
        "|   Source : github.com/sourcemint/sm-npm          |",
        "|   Bugs   : github.com/sourcemint/sm-npm/issues   |",
        "|   \0bold(DOCS\0)   : bit.ly/sm-wiki                        |",
        "----- (c) 2012+ Christoph Dorn -- License: MIT -----\0)"
    ].join("\n"));
    optParser.help("Run sourcemint tools on the specified package/program path.");
    optParser.helpful();

    FS.readdirSync(PATH.resolve(__dirname, "commands")).forEach(function(filename) {
        UTIL.every(require(PATH.resolve(__dirname, "commands", filename)), function(pair) {
            optParser.command(pair[0], pair[1]);
        });
    });

    var cliOptions = optParser.parse(process.argv.splice(1));

    if (cliOptions.help === true) {
        optParser.printHelp(cliOptions);
        return;
    }
}


exports.failAndExit = function(err) {
    if (err && err !== true) {
        ERROR.print(err);
    }
    process.exit(1);
}

exports.checkPackageProgramPathInArguments = function(args) {
    var path = PATH.resolve(args[0] || "");
    try {
        path = FS.realpathSync(path);
    } catch(e) {}
    if (!path || !PATH.existsSync(path)) {
        TERM.stdout.write("\0red(ERROR: Specified package/program path '" + args[0] + "' resolved to '" + path + "' not found!\0)\n");
        return;
    }
    if (FS.statSync(path).isDirectory()) {
        if (!PATH.existsSync(PATH.resolve(path, "package.json")) &&
            !PATH.existsSync(PATH.resolve(path, "program.json"))
        ) {
            TERM.stdout.write("\0red(ERROR: No [package|program].json found at resolved path '" + path + "'!\0)\n");
            return;
        }
    } else {
        if (!/(^|\.)(package|program)\.json$/.test(PATH.basename(path))) {
            TERM.stdout.write("\0red(ERROR: Resolved path '" + path + "' does not end in [package|program].json!\0)\n");
            return;
        }
    }
    return path;
}



main();
