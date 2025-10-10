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

const { createRequire } = require("module");
const requireESM = createRequire(__filename);

const StubbornTCP = requireESM("./stubborn-tcp.mjs").default;

module.exports = StubbornTCP;
module.exports.StubbornTCP = StubbornTCP;
module.exports.default = StubbornTCP;
