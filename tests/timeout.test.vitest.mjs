/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/timeout.test.vitest.mjs
 *	@Date: 2026-10-03T11:18:02-07:00 (1791051482)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:20-07:00 (1791052760)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Connection-timeout handling: `connectionTimeout` of 0 or below disables the idle
 * timeout, and `setTimeout()` changes it on a live connection. Ported from the original
 * plain-node script (which connected to an external host) to a silent local server.
 */
import { describe, it, expect, afterEach } from "vitest";
import StubbornTCP from "../src/index.mjs";
import { startSilentServer, waitFor, delay } from "./helpers/server.mjs";

const cleanup = [];
afterEach(async () => {
	while (cleanup.length) await cleanup.pop()();
});

async function connectedClient(server, options) {
	const client = new StubbornTCP({ autoReconnect: false, ...options });
	cleanup.push(async () => client.close());
	let connected = false;
	let timedOut = false;
	client.on("connect", () => (connected = true));
	client.on("timeout", () => (timedOut = true));
	client.open("127.0.0.1", server.port);
	await waitFor(() => connected);
	return { client, timedOut: () => timedOut };
}

describe("connection timeout", () => {
	it.each([0, -1])("connectionTimeout %i disables the idle timeout", async (connectionTimeout) => {
		const server = await startSilentServer();
		cleanup.push(() => server.stop());
		const { client, timedOut } = await connectedClient(server, { connectionTimeout });

		await delay(150);
		expect(timedOut()).toBe(false);
		expect(client.connectState).toBe(1);
	});

	it("setTimeout(0) on a live connection stops a pending idle timeout", async () => {
		const server = await startSilentServer();
		cleanup.push(() => server.stop());
		const debug = [];
		const { client, timedOut } = await connectedClient(server, { connectionTimeout: 100, debug: true });
		client.on("debug", (message) => debug.push(message));

		client.setTimeout(0);
		await delay(250);
		expect(timedOut()).toBe(false);
		expect(client.connectState).toBe(1);
		expect(debug.some((m) => m.endsWith("timeout disabled"))).toBe(true);
	});

	it("setTimeout(n) on a live connection re-arms the idle timeout", async () => {
		const server = await startSilentServer();
		cleanup.push(() => server.stop());
		const debug = [];
		const { client, timedOut } = await connectedClient(server, { connectionTimeout: 5000, debug: true });
		client.on("debug", (message) => debug.push(message));

		client.setTimeout(80);
		await waitFor(() => timedOut());
		expect(debug.some((m) => m.endsWith("timeout set to 80ms"))).toBe(true);
	});

	it("setTimeout() before connecting only records the value", () => {
		const client = new StubbornTCP();
		client.setTimeout(1234);
		expect(client.settings.connection.timeout).toBe(1234);
		client.close();
	});
});
