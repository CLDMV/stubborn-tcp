/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/resolve.test.vitest.mjs
 *	@Date: 2026-11-07T21:36:51-08:00 (1794116211)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-07T21:37:04-08:00 (1794116224)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * The tests import "@cldmv/stubborn-tcp" by name, so the stubborn-tcp-dev condition decides what they run against: src/ for `npm test`, the
 * build in dist/ for `npm run test:dist` (`--mode=dist`). This checks the name resolved to that tree.
 */
import { describe, it, expect } from "vitest";
import * as pkg from "@cldmv/stubborn-tcp";

describe("the @cldmv/stubborn-tcp import", () => {
	it(`resolves to ${import.meta.env.MODE === "dist" ? "dist/" : "src/"}`, async () => {
		const expected = import.meta.env.MODE === "dist" ? await import("../dist/index.mjs") : await import("../src/index.mjs");
		expect(pkg.StubbornTCP).toBe(expected.StubbornTCP);
		expect(pkg.default).toBe(expected.default);
	});
});
