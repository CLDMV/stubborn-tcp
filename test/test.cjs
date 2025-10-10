/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /test/test.cjs
 *	@Date: 2025-10-06 17:20:17 -07:00 (1759796417)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-06 17:21:28 -07:00 (1759796488)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */


// CommonJS require test

async function testCommonJS() {
	console.log("🧪 Testing @cldmv/stubborn-tcp (CommonJS)");
	console.log("📦 CommonJS require test:");

	const StubbornTCP = await require("../index.cjs");

	function onData(data, socket) {
		console.log("📨 Received data:", data.toString());
	}

	// Test CommonJS require (via dynamic import)
	const client1 = new StubbornTCP(onData);
	console.log("✅ CommonJS require successful, client handle:", client1.Handle);

	// Test that we can create multiple instances
	const client2 = new StubbornTCP(onData, "localhost", 8080);
	console.log("✅ CommonJS require with auto-connect, client handle:", client2.Handle);

	// Clean up
	client1.Close();
	client2.Close();

	console.log("🎉 All CommonJS tests passed!");
}

// Run the test
testCommonJS().catch(console.error);
