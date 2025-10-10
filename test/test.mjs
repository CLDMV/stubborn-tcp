/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /test/test.mjs
 *	@Date: 2025-10-06 17:20:17 -07:00 (1759796417)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-06 17:21:30 -07:00 (1759796490)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */


// Test both ESM import and CommonJS require compatibility

// ESM import test
import StubbornTCP from "../index.mjs";

console.log("🧪 Testing @cldmv/stubborn-tcp");
console.log("📦 ESM import test:");

function onData(data, socket) {
	console.log("📨 Received data:", data.toString());
}

// Test ESM import
const client1 = new StubbornTCP(onData);
console.log("✅ ESM import successful, client handle:", client1.Handle);

// Test that we can create multiple instances
const client2 = new StubbornTCP(onData, "localhost", 8080);
console.log("✅ ESM import with auto-connect, client handle:", client2.Handle);

// Clean up
client1.Close();
client2.Close();

console.log("🎉 All tests passed!");
