const HISTORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    console.log("[Worker] Incoming request:", url.pathname, req.headers.get("Upgrade"));

    // WebSocket chat + viewer count
    if (url.pathname === "/chat") {
      const id = env.CHAT.idFromName("main-room");
      console.log("[Worker] Forwarding to ChatRoom DO instance");
      return env.CHAT.get(id).fetch(req);
    }

    // HTTP endpoint to fetch recent chat messages (fallback)
    if (url.pathname === "/history") {
      const id = env.CHAT.idFromName("main-room");
      console.log("[Worker] Fetching history from ChatRoom DO instance");
      try {
        const resp = await env.CHAT.get(id).fetch(
          new Request(url, { method: "GET", headers: { "X-History": "true" } })
        );
        console.log("[Worker] History response status:", resp.status);
        return resp;
      } catch (err) {
        console.error("[Worker] Error fetching history:", err);
        return new Response("Error fetching history", { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  }
};

export class ChatRoom {
  constructor(state) {
    this.state = state;
    this.clients = new Map(); // key = clientId, value = WS
    this.messages = [];
    console.log("[ChatRoom] ChatRoom instance created");

    // Load persisted messages
    this.state.blockConcurrencyWhile(async () => {
      this.messages = (await this.state.storage.get("messages")) || [];
      console.log("[ChatRoom] Loaded messages:", this.messages.length);
    });

    // Broadcast viewer count every 5s
    setInterval(() => {
      const msg = { type: "viewer_count", count: this.clients.size };
      for (const ws of this.clients.values()) {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      }
    }, 5000);
  }

  async fetch(req) {
    // HTTP request for recent chat history
    if (req.headers.get("X-History") === "true") {
      const cutoff = Date.now() - HISTORY_WINDOW_MS;
      const recent = this.messages.filter(m => m.ts >= cutoff);
      console.log("[ChatRoom] History request, messages:", recent.length);
      return new Response(JSON.stringify(recent), { headers: { "Content-Type": "application/json" } });
    }

    // WebSocket upgrade
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    // Assign unique clientId
    const clientId = crypto.randomUUID();
    this.clients.set(clientId, server);
    console.log("[ChatRoom] WS connected, clients count:", this.clients.size);

    // Send recent history
    this.sendRecentHistory(server);

    // Send current viewer count
    server.send(JSON.stringify({ type: "viewer_count", count: this.clients.size }));

    // Handle incoming messages
    server.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "chat") {
          const now = Date.now();
          const msg = { ts: now, text: data.text };

          // Save to memory + storage
          this.messages.push(msg);
          const cutoff = now - HISTORY_WINDOW_MS;
          this.messages = this.messages.filter(m => m.ts >= cutoff);
          await this.state.storage.put("messages", this.messages);

          // Broadcast chat
          this.broadcast({ type: "chat", ...msg });
        }
        // ignore other types like heartbeat
      } catch (err) {
        console.error("[ChatRoom] Failed to process message:", err);
      }
    });

    // Handle disconnects
    server.addEventListener("close", () => {
      this.clients.delete(clientId);
      console.log("[ChatRoom] WS disconnected, clients count:", this.clients.size);
    });

    server.addEventListener("error", (err) => {
      this.clients.delete(clientId);
      console.error("[ChatRoom] WS error:", err);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(msg) {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients.values()) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  async sendRecentHistory(ws) {
    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    const recent = this.messages.filter(m => m.ts >= cutoff);
    for (const msg of recent) ws.send(JSON.stringify({ type: "chat", ...msg }));
    console.log("[ChatRoom] Sent", recent.length, "messages to new client");
  }
}
