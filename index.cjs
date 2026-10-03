/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /index.cjs
 *	@Date: 2025-10-06 17:20:17 -07:00 (1759796417)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-10 09:00:43 -07:00 (1760112043)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * @fileoverview CommonJS entry point for @cldmv/stubborn-tcp
 * @module @cldmv/stubborn-tcp
 */

"use strict";

// index.cjs is a thin wrapper: it loads stubborn-tcp.mjs through Node's synchronous
// require(esm). Node.js versions without require(esm) would fail with a bare
// ERR_REQUIRE_ESM, so fail early with a message that says what to do instead.
if (!process.features?.require_module) {
	const error = new Error(
		`@cldmv/stubborn-tcp: require() needs Node.js ^20.19.0 or >=22.12.0 (this is ${process.version}). On older Node.js, load the package with import() instead.`
	);
	error.code = "ERR_REQUIRE_ESM";
	throw error;
}

const StubbornTCP = require("./stubborn-tcp.mjs").default;

module.exports = StubbornTCP;
module.exports.StubbornTCP = StubbornTCP;
module.exports.default = StubbornTCP;
