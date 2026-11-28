/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: src/index.cjs
 *	@Date: 2025-10-06T17:20:17-07:00 (1759796417)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-28T09:56:04-08:00 (1795888564)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview CommonJS entry point: the generic CLDMV drop-in shim
 * (CLDMV/.github docs/conventions/package-layout.md).
 *
 * It returns what `import` gives: the single distinct exported value when there is one
 * (here the `StubbornTCP` class, which is both the default and the `StubbornTCP` export), so
 * `require("@cldmv/stubborn-tcp")` is the class itself; otherwise the module object. The build
 * copies it verbatim into dist/, where `./index.mjs` resolves to the built entry.
 * @module @cldmv/stubborn-tcp
 */
"use strict";

if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/stubborn-tcp: require() needs Node.js ^20.19.0 or >=22.13.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

// Same exports as `import`. One distinct exported value (aliases of it count once) comes back as that value,
// so require(x)(...) works; anything else comes back as the module object ({ default, ...named }).
const esm = require("./index.mjs");
const values = new Set(
	Object.keys(esm)
		.filter((key) => key !== "__esModule")
		.map((key) => esm[key])
);
module.exports = values.size === 1 ? values.values().next().value : esm;
