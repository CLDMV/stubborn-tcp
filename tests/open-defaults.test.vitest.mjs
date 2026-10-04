/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/open-defaults.test.vitest.mjs
 *	@Date: 2026-10-03T13:30:00-07:00 (1791059400)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T13:30:00-07:00 (1791059400)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Where open() gets its host and port (#8): explicit arguments, else the last host/port
 * used, which starts out as the constructor's `host` / `port`. All servers are local.
 */
import { describe, it, expect, afterEach } from "vitest";
import StubbornTCP from "../src/index.mjs";
import { startEchoServer, waitFor } from "./helpers/server.mjs";

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

/** Start an echo server that is stopped after the test. */
async function server() {
	const s = await startEchoServer();
	cleanup.push(() => s.stop());
	return s;
}

/** Call open(...args) on `c` and wait for the connect event. */
async function openAndConnect(c, ...args) {
	let connected = false;
	c.once("connect", () => (connected = true));
	expect(c.open(...args)).toBe(c);
	await waitFor(() => connected);
}

describe("open() host/port defaults (#8)", () => {
	it("constructor only: open() with no arguments uses the constructor host and port", async () => {
		const s = await server();
		const c = client({ host: "127.0.0.1", port: s.port, autoReconnect: false });
		await waitFor(() => c.connectState === 1);
		c.close();
		await openAndConnect(c);
		expect(c.settings.connection).toMatchObject({ host: "127.0.0.1", port: s.port });
		expect(c.remotePort).toBe(s.port);
		expect(s.connectionCount()).toBe(2);
	});

	it("arguments only: open(host, port) works without constructor settings", async () => {
		const s = await server();
		const c = client({ autoReconnect: false });
		expect(c.settings.connection).toMatchObject({ host: null, port: null });
		await openAndConnect(c, "127.0.0.1", s.port);
		expect(c.settings.connection).toMatchObject({ host: "127.0.0.1", port: s.port });
		expect(c.remotePort).toBe(s.port);
	});

	it("arguments override the constructor, and a later open() reuses them", async () => {
		const first = await server();
		const second = await server();
		const c = client({ host: "127.0.0.1", port: first.port, autoReconnect: false });
		await waitFor(() => c.connectState === 1);
		c.close();

		await openAndConnect(c, "127.0.0.1", second.port);
		expect(c.remotePort).toBe(second.port);
		c.close();

		await openAndConnect(c);
		expect(c.remotePort).toBe(second.port);
		expect(first.connectionCount()).toBe(1);
		expect(second.connectionCount()).toBe(2);
	});

	it("a port-only argument keeps the constructor host", async () => {
		const s = await server();
		const c = client({ host: "127.0.0.1", port: "not-used", autoReconnect: false });
		await openAndConnect(c, undefined, s.port);
		expect(c.settings.connection).toMatchObject({ host: "127.0.0.1", port: s.port });
	});

	it("neither: open() throws a clear ERR_MISSING_ARGS error and leaves the client idle", () => {
		const c = client({ autoReconnect: false });
		let error;
		try {
			c.open();
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(TypeError);
		expect(error.code).toBe("ERR_MISSING_ARGS");
		expect(error.message).toBe(
			"StubbornTCP.open(): no port to connect to; pass open(host, port) or set the host and port constructor options"
		);
		expect(() => c.open("127.0.0.1")).toThrow(/no port to connect to/);
		expect(c.connectState).toBe(0);
		expect(c.remoteAddress).toBeNull();
	});
});
