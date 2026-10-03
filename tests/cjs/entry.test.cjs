/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/cjs/entry.test.cjs
 *	@Date: 2025-10-10T13:52:00-07:00 (1760129520)
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
 * CommonJS entry tests against the BUILT package (dist/), run under Node's own test runner
 * (`node --test`, via `npm run test:cjs`, which builds first) — not Vitest: Vitest loads
 * files through its own module runner, so it cannot show whether a plain `require()` of
 * the package works the way it does for a CommonJS consumer. No network connection is
 * opened here — instances are constructed but never `.open()`'d.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");

test("require() returns the same StubbornTCP constructor as import", async () => {
	const cjs = require("../../dist/index.cjs");
	const esm = await import("../../dist/index.mjs");

	assert.equal(cjs, esm.default);
	assert.equal(cjs.StubbornTCP, esm.default);
	assert.equal(cjs.default, esm.default);
	assert.equal(esm.StubbornTCP, esm.default);
	assert.equal(typeof cjs, "function");
	assert.equal(cjs.name, "StubbornTCP");
});

test("require()'d constructor builds a working instance", () => {
	const StubbornTCP = require("../../dist/index.cjs");

	const client1 = new StubbornTCP({ debug: false });
	assert.ok(client1.handle !== undefined && client1.handle !== null);
	assert.equal(client1.connectState, 0);

	// Factory pattern (without 'new') must also work.
	const client2 = StubbornTCP({ debug: false });
	assert.notEqual(client1.handle, client2.handle);

	let eventReceived = false;
	client1.on("test-event", () => {
		eventReceived = true;
	});
	client1.emit("test-event");
	assert.equal(eventReceived, true);

	assert.equal(typeof client1.open, "function");

	client1.close();
	client2.close();
});

test("require() fails with a clear message where Node.js has no require(esm)", () => {
	// --no-experimental-require-module turns require(esm) off, which is what Node.js
	// versions before 20.19 / 22.12 look like to the entry.
	const res = spawnSync(process.execPath, ["--no-experimental-require-module", "-e", "require('./dist/index.cjs')"], {
		cwd: repoRoot,
		encoding: "utf8"
	});

	assert.notEqual(res.status, 0);
	assert.match(res.stderr, /ERR_REQUIRE_ESM/);
	assert.match(res.stderr, /require\(\) needs Node\.js \^20\.19\.0 or >=22\.12\.0/);
	assert.match(res.stderr, /import\(\)/);
});
