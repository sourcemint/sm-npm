
const PATH = require("path");
const FS = require("fs");
const EXEC = require("child_process").exec;
const ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
const TERM = require("sourcemint-util-js/lib/term");
const OS = require("sourcemint-util-js/lib/os");
const CLI = require("../cli");

const COMMAND_PATH = PATH.join(__dirname, "../../bin/sm");


exports.getCommand = function() {

    var command = new ARGS_PARSER();

    command.help("Install `sm` command in PATH.");
    command.helpful();

    command.action(function (options) {

        exports.install(function(err) {
            if (err) {
                TERM.stderr.writenl("\0red([sm] ERROR: Installing `sm` in your PATH! Try re-running with: \0bold(sudo " + COMMAND_PATH + " install-command\0)\0)");
                return CLI.failAndExit(true);
            }
            TERM.stderr.writenl("\0green(`sm` has successfully been installed in your PATH!\0)");
            process.exit(0);
        });
    });

    return {
        "install-command": command
    };
}


exports.install = function(callback) {

    function fail(err) {
        TERM.stderr.writenl("\0red(" + err.stack + "\0)");
        return callback(err, COMMAND_PATH);
    }

    function finalVerify() {
        EXEC("which sm", function(error, stdout, stderr) {
            if (error) {
                return fail(new Error("`which sm` failed to foind `sm` on PATH."));
            }
            return callback(null);
        });
    }

    try {

        var binPath = getBinPath();

        var commandPath = PATH.join(binPath, PATH.basename(COMMAND_PATH));

        if (PATH.existsSync(commandPath)) {
            if (FS.readlinkSync(commandPath) === COMMAND_PATH) {
                return finalVerify();
            }
            FS.unlinkSync(commandPath);
        }

        FS.symlinkSync(COMMAND_PATH, commandPath);
        FS.chmodSync(commandPath, 0755);
        if (OS.isSudo()) {
            FS.lchownSync(commandPath, parseInt(process.env.SUDO_UID), parseInt(process.env.SUDO_GID));
        }

        return finalVerify();

    } catch(err) {
        if (err.code === "EACCES") {
            return fail(new Error("Permission denied! Could not install command at '" + commandPath + "'."));
        } else {
            return fail(err);
        }
    }
}


// @source npm
function getBinPath() {
    var prefixPath;
    if (process.platform === "win32") {
        // c:\node\node.exe --> prefix=c:\node\
        prefixPath = PATH.join(process.execPath, "..");
    } else {
        // /usr/local/bin/node --> prefix=/usr/local
        prefixPath = PATH.join(process.execPath, "..", "..");
    }
    var binPath = PATH.join(prefixPath, "bin");

    // TODO: Fix this for windows.
    var paths = process.env.PATH.split(":");

    if (paths.indexOf(binPath) === -1) {
        // don't assume node is on the user's path
        var binPathDefault = "/usr/local/bin";
        if (!PATH.existsSync(binPathDefault)) {
            throw new Error("Did not find node-based bin path '" + binPath + "' nor default bin path '" + binPathDefault + "' on PATH '" + process.env.PATH + "'!");
        }
        binPath = binPathDefault;
    }
    return binPath;
}
