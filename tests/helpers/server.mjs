/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/helpers/server.mjs
 *	@Date: 2026-10-03T11:24:46-07:00 (1791051886)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:17-07:00 (1791052757)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * @fileoverview Local test servers and wait helpers shared by the vitest suites.
 *
 * Every server listens on 127.0.0.1 on an ephemeral port, so no test ever reaches the
 * network. `startEchoServer()` replies `ECHO: <data>` to everything it receives;
 * `startSilentServer()` accepts connections and never writes (for idle-timeout tests).
 */
import net from "node:net";

/**
 * Start a TCP server on 127.0.0.1 with an ephemeral port.
 * @param {(socket: net.Socket, ctx: object) => void} [onConnection] - Per-connection handler.
 * @returns {Promise<{port: number, server: net.Server, sockets: net.Socket[], messages: string[], connectionCount: () => number, dropClients: () => void, stop: () => Promise<void>}>}
 */
export async function startServer(onConnection) {
	const sockets = [];
	const messages = [];
	let connections = 0;
	const ctx = { messages };
	const server = net.createServer((socket) => {
		connections++;
		sockets.push(socket);
		socket.on("error", () => {});
		socket.on("close", () => {
			const i = sockets.indexOf(socket);
			if (i > -1) sockets.splice(i, 1);
		});
		if (onConnection) onConnection(socket, ctx);
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const { port } = /** @type {net.AddressInfo} */ (server.address());
	return {
		port,
		server,
		sockets,
		messages,
		connectionCount: () => connections,
		dropClients: () => {
			for (const s of [...sockets]) s.destroy();
		},
		stop: () =>
			new Promise((resolve) => {
				for (const s of [...sockets]) s.destroy();
				server.close(() => resolve());
			})
	};
}

/**
 * Echo server: replies `ECHO: <data>` and records every received chunk in `messages`.
 */
export function startEchoServer() {
	return startServer((socket, ctx) => {
		socket.on("data", (data) => {
			const message = data.toString();
			ctx.messages.push(message);
			socket.write(`ECHO: ${message}`);
		});
	});
}

/**
 * Silent server: accepts connections and records data but never writes back.
 */
export function startSilentServer() {
	return startServer((socket, ctx) => {
		socket.on("data", (data) => ctx.messages.push(data.toString()));
	});
}

/**
 * A port on 127.0.0.1 that nothing is listening on (connections are refused).
 * @returns {Promise<number>}
 */
export async function closedPort() {
	const server = net.createServer();
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = /** @type {net.AddressInfo} */ (server.address());
	await new Promise((resolve) => server.close(resolve));
	return port;
}

/**
 * Poll until `predicate()` is truthy, or reject after `timeout` ms.
 * @param {() => unknown} predicate
 * @param {number} [timeout=5000]
 * @param {number} [interval=10]
 */
export async function waitFor(predicate, timeout = 5000, interval = 10) {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeout) throw new Error(`waitFor timed out after ${timeout}ms`);
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

/**
 * Resolve after `ms` milliseconds.
 * @param {number} ms
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
