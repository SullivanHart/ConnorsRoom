const WS_URL = "wss://live-chat.sullivan-hart7.workers.dev/chat";
const messagesEl = document.getElementById("messages");
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");

// Create WebSocket
const ws = new WebSocket(WS_URL);

// --- Connection Events ---
ws.onopen = () => console.log("[Chat] WebSocket connected to", WS_URL);
ws.onclose = () => console.log("[Chat] WebSocket closed");
ws.onerror = (err) => console.error("[Chat] WebSocket error", err);

// --- Add Message to Window ---
function addMessageToWindow(msg) {
  if (!msg.ts || !msg.text) return; // ignore viewer_count or malformed messages

  const ts = new Date(msg.ts);
  const tsString = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const el = document.createElement("div");
  el.textContent = `[${tsString}] ${msg.text}`;
  el.style.marginBottom = "4px";
  messagesEl.appendChild(el);

  // Auto-scroll
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- Incoming Messages ---
ws.onmessage = (e) => {
  try {
    const msg = JSON.parse(e.data);

    switch(msg.type) {
      case "chat":
        addMessageToWindow(msg);
        break;

      case "viewer_count":
        const el = document.getElementById("viewer-count");
        if (el) el.textContent = msg.count;
        break;

      default:
        console.log("[Chat] Unknown message type:", msg);
    }
  } catch(err) {
    console.error("[Chat] Failed to parse WebSocket message:", err);
  }
};

// --- Sending Messages ---
textInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && ws.readyState === WebSocket.OPEN && textInput.value.trim()) {
    const username = nameInput.value || "anon";
    const payload = { type: "chat", text: `${username}: ${textInput.value.trim()}` };
    ws.send(JSON.stringify(payload));
    console.log("[Chat] Sent message:", payload.text);
    textInput.value = "";
  }
});

// --- Refresh Camera --- 
const img = document.getElementById("camera");

let loading = false;

async function refreshFrame() {
  if (loading) return;
  loading = true;

  const next = new Image();
  next.onload = () => {
    img.src = next.src;   // atomic swap
    loading = false;
  };
  next.onerror = () => {
    loading = false;
  };

  if ( Math.floor( Math.random() * 1500 ) > 1300 ) {
      next.src = "./temp_room.png";
      console.log( "Boo!" );
  } else {
      next.src = "https://camera-proxy.sullivan-hart7.workers.dev/snapshot?t=" + Date.now();
    }
}

setInterval(refreshFrame, 200);
