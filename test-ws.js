const WebSocket = require("ws");

const ws = new WebSocket("wss://live-chat.sullivan-hart7.workers.dev/chat");

ws.on("open", () => {
  console.log("Connected!");
  ws.send("Hello from Node test");
});

ws.on("message", (msg) => {
  console.log("Received:", msg.toString());
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err);
});
