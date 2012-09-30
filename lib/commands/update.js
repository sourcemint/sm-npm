
var ARGS_PARSER = require("sourcemint-util-js/lib/args").Parser;
var CLI = require("../cli");
var PM = require("sourcemint-pm-sm/lib/pm");
var Q = require("sourcemint-util-js/lib/q");


var command = exports["update"] = new ARGS_PARSER();

command.help("Update package/program.");
command.arg(".../[package.json|program.json]").optional();
// DEPRECATED: `sm update` will always fetch latest packages. See below for more info.
//command.option("-l", "--latest").bool().help("Fetch latest remote packages.");
command.option("-n", "--now").bool().help("Aggressively check for latest versions now instead of relying on short-term cached info.");
command.option("-v", "--verbose").bool().help("Show verbose progress.");
command.helpful();

command.action(function (options) {

    var basePath = CLI.checkPackageProgramPathInArguments(options.args);
    if (!basePath) {
        return;
    }

    // Always default to 'latest'. If you don't want latest packages and only want to update packages
    // who's version declaration has changed (and no longer matches installed package) use `sm install`.
    options.latest = true;

    PM.forProgramPath(basePath).then(function(pm) {

/*
return Q.when(require("./status").getStatusTree(pm), function(tree) {

    tree.on("updated-node", function(node, changes) {

//console.log("updated", (node)?node.name:"ALL", changes);

    });

    return tree.refreshStatus(options).then(function() {

console.log(tree.toString());

        return tree.refreshStatus(options).then(function() {

console.log(tree.toString());

        });

    });

});
*/

        return pm.update(options);
    }).then(function() {
        process.exit(0);
    }).fail(function(err) {
        CLI.failAndExit(err);
    });
});
