
var PATH = require("path");
var FS = require("fs");
var EXEC = require("child_process").exec;
var SEMVER = require("semver");
var TERM = require("sourcemint-util-js/lib/term");
var UTIL = require("sourcemint-util-js/lib/util");
var ERROR = require("sourcemint-util-js/lib/error");
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;

//require("sourcemint-util-js/lib/console").enableFileLineInfo();

const NODE_MIN_VERSION = "0.6.19";
const NPM_MIN_VERSION = "1.1.63";

//TODO: Only enable this in debug mode.
process.on("uncaughtException", function (err) {
    // NOTE: `err.stack` seems to be useless here.
    console.error("Uncaught exception: " + err);
}); 


exports.main = function() {

    var optParser = new ARGS_PARSER();
    optParser.masthead([
        "\0magenta(------------------ sourcemint.org ------------------",
        "|    \0bold(`sm` - Sourcemint Open Source Tooling\0)         |",
        "|         ~ Package Management. Evolved. ~         |",
        "|   News   : twitter.com/sourcemint                |",
        "|   Discuss: groups.google.com/group/sourcemint    |",
        "|   Source : github.com/sourcemint/sm-npm          |",
        "|   Bugs   : github.com/sourcemint/sm-npm/issues   |",
        "|   \0bold(DOCS\0)   : bit.ly/sm-wiki                        |",
        "----- (c) 2012+ Christoph Dorn -- License: MIT -----\0)"
    ].join("\n"));
    optParser.help("Run sourcemint tools on the specified package/program path.");
    optParser.option("--version").bool().help("Show `sm` version.");
    optParser.helpful();

    FS.readdirSync(PATH.resolve(__dirname, "commands")).forEach(function(filename) {
        var commandModule = require(PATH.resolve(__dirname, "commands", filename));
        if (typeof commandModule.getCommand === "function") {
            commandModule = commandModule.getCommand();
        }
        UTIL.every(commandModule, function(pair) {
            optParser.command(pair[0], pair[1]);
        });
    });

    // TODO: Get this working properly in the options parser.
    if (process.argv.length > 0 && UTIL.trim(process.argv[process.argv.length-1]) === "--version") {
        TERM.stdout.writenl(JSON.parse(FS.readFileSync(PATH.join(__dirname, "../package.json"))).version);
        return;
    }

    ensureMinNodeVersion(function(err) {
        if (err) return exports.failAndExit(err);

        ensureMinNpmVersion(function(err) {
            if (err) return exports.failAndExit(err);

            var cliOptions = optParser.parse(process.argv.splice(1));

            if (cliOptions.help === true) {
                optParser.printHelp(cliOptions);
                return;
            }
        });
    });
}

function ensureMinNodeVersion(callback) {
    if (SEMVER.compare(process.version, NODE_MIN_VERSION) < 0) {
        TERM.stdout.writenl("\0red([sm] ERROR: Using NodeJS at version " + process.version + " but we need \0bold(at least version " + NODE_MIN_VERSION + "\0). Please upgrade `node`.\0)");
        TERM.stdout.writenl("\0red([sm] Here are the install instructions: \0bold(http://nodejs.org/download\0)\0)");
        TERM.stdout.writenl("\0red([sm] You can download specific version from: \0bold(http://nodejs.org/dist\0)\0)");
        return callback(true);
    } else {
        return callback(null);
    }
}

function ensureMinNpmVersion(callback) {

    // Skip if we are trying to install `npm`.
    if (process.argv[process.argv.length-1] === "install-npm") {
        return callback(null);
    }

    EXEC("npm -v", function(error, stdout, stderr) {
        if (error || stderr) {
            TERM.stdout.writenl("\0red(" + stderr + "\0)");
            TERM.stdout.writenl("\0red([sm] ERROR: While calling `npm` command. Is `npm` installed? It should be on your `PATH`. To install run: \0bold(sm install-npm\0)\0)");
            return callback(true);
        }
        // Check if installed version is newer than latest.
        var version = stdout.replace(/[\n\s]*$/, "");
        if (SEMVER.compare(version, NPM_MIN_VERSION) < 0) {
            TERM.stdout.writenl("\0red([sm] ERROR: Found npm@" + version + " but we need at least version " + NPM_MIN_VERSION + ". To install run: \0bold(sm install-npm\0)\0)");
            return callback(true);
        } else {
            return callback(null);
        }
    });
}


exports.failAndExit = function(err) {
    if (err && err !== true) {
        ERROR.print(err);
        if (typeof err === "object" && typeof err.showHelp === "function") {
            err.showHelp();
        }
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

