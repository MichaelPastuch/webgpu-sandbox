import * as esbuild from "esbuild";

function watchArg() {
	const iterator = process.argv[Symbol.iterator]();
	for (const value of iterator) {
		if (value === "--watch") {
			return true;
		}
	}
	return false;
}

const buildOpts = {
	logLevel: "info",
	entryPoints: ["src/index.ts"],
	bundle: true,
	outfile: "dist/index.js"
};

if (watchArg()) {
	const ctx = await esbuild.context(buildOpts);
	ctx.watch({ delay: 500 });
} else {
	await esbuild.build({
		...buildOpts,
		minify: true
	});
}
