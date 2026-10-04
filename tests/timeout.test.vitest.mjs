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
 * Timeout handling. `connectionTimeout` bounds only the connect phase of an attempt: it is
 * armed when the attempt starts and cleared once the connection is established, so an
 * idle open connection is never timed out by it (#12). An idle timeout on an established
 * connection is a separate opt-in (`idleTimeout` / `setIdleTimeout()`, default off).
 *
 * Every server is a local 127.0.0.1 server on an ephemeral port. A connect that never
 * completes is produced offline by pointing a TLS client at a silent plain-TCP server: the
 * TCP connection opens but the TLS handshake never finishes, so the client never reaches
 * the connected state.
 */
import { describe, it, expect, afterEach } from "vitest";
import StubbornTCP from "../src/index.mjs";
import { startSilentServer, waitFor, delay } from "./helpers/server.mjs";

const cleanup = [];
afterEach(async () => {
	while (cleanup.length) await cleanup.pop()();
});

async function silentServer() {
	const server = await startSilentServer();
	cleanup.push(() => server.stop());
	return server;
}

function trackedClient(options) {
	const client = new StubbornTCP({ autoReconnect: false, ...options });
	cleanup.push(async () => client.close());
	const state = { connects: 0, timeouts: 0, disconnects: 0, debug: [] };
	client.on("connect", () => state.connects++);
	client.on("timeout", () => state.timeouts++);
	client.on("disconnect", () => state.disconnects++);
	client.on("error", () => {});
	client.on("debug", (message) => state.debug.push(message.slice(client.lCPrefix.length)));
	return { client, state };
}

async function connectedClient(server, options) {
	const tracked = trackedClient(options);
	tracked.client.open("127.0.0.1", server.port);
	await waitFor(() => tracked.state.connects === 1);
	return tracked;
}

/** A TLS client against a silent TCP server: the connect phase never completes. */
function stalledTlsClient(server, options) {
	const tracked = trackedClient({ tls: true, tlsOptions: { rejectUnauthorized: false }, ...options });
	tracked.client.open("127.0.0.1", server.port);
	return tracked;
}

describe("connectionTimeout (connect phase only)", () => {
	it("does not time out an idle open connection", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { connectionTimeout: 80 });

		await delay(300);
		expect(state.timeouts).toBe(0);
		expect(state.disconnects).toBe(0);
		expect(client.connectState).toBe(1);
		expect(server.connectionCount()).toBe(1);
	});

	it("does not reconnect an idle open connection when autoReconnect is on", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { connectionTimeout: 80, autoReconnect: true, reconnectDelay: 10 });

		await delay(300);
		expect(state.timeouts).toBe(0);
		expect(state.disconnects).toBe(0);
		expect(state.connects).toBe(1);
		expect(client.connectState).toBe(1);
		expect(server.connectionCount()).toBe(1);
	});

	it("times out a connect that never completes and goes through the normal failure path", async () => {
		const server = await silentServer();
		let callbackTimeouts = 0;
		const { client, state } = stalledTlsClient(server, { connectionTimeout: 80, debug: true, onTimeout: () => callbackTimeouts++ });

		await waitFor(() => state.disconnects === 1);
		expect(state.timeouts).toBe(1);
		expect(callbackTimeouts).toBe(1);
		expect(state.connects).toBe(0);
		expect(client.connectState).toBe(0);
		expect(state.debug).toContain("connection timeout");
	});

	it("reconnects after a connect-phase timeout when autoReconnect is on", async () => {
		const server = await silentServer();
		const { state } = stalledTlsClient(server, { connectionTimeout: 60, autoReconnect: true, reconnectDelay: 10 });

		await waitFor(() => server.connectionCount() >= 2);
		expect(state.timeouts).toBeGreaterThanOrEqual(1);
		expect(state.connects).toBe(0);
	});

	it.each([0, -1])("connectionTimeout %i disables the connect-phase timeout", async (connectionTimeout) => {
		const server = await silentServer();
		const { client, state } = stalledTlsClient(server, { connectionTimeout });

		await delay(200);
		expect(state.timeouts).toBe(0);
		expect(state.disconnects).toBe(0);
		expect(client.connectState).toBe(0);
	});

	it("setTimeout() during a pending connect re-arms the connect-phase timeout", async () => {
		const server = await silentServer();
		const { client, state } = stalledTlsClient(server, { connectionTimeout: 0, debug: true });
		await waitFor(() => server.connectionCount() === 1);

		client.setTimeout(60);
		await waitFor(() => state.timeouts === 1);
		expect(state.debug).toContain("connect timeout set to 60ms");
	});

	it("setTimeout(0) during a pending connect disables the connect-phase timeout", async () => {
		const server = await silentServer();
		const { client, state } = stalledTlsClient(server, { connectionTimeout: 100, debug: true });
		await waitFor(() => server.connectionCount() === 1);

		client.setTimeout(0);
		await delay(250);
		expect(state.timeouts).toBe(0);
		expect(state.debug).toContain("connect timeout disabled");
	});

	it("setTimeout() on a live connection only records the value for the next attempt", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { connectionTimeout: 5000 });

		client.setTimeout(60);
		await delay(200);
		expect(client.settings.connection.timeout).toBe(60);
		expect(state.timeouts).toBe(0);
		expect(client.connectState).toBe(1);
	});

	it("setTimeout() after the connection has closed only records the value", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { debug: true });
		server.dropClients();
		await waitFor(() => state.disconnects === 1);

		client.setTimeout(60);
		expect(client.settings.connection.timeout).toBe(60);
		expect(state.debug).not.toContain("connect timeout set to 60ms");
	});

	it("setTimeout() before connecting only records the value", () => {
		const client = new StubbornTCP();
		client.setTimeout(1234);
		expect(client.settings.connection.timeout).toBe(1234);
		client.close();
	});
});

describe("idleTimeout (opt-in, established connections only)", () => {
	it("is off by default", () => {
		const client = new StubbornTCP();
		expect(client.settings.connection.idleTimeout).toBe(0);
		client.close();
	});

	it("times out an idle open connection and goes through the normal close path", async () => {
		const server = await silentServer();
		let callbackTimeouts = 0;
		const { client, state } = await connectedClient(server, {
			connectionTimeout: 5000,
			idleTimeout: 80,
			debug: true,
			onTimeout: () => callbackTimeouts++
		});

		await waitFor(() => state.disconnects === 1);
		expect(state.timeouts).toBe(1);
		expect(callbackTimeouts).toBe(1);
		expect(client.connectState).toBe(0);
		expect(state.debug).toContain("idle timeout");
	});

	it("works with the connect-phase timeout disabled", async () => {
		const server = await silentServer();
		const { state } = await connectedClient(server, { connectionTimeout: 0, idleTimeout: 80 });

		await waitFor(() => state.disconnects === 1);
		expect(state.timeouts).toBe(1);
	});

	it("does not bound the connect phase", async () => {
		const server = await silentServer();
		const { state } = stalledTlsClient(server, { connectionTimeout: 0, idleTimeout: 60 });

		await delay(200);
		expect(state.timeouts).toBe(0);
		expect(state.disconnects).toBe(0);
	});

	it("setIdleTimeout(n) on a live connection arms the idle timeout", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { debug: true });

		client.setIdleTimeout(80);
		await waitFor(() => state.timeouts === 1);
		expect(client.settings.connection.idleTimeout).toBe(80);
		expect(state.debug).toContain("idle timeout set to 80ms");
	});

	it("setIdleTimeout(0) on a live connection stops a pending idle timeout", async () => {
		const server = await silentServer();
		const { client, state } = await connectedClient(server, { idleTimeout: 100, debug: true });

		client.setIdleTimeout(0);
		await delay(250);
		expect(state.timeouts).toBe(0);
		expect(client.connectState).toBe(1);
		expect(state.debug).toContain("idle timeout disabled");
	});

	it("setIdleTimeout() while not connected only records the value", () => {
		const client = new StubbornTCP();
		client.setIdleTimeout(1234);
		expect(client.settings.connection.idleTimeout).toBe(1234);
		client.close();
	});

	it("setIdleTimeout() during a pending connect does not bound the connect phase", async () => {
		const server = await silentServer();
		const { client, state } = stalledTlsClient(server, { connectionTimeout: 0 });
		await waitFor(() => server.connectionCount() === 1);

		client.setIdleTimeout(60);
		await delay(200);
		expect(state.timeouts).toBe(0);
		expect(client.settings.connection.idleTimeout).toBe(60);
	});
});
