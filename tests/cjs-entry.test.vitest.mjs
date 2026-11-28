/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: tests/cjs-entry.test.vitest.mjs
 *	@Date: 2026-10-03T11:28:50-07:00 (1791052130)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-28T09:56:05-08:00 (1795888565)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * The CommonJS shim from src/ (what the `stubborn-tcp-dev` export condition serves to
 * require()). Loaded with Node's native require via createRequire, so it goes through
 * real require(esm) rather than Vitest's module runner. The built dist/index.cjs is
 * covered separately by tests/cjs/entry.test.cjs under `node --test`.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const shimPath = require.resolve("../src/index.cjs");
const esmPath = require.resolve("../src/index.mjs");

describe("src/index.cjs", () => {
	it("exports the StubbornTCP class itself, and it constructs", () => {
		const cjs = require(shimPath);
		expect(typeof cjs).toBe("function");
		expect(cjs.name).toBe("StubbornTCP");
		expect(cjs.StubbornTCP).toBeUndefined();
		expect(cjs.default).toBeUndefined();
		const instance = new cjs({ debug: false });
		expect(instance).toBeInstanceOf(cjs);
		instance.close();
	});

	it("is the ESM default, unmodified, in a fresh process", () => {
		// A fresh Node process so the ESM entry and require() share one module instance (Vitest's
		// module runner would load a second copy) and nothing earlier has touched the class.
		const script = `
			const c = require(${JSON.stringify(shimPath)});
			import(${JSON.stringify(pathToFileURL(esmPath).href)}).then((esm) => {
				console.log(JSON.stringify([c === esm.default, c === esm.StubbornTCP, "StubbornTCP" in c, "default" in c]));
			});
		`;
		const res = spawnSync(process.execPath, ["-e", script], { encoding: "utf8" });
		expect(res.status).toBe(0);
		expect(JSON.parse(res.stdout)).toEqual([true, true, false, false]);
	});

	it("throws ERR_REQUIRE_ESM with guidance when require(esm) is unavailable", () => {
		// process.features is read-only, so this runs in a child Node process with require(esm)
		// turned off — what Node.js without require(esm) looks like to the shim. (v8 coverage
		// is per-process, so these lines show as uncovered in this run's report even though
		// they execute here.)
		const res = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", `require(${JSON.stringify(shimPath)})`], {
			encoding: "utf8"
		});
		expect(res.status).not.toBe(0);
		expect(res.stderr).toContain("ERR_REQUIRE_ESM");
		expect(res.stderr).toContain(
			`@cldmv/stubborn-tcp: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
		);
	});
});
