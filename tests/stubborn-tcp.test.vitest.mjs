/**
 *
 *	@Project: @cldmv/stubborn-tcp
 *	@Filename: /tests/stubborn-tcp.test.vitest.mjs
 *	@Date: 2026-10-03T11:26:27-07:00 (1791051987)
 *	@Author: Nate Corcoran <CLDMV>
 *	@Email: <Shinrai@users.noreply.github.com>
 *	-----
 *	@Last modified by: Nate Corcoran <CLDMV> (Shinrai@users.noreply.github.com)
 *	@Last modified time: 2026-10-03T11:39:21-07:00 (1791052761)
 *	-----
 *	@Copyright: Copyright (c) 2013-2026 Catalyzed Motivation Inc. All rights reserved.
 *
 */

/**
 * Characterization tests for the StubbornTCP API surface: construction and defaults,
 * legacy aliases and callbacks, heartbeat management, socket/TLS accessors, write and
 * close semantics, and reconnect bookkeeping. Real sockets only ever talk to local
 * servers on 127.0.0.1.
 */
import { describe, it, expect, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import tls from "node:tls";
import StubbornTCP, { StubbornTCP as NamedStubbornTCP } from "../src/index.mjs";
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

/** Open `c` against `port` and wait for the connect event. */
async function connect(c, port) {
	let connected = false;
	c.once("connect", () => (connected = true));
	c.open("127.0.0.1", port);
	await waitFor(() => connected);
}

describe("exports", () => {
	it("default and named exports are the same constructor", () => {
		expect(NamedStubbornTCP).toBe(StubbornTCP);
		expect(StubbornTCP.name).toBe("StubbornTCP");
	});
});

describe("construction", () => {
	it("works with and without new, and inherits from EventEmitter", () => {
		const a = client();
		const b = StubbornTCP();
		cleanup.push(async () => b.close());
		expect(a).toBeInstanceOf(StubbornTCP);
		expect(b).toBeInstanceOf(StubbornTCP);
		expect(a).toBeInstanceOf(EventEmitter);
		expect(StubbornTCP.prototype.constructor).toBe(StubbornTCP);
	});

	it("applies documented defaults", () => {
		const c = client();
		expect(c.connectState).toBe(0);
		expect(c.openState).toBe(1);
		expect(c.isSecure).toBe(false);
		expect(c.instance).toBeUndefined();
		expect(c.settings).toMatchObject({
			debug: false,
			autoReconnect: {
				enabled: true,
				delay: 1000,
				currentDelay: 1000,
				maxDelay: 30000,
				backoffFactor: 1.5,
				maxAttempts: -1,
				attempts: 0,
				isReconnecting: false,
				timer: null
			},
			connection: { host: null, port: null, timeout: 10000 },
			socket: { keepAlive: true, keepAliveInitialDelay: 60000, noDelay: true },
			tls: { enabled: false, options: {} },
			heartbeat: { interval: 30000, resetOnActivity: true, enabled: false, timer: null, functions: [], currentFunctionIndex: 0 }
		});
		expect(c.functions).toEqual({ rxFunc: null, onError: null, onTimeout: null });
	});

	it("records option values and callbacks", () => {
		const rxFunc = () => {};
		const onConnect = () => {};
		const onDisconnect = () => {};
		const onError = () => {};
		const onTimeout = () => {};
		const hb = () => {};
		const c = client({
			rxFunc,
			onConnect,
			onDisconnect,
			onError,
			onTimeout,
			heartbeatFunc: hb,
			instance: "inst",
			tls: true,
			tlsOptions: { servername: "x" }
		});
		expect(c.functions).toEqual({ rxFunc, onConnect, onDisconnect, onError, onTimeout });
		expect(c.settings.heartbeat.functions).toEqual([hb]);
		expect(c.instance).toBe("inst");
		expect(c.isSecure).toBe(true);
		expect(c.settings.tls.options).toEqual({ servername: "x" });
	});

	it("copies an array of heartbeat functions", () => {
		const fns = [() => {}, () => {}];
		const c = client({ heartbeatFunc: fns });
		expect(c.settings.heartbeat.functions).toEqual(fns);
		expect(c.settings.heartbeat.functions).not.toBe(fns);
	});

	it("ignores non-function callbacks", () => {
		const c = client({ rxFunc: "nope", onError: 1, onConnect: {}, onDisconnect: null, onTimeout: true });
		expect(c.functions).toEqual({ rxFunc: null, onError: null, onTimeout: null });
	});

	it("gives each instance a five-digit handle, mirrored on Handle and the log prefix", () => {
		const c = client();
		expect(c.handle).toBeGreaterThanOrEqual(10000);
		expect(c.handle).toBeLessThan(100000);
		expect(c.Handle).toBe(c.handle);
		expect(c.lCPrefix).toBe(`[StubbornTCP#${c.handle}] `);
	});

	it("auto-connects when host and port are supplied", async () => {
		const s = await server();
		const c = new StubbornTCP({ host: "127.0.0.1", port: s.port, autoReconnect: false });
		cleanup.push(async () => c.close());
		await waitFor(() => c.connectState === 1);
		expect(c.settings.connection).toMatchObject({ host: "127.0.0.1", port: s.port });
	});

	it("does not auto-connect with only one of host/port", () => {
		const c = client({ host: "127.0.0.1" });
		expect(c.settings.connection.host).toBeNull();
	});
});

describe("legacy aliases", () => {
	it("exposes PascalCase aliases for the methods", () => {
		const c = client();
		expect(c.Write).toBe(c.write);
		expect(c.Close).toBe(c.close);
		expect(c.Open).toBe(c.open);
		expect(c.ResetReconnectState).toBe(c.resetReconnectState);
		expect(c.EnableHeartbeat).toBe(c.enableHeartbeat);
		expect(c.SetTxInterMsgDelay).toBe(c.setTxInterMsgDelay);
		expect(c.AddRxFraming).toBe(c.addRxFraming);
		expect(c.AddRxHTTPFraming).toBe(c.addRxHTTPFraming);
	});

	it("OnConnectFunc / OnDisconnectFunc accept functions and clear on anything else", () => {
		const c = client();
		const fn = () => {};
		expect(c.OnConnectFunc).toBeUndefined();
		c.OnConnectFunc = fn;
		c.OnDisconnectFunc = fn;
		expect(c.OnConnectFunc).toBe(fn);
		expect(c.OnDisconnectFunc).toBe(fn);
		c.OnConnectFunc = "x";
		c.OnDisconnectFunc = 42;
		expect(c.OnConnectFunc).toBeNull();
		expect(c.OnDisconnectFunc).toBeNull();
	});

	it("not-implemented methods only emit a debug message", () => {
		const c = client({ debug: true });
		const messages = [];
		c.on("debug", (m, handle, instance) => messages.push({ m, handle, instance }));
		c.setTxInterMsgDelay(10);
		c.addRxFraming();
		c.addRxHTTPFraming();
		expect(messages.map((x) => x.m)).toEqual([
			`${c.lCPrefix}setTxInterMsgDelay() called - not implemented`,
			`${c.lCPrefix}addRxFraming() called - not implemented`,
			`${c.lCPrefix}addRxHTTPFraming() called - not implemented`
		]);
		expect(messages[0].handle).toBe(c.handle);
		expect(messages[0].instance).toBe(c);
	});

	it("emits no debug events when debug is off", () => {
		const c = client();
		const messages = [];
		c.on("debug", (m) => messages.push(m));
		c.addRxFraming();
		expect(messages).toEqual([]);
	});
});

describe("accessors without a connection", () => {
	it("returns null addresses and non-TLS defaults", () => {
		const c = client();
		expect(c.localAddress).toBeNull();
		expect(c.localPort).toBeNull();
		expect(c.remoteAddress).toBeNull();
		expect(c.remotePort).toBeNull();
		expect(c.getPeerCertificate()).toBeNull();
		expect(c.getCipher()).toBeNull();
		expect(c.isAuthorized()).toBe(true);
		expect(c.getAuthorizationError()).toBeNull();
	});

	it("TLS accessors on a TLS-configured client with no socket", () => {
		const c = client({ tls: true });
		expect(c.getPeerCertificate()).toBeNull();
		expect(c.getCipher()).toBeNull();
		expect(c.isAuthorized()).toBe(true);
		expect(c.getAuthorizationError()).toBeNull();
	});

	it("TLS accessors on a plain TCP connection fall back to non-TLS values", async () => {
		const s = await server();
		const c = client({ autoReconnect: false });
		await connect(c, s.port);
		expect(c.getPeerCertificate()).toBeNull();
		expect(c.getCipher()).toBeNull();
		expect(c.isAuthorized()).toBe(true);
		expect(c.getAuthorizationError()).toBeNull();
	});
});

describe("socket settings", () => {
	it("setKeepAlive / setNoDelay before connecting only record the values", () => {
		const c = client();
		c.setKeepAlive(false, 5000);
		c.setNoDelay(false);
		expect(c.settings.socket).toEqual({ keepAlive: false, keepAliveInitialDelay: 5000, noDelay: false });
		c.setKeepAlive(true);
		expect(c.settings.socket.keepAliveInitialDelay).toBe(5000);
	});

	it("applies setKeepAlive / setNoDelay to a live connection", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, debug: true });
		await connect(c, s.port);
		const messages = [];
		c.on("debug", (m) => messages.push(m));
		c.setKeepAlive(true, 2000);
		c.setKeepAlive(false);
		c.setNoDelay(true);
		c.setNoDelay(false);
		expect(messages.map((m) => m.slice(c.lCPrefix.length))).toEqual([
			"keep-alive enabled",
			"keep-alive disabled",
			"no-delay enabled",
			"no-delay disabled"
		]);
	});

	it("connects with keepAlive and noDelay turned off", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, keepAlive: false, noDelay: false });
		await connect(c, s.port);
		expect(c.connectState).toBe(1);
	});
});

describe("write", () => {
	it("returns false when not connected", () => {
		const c = client({ debug: true });
		const messages = [];
		c.on("debug", (m) => messages.push(m));
		expect(c.write("x")).toBe(false);
		expect(messages.at(-1)).toBe(`${c.lCPrefix}write called but not connected`);
	});

	it("returns false when the socket rejects the data", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, debug: true });
		await connect(c, s.port);
		const messages = [];
		c.on("debug", (m) => messages.push(m));
		expect(c.write(12345)).toBe(false);
		expect(messages.at(-1)).toMatch(/write error: /);
	});

	it("writes strings and buffers", async () => {
		const s = await server();
		const c = client({ autoReconnect: false });
		await connect(c, s.port);
		expect(c.write("a")).toBe(true);
		expect(c.write(Buffer.from("b"))).toBe(true);
		await waitFor(() => s.messages.join("").includes("b"));
	});
});

describe("callbacks", () => {
	it("invokes rxFunc, onConnect and onDisconnect with the documented arguments", async () => {
		const s = await server();
		const calls = [];
		const c = client({
			autoReconnect: false,
			rxFunc: (data, instance) => calls.push(["rx", data.toString(), instance]),
			onConnect: (handle, instance) => calls.push(["connect", handle, instance]),
			onDisconnect: (handle, instance) => calls.push(["disconnect", handle, instance])
		});
		await connect(c, s.port);
		c.write("ping");
		await waitFor(() => calls.some((x) => x[0] === "rx"));
		s.dropClients();
		await waitFor(() => calls.some((x) => x[0] === "disconnect"));

		expect(calls[0]).toEqual(["connect", c.handle, c]);
		expect(calls.find((x) => x[0] === "rx")).toEqual(["rx", "ECHO: ping", c]);
		expect(calls.at(-1)).toEqual(["disconnect", c.handle, c]);
	});

	it("swallows exceptions thrown by callbacks and reports them via debug", async () => {
		const s = await server(startSilentServer);
		const boom = () => {
			throw new Error("boom");
		};
		const c = client({
			autoReconnect: false,
			debug: true,
			connectionTimeout: 80,
			rxFunc: boom,
			onConnect: boom,
			onDisconnect: boom,
			onTimeout: boom
		});
		const messages = [];
		c.on("debug", (m) => messages.push(m.slice(c.lCPrefix.length)));
		await connect(c, s.port);
		await waitFor(() => s.sockets.length === 1);
		s.sockets[0].write("data");
		await waitFor(() => messages.includes("connection closed"));
		await delay(10);

		expect(messages).toEqual(
			expect.arrayContaining([
				"Error in OnConnectFunc: boom",
				"Error in rxFunc: boom",
				"Error in onTimeout callback: boom",
				"Error in OnDisconnectFunc: boom"
			])
		);
	});

	it("swallows an exception thrown by onError", async () => {
		const port = await closedPort();
		const c = client({
			autoReconnect: false,
			debug: true,
			onError: () => {
				throw new Error("boom");
			}
		});
		const messages = [];
		c.on("debug", (m) => messages.push(m.slice(c.lCPrefix.length)));
		c.on("error", () => {});
		c.open("127.0.0.1", port);
		await waitFor(() => messages.includes("Error in onError: boom"));
	});
});

describe("heartbeat", () => {
	it("enableHeartbeat updates settings; functions may be a single function or an array", () => {
		const c = client();
		const f1 = () => {};
		const f2 = () => {};
		c.enableHeartbeat({ interval: 500, functions: f1, resetOnActivity: false });
		expect(c.settings.heartbeat).toMatchObject({ enabled: true, interval: 500, functions: [f1], resetOnActivity: false });
		c.settings.heartbeat.currentFunctionIndex = 1;
		c.enableHeartbeat({ functions: [f1, f2] });
		expect(c.settings.heartbeat.functions).toEqual([f1, f2]);
		expect(c.settings.heartbeat.currentFunctionIndex).toBe(0);
		expect(c.settings.heartbeat.interval).toBe(500);
		c.enableHeartbeat();
		expect(c.settings.heartbeat.enabled).toBe(true);
		// Not connected, so no timer is started.
		expect(c.settings.heartbeat.timer).toBeNull();
	});

	it("addHeartbeatFunction / clearHeartbeatFunctions manage the cycle", () => {
		const c = client();
		const f1 = () => {};
		const f2 = () => {};
		const f3 = () => {};
		c.addHeartbeatFunction(f1);
		c.settings.heartbeat.currentFunctionIndex = 1;
		c.addHeartbeatFunction([f2, f3]);
		expect(c.settings.heartbeat.functions).toEqual([f1, f2, f3]);
		expect(c.settings.heartbeat.currentFunctionIndex).toBe(0);
		c.clearHeartbeatFunctions();
		expect(c.settings.heartbeat.functions).toEqual([]);
		expect(c.settings.heartbeat.currentFunctionIndex).toBe(0);
	});

	it("disableHeartbeat stops a running heartbeat", async () => {
		const s = await server();
		const c = client({ autoReconnect: false });
		await connect(c, s.port);
		c.enableHeartbeat({ interval: 1000 });
		expect(c.settings.heartbeat.timer).not.toBeNull();
		c.disableHeartbeat();
		expect(c.settings.heartbeat.enabled).toBe(false);
		expect(c.settings.heartbeat.timer).toBeNull();
		c.disableHeartbeat();
		expect(c.settings.heartbeat.timer).toBeNull();
	});

	it("starts on connect when heartbeatEnabled is set, and emits heartbeat with no functions", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, heartbeatEnabled: true, heartbeatInterval: 30 });
		const beats = [];
		c.on("heartbeat", (handle, instance) => beats.push([handle, instance]));
		await connect(c, s.port);
		await waitFor(() => beats.length >= 2);
		expect(beats[0]).toEqual([c.handle, c]);
	});

	it("emits heartbeatFailed when a heartbeat function throws, skips non-functions, and keeps cycling", async () => {
		const s = await server();
		const err = new Error("hb failed");
		const calls = [];
		const c = client({
			autoReconnect: false,
			heartbeatEnabled: true,
			heartbeatInterval: 30,
			heartbeatFunc: [
				() => {
					calls.push(0);
					throw err;
				},
				"not a function",
				() => calls.push(2)
			]
		});
		const failures = [];
		c.on("heartbeatFailed", (e, index, handle, instance) => failures.push([e, index, handle, instance]));
		await connect(c, s.port);
		await waitFor(() => calls.length >= 3);
		expect(calls.slice(0, 3)).toEqual([0, 2, 0]);
		expect(failures[0]).toEqual([err, 0, c.handle, c]);
	});

	it("received data and writes push the next heartbeat back when resetOnActivity is on", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, heartbeatEnabled: true, heartbeatInterval: 150 });
		let beats = 0;
		c.on("heartbeat", () => beats++);
		await connect(c, s.port);
		// Keep the connection busy for longer than one interval.
		for (let i = 0; i < 6; i++) {
			c.write("x");
			await delay(40);
		}
		expect(beats).toBe(0);
	});

	it("activity does not reset the timer when resetOnActivity is off", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, heartbeatEnabled: true, heartbeatInterval: 100, heartbeatResetOnActivity: false });
		let beats = 0;
		c.on("heartbeat", () => beats++);
		await connect(c, s.port);
		for (let i = 0; i < 6; i++) {
			c.write("x");
			await delay(40);
		}
		expect(beats).toBeGreaterThanOrEqual(1);
	});

	it("stops the heartbeat when the connection closes", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, heartbeatEnabled: true, heartbeatInterval: 1000 });
		await connect(c, s.port);
		expect(c.settings.heartbeat.timer).not.toBeNull();
		let disconnected = false;
		c.on("disconnect", () => (disconnected = true));
		s.dropClients();
		await waitFor(() => disconnected);
		expect(c.settings.heartbeat.timer).toBeNull();
	});
});

describe("open / close / reconnect", () => {
	it("open() on a connected client closes the old connection and connects again", async () => {
		// Known pre-existing bug pinned here: the replaced socket keeps its listeners, so its
		// late "close" event lands AFTER the new socket connected and resets connectState to 0
		// (write() then returns false although the new socket is up). close() also leaves
		// autoReconnect disabled for the new connection. When fixed, update this test.
		const s = await server();
		const c = client({ autoReconnect: false });
		await connect(c, s.port);
		const events = [];
		c.on("connect", () => events.push("connect"));
		c.on("disconnect", () => events.push("disconnect"));
		expect(c.open("127.0.0.1", s.port)).toBe(c);
		await waitFor(() => events.length === 2);
		expect(events).toEqual(["connect", "disconnect"]);
		expect(s.connectionCount()).toBe(2);
		expect(c.connectState).toBe(0);
		expect(c.write("x")).toBe(false);
		expect(c.settings.autoReconnect.enabled).toBe(false);
	});

	it("close() disables auto-reconnect, clears timers and resets reconnect state", async () => {
		const s = await server();
		const c = client({ reconnectDelay: 5000, heartbeatEnabled: true });
		await connect(c, s.port);
		s.dropClients();
		await waitFor(() => c.settings.autoReconnect.timer !== null);
		c.settings.autoReconnect.currentDelay = 999;
		c.close();
		expect(c.settings.autoReconnect.enabled).toBe(false);
		expect(c.settings.autoReconnect.timer).toBeNull();
		expect(c.settings.autoReconnect.attempts).toBe(0);
		expect(c.settings.autoReconnect.currentDelay).toBe(5000);
		expect(c.settings.heartbeat.enabled).toBe(false);
		expect(c.connectState).toBe(0);
		// Closing a client that has nothing open is a no-op.
		c.close();
	});

	it("resetReconnectState resets attempts and delay", () => {
		const c = client({ reconnectDelay: 250 });
		c.settings.autoReconnect.attempts = 4;
		c.settings.autoReconnect.currentDelay = 4000;
		c.resetReconnectState();
		expect(c.settings.autoReconnect.attempts).toBe(0);
		expect(c.settings.autoReconnect.currentDelay).toBe(250);
	});

	it("reconnects after the server drops the connection and resets the backoff on success", async () => {
		const s = await server();
		const c = client({ reconnectDelay: 30, reconnectBackoffFactor: 2 });
		let connects = 0;
		c.on("connect", () => connects++);
		await connect(c, s.port);
		s.dropClients();
		await waitFor(() => connects === 2);
		expect(c.settings.autoReconnect.attempts).toBe(0);
		expect(c.settings.autoReconnect.currentDelay).toBe(30);
		expect(s.connectionCount()).toBe(2);
	});

	it("keeps retrying a refused port when maxReconnectAttempts is unlimited", async () => {
		const port = await closedPort();
		const c = client({ reconnectDelay: 10, maxReconnectDelay: 20 });
		let errors = 0;
		c.on("error", () => errors++);
		c.open("127.0.0.1", port);
		await waitFor(() => errors >= 4);
		expect(c.settings.autoReconnect.attempts).toBeGreaterThanOrEqual(4);
		expect(c.settings.autoReconnect.currentDelay).toBe(20);
	});

	it("does not reconnect when autoReconnect is false", async () => {
		const s = await server();
		const c = client({ autoReconnect: false, reconnectDelay: 10 });
		await connect(c, s.port);
		let disconnected = false;
		c.on("disconnect", () => (disconnected = true));
		s.dropClients();
		await waitFor(() => disconnected);
		await delay(60);
		expect(c.connectState).toBe(0);
		expect(s.connectionCount()).toBe(1);
	});

	it("the scheduled reconnect is skipped if auto-reconnect was turned off meanwhile", async () => {
		const s = await server();
		const c = client({ reconnectDelay: 40 });
		await connect(c, s.port);
		s.dropClients();
		await waitFor(() => c.settings.autoReconnect.isReconnecting);
		c.settings.autoReconnect.enabled = false;
		await delay(80);
		expect(c.settings.autoReconnect.isReconnecting).toBe(false);
		expect(s.connectionCount()).toBe(1);
	});
});

describe("TLS", () => {
	// TLS 1.2 pre-shared-key ciphers need no certificate, so the test needs no key/cert
	// fixtures or openssl: client and server just share a key in memory.
	const psk = Buffer.from("0123456789abcdef0123456789abcdef", "hex");
	const ciphers = "PSK-AES128-GCM-SHA256";

	async function startTlsEchoServer() {
		const server = tls.createServer(
			{ pskCallback: (_socket, identity) => (identity === "client" ? psk : null), ciphers, maxVersion: "TLSv1.2" },
			(socket) => {
				socket.on("error", () => {});
				socket.on("data", (data) => socket.write(`ECHO: ${data}`));
			}
		);
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		cleanup.push(() => new Promise((resolve) => server.close(() => resolve())));
		return server.address().port;
	}

	const tlsOptions = {
		pskCallback: () => ({ psk, identity: "client" }),
		ciphers,
		maxVersion: "TLSv1.2",
		checkServerIdentity: () => undefined
	};

	it("connects over TLS, exchanges data, and exposes the TLS session details", async () => {
		const port = await startTlsEchoServer();
		const c = client({ autoReconnect: false, debug: true, tls: true, tlsOptions });
		const events = [];
		const debug = [];
		const received = [];
		c.on("debug", (m) => debug.push(m.slice(c.lCPrefix.length)));
		c.on("secureConnect", (handle, instance) => events.push(["secureConnect", handle, instance]));
		c.on("keylog", (line, handle, instance) => events.push(["keylog", Buffer.isBuffer(line), handle, instance]));
		c.on("data", (data) => received.push(data.toString()));
		await connect(c, port);
		await waitFor(() => events.some((e) => e[0] === "secureConnect"));

		expect(c.isSecure).toBe(true);
		expect(c.getCipher()).toMatchObject({ name: ciphers, version: "TLSv1.2" });
		expect(c.getPeerCertificate()).toEqual({});
		expect(c.isAuthorized()).toBe(true);
		expect(c.getAuthorizationError()).toBeNull();
		expect(events.find((e) => e[0] === "secureConnect")).toEqual(["secureConnect", c.handle, c]);
		expect(events.find((e) => e[0] === "keylog")).toEqual(["keylog", true, c.handle, c]);
		expect(debug).toEqual(expect.arrayContaining(["TLS secure connection established", "TLS certificate authorized"]));

		c.write("secret");
		await waitFor(() => received.join("").includes("ECHO: secret"));
	});

	it("auto-connects over TLS from the constructor", async () => {
		const port = await startTlsEchoServer();
		const c = new StubbornTCP({ host: "127.0.0.1", port, autoReconnect: false, tls: true, tlsOptions });
		cleanup.push(async () => c.close());
		await waitFor(() => c.connectState === 1);
		expect(c.getCipher().name).toBe(ciphers);
	});
});
