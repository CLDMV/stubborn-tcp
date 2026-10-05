/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/connect-failure.test.vitest.mjs
 *	@Date: 2026-10-03T13:00:00-07:00 (1791057600)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T13:00:00-07:00 (1791057600)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Failed connection attempts: socket errors must not crash a process that has no `error`
 * listener (#3), and every attempt that fails before `connect` emits `failToConnect` (#4).
 * All servers and refused ports are on 127.0.0.1.
 */
import { describe, it, expect, afterEach } from "vitest";
import StubbornTCP from "../src/index.mjs";
import { startEchoServer, startSilentServer, closedPort, waitFor, delay } from "./helpers/server.mjs";

const cleanup = [];
afterEach(async () => {
	while (cleanup.length) await cleanup.pop()();
});

/** Create a client that is closed after the test. */
function client(options) {
	const c = new StubbornTCP(options);
	cleanup.push(async () => c.close());
	return c;
}

/** Start a server that is stopped after the test. */
async function server(start = startEchoServer) {
	const s = await start();
	cleanup.push(() => s.stop());
	return s;
}

describe("socket errors without an error listener (#3)", () => {
	it("does not throw, reports the error via debug and onError, and keeps reconnecting", async () => {
		const port = await closedPort();
		const callbackErrors = [];
		const c = client({
			debug: true,
			reconnectDelay: 10,
			maxReconnectDelay: 20,
			onError: (_handle, _instance, error) => callbackErrors.push(error)
		});
		const messages = [];
		c.on("debug", (m) => messages.push(m.slice(c.lCPrefix.length)));
		expect(c.listenerCount("error")).toBe(0);

		c.open("127.0.0.1", port);
		await waitFor(() => c.settings.autoReconnect.attempts >= 3);

		expect(callbackErrors.length).toBeGreaterThanOrEqual(2);
		expect(callbackErrors[0].code).toBe("ECONNREFUSED");
		expect(messages).toContain("no error listener attached; error reported via debug only");
		expect(messages.some((m) => m.startsWith("connection error:"))).toBe(true);
	});

	it("still emits error to a listener attached after construction", async () => {
		const port = await closedPort();
		const c = client({ autoReconnect: false });
		const errors = [];
		c.on("error", (error, handle, instance) => errors.push({ error, handle, instance }));
		c.open("127.0.0.1", port);
		await waitFor(() => errors.length === 1);
		expect(errors[0].error.code).toBe("ECONNREFUSED");
		expect(errors[0].handle).toBe(c.handle);
		expect(errors[0].instance).toBe(c);
	});
});

describe("failToConnect (#4)", () => {
	it("fires once per failed attempt, first and reconnects, while the reconnect schedule continues", async () => {
		const port = await closedPort();
		const c = client({ reconnectDelay: 10, maxReconnectDelay: 20, maxReconnectAttempts: 3 });
		const failures = [];
		let maxReached = null;
		c.on("failToConnect", (error, handle, instance) => failures.push({ error, handle, instance }));
		c.on("maxReconnectAttemptsReached", (attempts) => (maxReached = attempts));

		c.open("127.0.0.1", port);
		await waitFor(() => maxReached !== null);
		await delay(50);

		// The first attempt plus three reconnect attempts, each reported exactly once.
		expect(failures).toHaveLength(4);
		expect(maxReached).toBe(3);
		for (const failure of failures) {
			expect(failure.error.code).toBe("ECONNREFUSED");
			expect(failure.handle).toBe(c.handle);
			expect(failure.instance).toBe(c);
		}
	});

	it("is emitted before error, so a listener can reject a pending connect promise", async () => {
		const port = await closedPort();
		const c = client({ autoReconnect: false });
		const order = [];
		c.on("failToConnect", () => order.push("failToConnect"));
		c.on("error", () => order.push("error"));
		c.open("127.0.0.1", port);
		await waitFor(() => order.length === 2);
		expect(order).toEqual(["failToConnect", "error"]);
	});

	it("rejects a connect() promise built on it (the @cldmv/mxnet-control pattern)", async () => {
		const port = await closedPort();
		const c = client({ autoReconnect: false });
		const connected = new Promise((resolve, reject) => {
			c.once("connect", resolve);
			c.once("failToConnect", (error) => reject(error));
		});
		c.open("127.0.0.1", port);
		await expect(connected).rejects.toMatchObject({ code: "ECONNREFUSED" });
	});

	it("fires with an ETIMEDOUT error when the attempt times out before connecting", async () => {
		// A TLS client against a TCP server that never answers the handshake: the TCP
		// socket connects, but `connect` (secureConnect) never comes, so the idle timeout
		// ends the attempt without a socket error.
		const s = await server(startSilentServer);
		const c = client({ autoReconnect: false, tls: true, connectionTimeout: 100 });
		const failures = [];
		let timeouts = 0;
		c.on("failToConnect", (error) => failures.push(error));
		c.on("timeout", () => timeouts++);
		c.on("error", () => {});
		c.open("127.0.0.1", s.port);
		await waitFor(() => failures.length === 1 && timeouts === 1);
		await delay(50);
		expect(failures).toHaveLength(1);
		expect(failures[0].code).toBe("ETIMEDOUT");
		expect(failures[0].message).toBe(`connection to 127.0.0.1:${s.port} timed out after 100ms`);
	});

	it("is not emitted when an established connection drops or errors", async () => {
		const s = await server();
		const c = client({ reconnectDelay: 10 });
		let failures = 0;
		let connects = 0;
		const errors = [];
		c.on("failToConnect", () => failures++);
		c.on("connect", () => connects++);
		c.on("error", (error) => errors.push(error));
		c.open("127.0.0.1", s.port);
		await waitFor(() => connects === 1 && s.sockets.length === 1);

		// A reset from the server surfaces as a socket error on a connected socket.
		s.sockets[0].resetAndDestroy();
		await waitFor(() => connects === 2);
		expect(errors.length).toBeGreaterThanOrEqual(1);

		// A plain drop, followed by a successful reconnect.
		await waitFor(() => s.sockets.length === 1);
		s.dropClients();
		await waitFor(() => connects === 3);
		expect(failures).toBe(0);
	});

	it("is not emitted when the idle timeout fires on an established connection", async () => {
		// connectionTimeout only covers connecting (#12); an established connection is timed out
		// by the opt-in idleTimeout, and that is not a failed connection attempt.
		const s = await server(startSilentServer);
		const c = client({ autoReconnect: false, idleTimeout: 80 });
		let failures = 0;
		let disconnected = false;
		c.on("failToConnect", () => failures++);
		c.on("disconnect", () => (disconnected = true));
		c.open("127.0.0.1", s.port);
		await waitFor(() => disconnected);
		expect(failures).toBe(0);
	});
});
