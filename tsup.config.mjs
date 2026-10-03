/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tsup.config.mjs
 *	@Date: 2026-10-03T11:23:31-07:00 (1791051811)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:12-07:00 (1791052752)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Bundler config — produces the published dist/ output from src/.
 *
 *  - dist/index.mjs — the real esbuild bundle of src/index.mjs (ESM, minified).
 *  - dist/index.cjs — NOT a second bundle: src/cjs-shim.cjs is copied in verbatim by
 *    onSuccess below. Node's require() loads an ES module synchronously when it has no
 *    top-level await (the ESM build has none), so the shim just requires ./index.mjs.
 *
 * Constraints:
 *  - `target: "node14"` matches package.json `engines` (>=14) — `import` of the ESM build
 *    keeps working there; only require() needs require(esm) (see src/cjs-shim.cjs).
 *  - `keepNames: true` keeps `StubbornTCP.name` (and stack-trace names) intact under
 *    minification.
 *  - `removeNodeProtocol: false` leaves built-in module specifiers exactly as written.
 *
 * Sourcemaps are generated for local debugging but excluded from the published tarball
 * by the `!dist/**\/*.map` entry in package.json `files`.
 */
import { copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.mjs" },
	format: ["esm"],
	outDir: "dist",
	outExtension() {
		return { js: ".mjs" };
	},
	target: "node14",
	platform: "node",
	splitting: false,
	sourcemap: true,
	dts: false,
	clean: true,
	minify: true,
	keepNames: true,
	removeNodeProtocol: false,
	onSuccess() {
		copyFileSync("src/cjs-shim.cjs", "dist/index.cjs");
	}
});
