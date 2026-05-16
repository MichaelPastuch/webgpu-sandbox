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

// esbuild.CommonOptions
const buildOpts = {
	logLevel: "info",
	format: "esm",
	entryPoints: ["src/index.ts"],
	external: ["mithril"],
	bundle: true,
	outfile: "dist/index.js",
	loader: {
		".wgsl": "text"
	}
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
