
const ASSERT = require("assert");
const SM = require("../../lib/sm").for(__dirname);


SM.require({
	location: "github.com/sourcemint/util-js/0",
	pm: "npm",
	module: "md5"
}, function(err, MD5) {
	if (err) {
		console.error(err.stack || err);
		process.exit(1);
	}

	ASSERT(MD5.md5("HelloWorld"), "68e109f0f40ca72a15e05cc22786f8e6");

	process.stdout.write("OK\n");
	process.exit(0);
});
