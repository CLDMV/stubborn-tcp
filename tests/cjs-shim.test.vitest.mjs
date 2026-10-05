/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/cjs-shim.test.vitest.mjs
 *	@Date: 2026-10-03T11:28:50-07:00 (1791052130)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:18-07:00 (1791052758)
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

const require = createRequire(import.meta.url);
const shimPath = require.resolve("../src/cjs-shim.cjs");

describe("src/cjs-shim.cjs", () => {
	it("exports the constructor with StubbornTCP and default aliases", () => {
		const cjs = require(shimPath);
		expect(typeof cjs).toBe("function");
		expect(cjs.name).toBe("StubbornTCP");
		expect(cjs.StubbornTCP).toBe(cjs);
		expect(cjs.default).toBe(cjs);
		const instance = cjs({ debug: false });
		expect(instance).toBeInstanceOf(cjs);
		instance.close();
	});

	it("throws ERR_REQUIRE_ESM with guidance when require(esm) is unavailable", () => {
		// process.features is read-only, so this runs in a child Node process with require(esm)
		// turned off — what Node.js before 20.19 / 22.12 looks like to the shim. (v8 coverage
		// is per-process, so these lines show as uncovered in this run's report even though
		// they execute here.)
		const res = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", `require(${JSON.stringify(shimPath)})`], {
			encoding: "utf8"
		});
		expect(res.status).not.toBe(0);
		expect(res.stderr).toContain("ERR_REQUIRE_ESM");
		expect(res.stderr).toContain(
			`@cldmv/stubborn-tcp: require() needs Node.js ^20.19.0 or >=22.12.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
		);
	});
});
