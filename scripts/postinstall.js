
const TERM = require("sourcemint-util-js/lib/term");
const CLI = require("../lib/cli");
const INSTALL_COMMAND = require("../lib/commands/install-command");


INSTALL_COMMAND.install(function(err, commandPath) {
    if (err) {
        TERM.stderr.writenl([
            "\0magenta(******************************************************************************************",
            "",
            "\0green(  `sm` has been installed\0) \0red(\0bold(BUT not in your PATH!\0)\0)",
            "",
            "\0bold(  Please add '" + commandPath + "' to your PATH.\0)",
            "",
            "  Alternatively you can run the following:",
            "",
            "    \0bold(sudo " + commandPath + " install-command\0)",
            "",
            "******************************************************************************************\0)"
        ].join("\n"));
        return; // CLI.failAndExit(true);
    }
    TERM.stderr.writenl([
        "",
        "\0green(`sm` has successfully been installed in your PATH!\0)",
        "\0green(To get started run: \0bold(sm -h\0)\0)",
        ""
    ].join("\n"));
});
