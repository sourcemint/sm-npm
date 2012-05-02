
const PATH = require("path");
const FS = require("fs");
const TERM = require("sourcemint-util-js/lib/term");
const FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");
const EXEC = require("child_process").exec;
const ERROR = require("sourcemint-util-js/lib/error");



EXEC("which sm", function(err, stdout, stderr) {
    if (err) {
        TERM.stdout.writenl("\0red(ERROR: Could not find `sm` on your PATH (" + process.env.PATH + ")! NPM should have installed it.\0)");
        process.exit(1);
        return;
    }

    var binPath = stdout.replace(/\n$/, "");
    
    EXEC(binPath + " --version", function(err, stdout, stderr) {
        if (err) {
            TERM.stdout.writenl("\0red(ERROR: '" + err + "' while running `" + binPath + " --version" + "`: " + stderr + "\0)");
            process.exit(1);
            return;
        }

        var installedVersion = stdout.replace(/\n$/, "");
        
        if (installedVersion !== process.env.npm_package_version) {
            TERM.stdout.writenl("\0red(ERROR: Installed `sm` at `which sm` (" + binPath + ") has version '" + installedVersion + "' which is NOT the version '" + process.env.npm_package_version + "' we just installed!\0)");
            process.exit(1);
            return;
        }

        if (typeof process.env.SUDO_USER === "string" && 
            typeof process.env.SUDO_UID === "string" && 
            typeof process.env.SUDO_GID === "string") {
            
            TERM.stdout.writenl("\0cyan(`sm` was installed with sudo. Changing ownership of all files to user: " + process.env.SUDO_USER + "\0)");
            
            var sourcePath = PATH.join(__dirname, "..");
            
            TERM.stdout.writenl("\0cyan(chown " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + binPath + "\0)");
            FS.chownSync(binPath, parseInt(process.env.SUDO_UID), parseInt(process.env.SUDO_GID));

            TERM.stdout.writenl("\0cyan(chown -R " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + sourcePath + "\0)");
            EXEC("chown -R " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + sourcePath, function(err, stdout, stderr) {
                if (err) {
                    TERM.stdout.writenl("\0red(ERROR: '" + err + "' while chowning files!\0)");
                    process.exit(1);
                    return;
                }

                TERM.stdout.writenl("\0magenta(You should now be able to run `sm` WITHOUT `sudo` for user '" + process.env.SUDO_USER + "'!\0)");
                process.exit(0);
            });
        }
    });
});

