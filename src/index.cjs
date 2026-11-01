/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /src/index.cjs
 *	@Date: 2025-10-06T17:20:17-07:00 (1759796417)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-11-01T13:28:02-08:00 (1793568482)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview CommonJS entry: a thin synchronous re-export of the ESM build via
 * require(esm), copied verbatim to dist/index.cjs (see tsup.config.mjs). Node.js
 * without require(esm) (older than the 22.22.0 floor) gets a clear error pointing at import().
 * @module @cldmv/stubborn-tcp
 */
"use strict";

if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/stubborn-tcp: require() needs Node.js >=22.22.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

module.exports = require("./index.mjs").default;
module.exports.StubbornTCP = module.exports;
module.exports.default = module.exports;
