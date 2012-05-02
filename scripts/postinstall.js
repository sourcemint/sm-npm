
const PATH = require("path");
const FS = require("fs");
const TERM = require("sourcemint-util-js/lib/term");
const FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");
const EXEC = require("child_process").exec;
const ERROR = require("sourcemint-util-js/lib/error");


TERM.stderr.writenl("\0yellow(Running as UID: " + process.getuid() + "\0)");
TERM.stderr.writenl("\0yellow(Running as GID: " + process.getgid() + "\0)");

EXEC("which sm", function(err, stdout, stderr) {
    if (err) {
        TERM.stderr.writenl("\0red(ERROR: Could not find `sm` on your PATH (" + process.env.PATH + ")! NPM should have installed it.\0)");
        process.exit(1);
        return;
    }

    var binPath = stdout.replace(/\n$/, "");
    
    EXEC(binPath + " --version", function(err, stdout, stderr) {
        if (err) {
            TERM.stderr.writenl("\0red(ERROR: '" + err + "' while running `" + binPath + " --version" + "`: " + stderr + "\0)");
            process.exit(1);
            return;
        }

        var installedVersion = stdout.replace(/\n$/, "");
        
        if (installedVersion !== process.env.npm_package_version) {
            TERM.stderr.writenl("\0red(ERROR: Installed `sm` at `which sm` (" + binPath + ") has version '" + installedVersion + "' which is NOT the version '" + process.env.npm_package_version + "' we just installed!\0)");
            process.exit(1);
            return;
        }

        var sourcePath = PATH.join(__dirname, "..");
        
        if (typeof process.env.SUDO_USER === "string" && 
            typeof process.env.SUDO_UID === "string" && 
            typeof process.env.SUDO_GID === "string") {

            if (process.getuid() !== 0 || process.getgid() !== 0 ) {

                TERM.stderr.writenl("\0magenta( !");
                TERM.stderr.writenl(" !  You are installing `sm` with `sudo` but NPM is configured to run post-install scripts (this script) as non-root!");
                TERM.stderr.writenl(" !  The way things are right now you need to use `sudo` to run `sm` commands which is not recommended.");
                TERM.stderr.writenl(" !  To fix this do one of:");
                TERM.stderr.writenl(" !");
                TERM.stderr.writenl(" !      1) Re-configure NPM to run scripts as root: http://npmjs.org/doc/scripts.html#USER");
                TERM.stderr.writenl(" !");
                TERM.stderr.writenl(" !          sudo npm uninstall -g sm");
                TERM.stderr.writenl(" !          npm config set user 0");
                TERM.stderr.writenl(" !          npm config set unsafe-perm true");
                TERM.stderr.writenl(" !          sudo npm install -g sm");
                TERM.stderr.writenl(" !");
                TERM.stderr.writenl(" !      2) Update ownership yourself:");
                TERM.stderr.writenl(" !");
                TERM.stderr.writenl(" !          sudo chown -Rf " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + sourcePath);
                TERM.stderr.writenl(" !");
                TERM.stderr.writenl(" Letting script exit with 0 even though setup is not ideal.\0)");

                process.exit(0);
            }
            else {

                TERM.stdout.writenl("\0cyan(`sm` was installed with sudo. Changing ownership of all files to user: " + process.env.SUDO_USER + " (" + process.env.SUDO_UID + ":" + process.env.SUDO_GID + ")\0)");

                TERM.stdout.writenl("\0cyan(chown " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + binPath + "\0)");
                FS.chownSync(binPath, parseInt(process.env.SUDO_UID), parseInt(process.env.SUDO_GID));
    
                TERM.stdout.writenl("\0cyan(chown -Rf " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + sourcePath + "\0)");
                EXEC("chown -R " + process.env.SUDO_UID + ":" + process.env.SUDO_GID + " " + sourcePath, function(err, stdout, stderr) {
                    if (err) {
                        TERM.stderr.writenl("\0red(ERROR: '" + err + "' while chowning files!\0)");
                        process.exit(1);
                        return;
                    }
    
                    TERM.stderr.writenl("\0magenta(You should now be able to run `sm` WITHOUT `sudo` for user '" + process.env.SUDO_USER + "'!\0)");
                    process.exit(0);
                });
            }
        }
    });
});

