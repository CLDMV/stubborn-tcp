/**
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /test/test-cjs-import.cjs
 *	@Date: 2025-10-10 13:52:00 -07:00 (1760129520)
 *	@Author: Nate Hyson <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Hyson <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2025-10-10 09:00:34 -07:00 (1760112034)
 *	-----
 *	@Copyright: Copyright (c) 2013-2025 Catalyzed Motivation Inc. All rights reserved.
 */

/**
 * Test CommonJS import functionality
 */

console.log("🧪 Testing CommonJS Import");
console.log("=".repeat(40));

try {
	// Test default require
	const StubbornTCP1 = require("../index.cjs");
	console.log("✅ Default require successful");
	console.log(`   Type: ${typeof StubbornTCP1}`);
	console.log(`   Constructor: ${StubbornTCP1.name}`);

	// Test named require
	const { StubbornTCP: StubbornTCP2 } = require("../index.cjs");
	console.log("✅ Named destructured require successful");
	console.log(`   Type: ${typeof StubbornTCP2}`);
	console.log(`   Constructor: ${StubbornTCP2.name}`);

	// Test that both are the same
	if (StubbornTCP1 === StubbornTCP2) {
		console.log("✅ Both imports reference the same constructor");
	} else {
		throw new Error("Default and named imports are different!");
	}

	// Test instantiation
	const client1 = new StubbornTCP1({
		debug: false
	});
	console.log("✅ Instance creation with 'new' successful");
	console.log(`   Handle: ${client1.handle}`);
	console.log(`   Connect State: ${client1.connectState}`);

	// Test factory pattern (without 'new')
	const client2 = StubbornTCP1({
		debug: false
	});
	console.log("✅ Instance creation without 'new' successful");
	console.log(`   Handle: ${client2.handle}`);
	console.log(`   Connect State: ${client2.connectState}`);

	// Test that both instances are different
	if (client1.handle !== client2.handle) {
		console.log("✅ Each instance has unique handle");
	} else {
		throw new Error("Instances should have different handles!");
	}

	// Test EventEmitter functionality
	let eventReceived = false;
	client1.on("test-event", () => {
		eventReceived = true;
	});
	client1.emit("test-event");

	if (eventReceived) {
		console.log("✅ EventEmitter functionality working");
	} else {
		throw new Error("EventEmitter not working!");
	}

	// Test basic API
	if (typeof client1.open === "function") {
		console.log("✅ API methods available");
	} else {
		throw new Error("API methods not available!");
	}

	// Cleanup
	client1.close();
	client2.close();

	console.log("\n🎉 All CommonJS import tests passed!");
} catch (error) {
	console.log(`\n❌ CommonJS import test failed: ${error.message}`);
	console.log(error.stack);
	process.exit(1);
}
