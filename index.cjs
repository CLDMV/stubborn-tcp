/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /index.cjs
 *	@Date: 2025-10-06 17:17:53 -07:00 (1759796273)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-06 17:20:56 -07:00 (1759796456)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * @fileoverview CommonJS entry point for @cldmv/stubborn-tcp
 * @module @cldmv/stubborn-tcp
 */

module.exports = (async () => {
	const mod = await import("./stubborn-tcp.mjs");
	return mod.default;
})();

module.exports.StubbornTCP = (async () => {
	const mod = await import("./stubborn-tcp.mjs");
	return mod.default;
})();
