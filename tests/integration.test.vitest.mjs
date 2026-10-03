/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/integration.test.vitest.mjs
 *	@Date: 2025-10-10T13:47:00-07:00 (1760129220)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:19-07:00 (1791052759)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * End-to-end behaviour against real sockets: a local echo server on 127.0.0.1, an
 * ephemeral port, no network access. Ported from the original plain-node integration
 * script; the two cases that used to reach the network (an RFC 5737 address for the
 * timeout, an unresolvable host name for errors) now use a silent local server and a
 * refused local port instead.
 */
import { describe, it, expect, afterEach } from "vitest";
import StubbornTCP from "../src/index.mjs";
import { startEchoServer, startSilentServer, closedPort, waitFor, delay } from "./helpers/server.mjs";

const cleanup = [];
afterEach(async () => {
	while (cleanup.length) await cleanup.pop()();
});

/** Track a client/server for teardown even when an assertion fails. */
function track(thing) {
	cleanup.push(async () => {
		if (typeof thing.close === "function" && !thing.stop) thing.close();
		else await thing.stop();
	});
	return thing;
}

describe("integration", () => {
	it("connects, exchanges data, and disconnects", async () => {
		const server = track(await startEchoServer());
		const client = track(new StubbornTCP({ debug: true, autoReconnect: false }));
		const received = [];
		let connected = false;
		let disconnected = false;
		client.on("connect", () => (connected = true));
		client.on("data", (data) => received.push(data.toString()));
		client.on("disconnect", () => (disconnected = true));

		client.open("127.0.0.1", server.port);
		await waitFor(() => connected);
		expect(client.connectState).toBe(1);

		expect(client.write("Hello, Integration Test!")).toBe(true);
		await waitFor(() => received.join("").includes("ECHO: Hello, Integration Test!"));

		server.dropClients();
		await waitFor(() => disconnected);
		expect(client.connectState).toBe(0);
	});

	it("reconnects with exponential backoff and gives up after maxReconnectAttempts", async () => {
		const server = await startEchoServer();
		const client = track(
			new StubbornTCP({
				autoReconnect: true,
				reconnectDelay: 40,
				maxReconnectDelay: 100,
				reconnectBackoffFactor: 2,
				maxReconnectAttempts: 3
			})
		);
		let connects = 0;
		let disconnects = 0;
		let errors = 0;
		let gaveUpAfter = null;
		client.on("connect", () => connects++);
		client.on("disconnect", () => disconnects++);
		client.on("error", () => errors++);
		client.on("maxReconnectAttemptsReached", (attempts) => (gaveUpAfter = attempts));

		client.open("127.0.0.1", server.port);
		await waitFor(() => connects === 1);

		await server.stop();
		await waitFor(() => gaveUpAfter !== null);

		expect(gaveUpAfter).toBe(3);
		expect(disconnects).toBe(4); // the dropped connection + 3 failed reconnects
		expect(errors).toBe(3);
		// 40 -> 80 -> 100 (capped at maxReconnectDelay)
		expect(client.settings.autoReconnect.currentDelay).toBe(100);
	});

	it("sends heartbeats, cycling through the heartbeat functions", async () => {
		const server = track(await startEchoServer());
		const client = track(new StubbornTCP({ autoReconnect: false }));
		const sent = [];
		let beats = 0;
		client.on("heartbeat", () => beats++);
		client.on("connect", () => {
			client.enableHeartbeat({
				interval: 40,
				functions: [(c) => (sent.push("HB1"), c.write("HB1;")), (c) => (sent.push("HB2"), c.write("HB2;"))],
				resetOnActivity: true
			});
		});

		client.open("127.0.0.1", server.port);
		await waitFor(() => beats >= 3);
		expect(sent.slice(0, 3)).toEqual(["HB1", "HB2", "HB1"]);
		await waitFor(() => server.messages.join("").includes("HB2;"));
	});

	it("applies socket options and exposes the socket addresses", async () => {
		const server = track(await startEchoServer());
		const client = track(
			new StubbornTCP({
				keepAlive: true,
				keepAliveInitialDelay: 1000,
				noDelay: true,
				connectionTimeout: 5000,
				autoReconnect: false
			})
		);
		let connected = false;
		client.on("connect", () => (connected = true));
		client.open("127.0.0.1", server.port);
		await waitFor(() => connected);

		client.setKeepAlive(false);
		client.setNoDelay(false);
		client.setTimeout(10000);
		expect(client.settings.socket.keepAlive).toBe(false);
		expect(client.settings.socket.noDelay).toBe(false);
		expect(client.settings.connection.timeout).toBe(10000);

		expect(client.localAddress).toBe("127.0.0.1");
		expect(typeof client.localPort).toBe("number");
		expect(client.remoteAddress).toBe("127.0.0.1");
		expect(client.remotePort).toBe(server.port);
	});

	it("emits timeout when the connection stays idle past connectionTimeout", async () => {
		const server = track(await startSilentServer());
		let timeouts = 0;
		let disconnected = false;
		const client = track(
			new StubbornTCP({
				connectionTimeout: 100,
				autoReconnect: false,
				onTimeout: () => timeouts++
			})
		);
		let timeoutEvent = false;
		client.on("timeout", () => (timeoutEvent = true));
		client.on("disconnect", () => (disconnected = true));

		client.open("127.0.0.1", server.port);
		await waitFor(() => disconnected);
		expect(timeoutEvent).toBe(true);
		expect(timeouts).toBe(1);
	});

	it("reports connection errors through both the onError callback and the error event", async () => {
		const port = await closedPort();
		const callbackErrors = [];
		const eventErrors = [];
		const client = track(
			new StubbornTCP({
				autoReconnect: false,
				onError: (handle, instance, error) => callbackErrors.push({ handle, instance, error })
			})
		);
		client.on("error", (error) => eventErrors.push(error));

		client.open("127.0.0.1", port);
		await waitFor(() => callbackErrors.length > 0 && eventErrors.length > 0);

		expect(eventErrors[0].code).toBe("ECONNREFUSED");
		expect(callbackErrors[0].handle).toBe(client.handle);
		expect(callbackErrors[0].instance).toBe(client);
		expect(callbackErrors[0].error).toBe(eventErrors[0]);
	});

	it("handles several clients at once", async () => {
		const server = track(await startEchoServer());
		const clients = [0, 1, 2].map(() => track(new StubbornTCP({ autoReconnect: false })));
		const received = clients.map(() => []);
		let connected = 0;
		clients.forEach((client, i) => {
			client.on("connect", () => connected++);
			client.on("data", (data) => received[i].push(data.toString()));
			client.open("127.0.0.1", server.port);
		});
		await waitFor(() => connected === 3);

		clients.forEach((client, i) => client.write(`Message from client ${i}`));
		await waitFor(() => received.every((r, i) => r.join("").includes(`Message from client ${i}`)));
	});

	it("transfers a large payload", async () => {
		const server = track(await startEchoServer());
		const client = track(new StubbornTCP({ autoReconnect: false }));
		let data = "";
		let connected = false;
		client.on("connect", () => (connected = true));
		client.on("data", (chunk) => (data += chunk.toString()));
		client.open("127.0.0.1", server.port);
		await waitFor(() => connected);

		const large = "X".repeat(100_000);
		client.write(large);
		await waitFor(() => (data.match(/X/g) || []).length >= large.length);
		await delay(10);
		expect(data.startsWith("ECHO: ")).toBe(true);
	});
});
