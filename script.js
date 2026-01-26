const VIEWER_ENDPOINT = "https://viewer-counter.sullivan-hart7.workers.dev";
const HEARTBEAT_INTERVAL = 15000;  // 15s keeps viewers accurate
let heartbeatTimer = null;

// Join stream
async function joinViewer() {
  try {
    console.log("[Viewer] Joining stream...");
    const res = await fetch(VIEWER_ENDPOINT, { method: "POST" });
    if (res.ok) {
      console.log("[Viewer] Successfully joined stream");
    } else {
      console.warn("[Viewer] Failed to join stream:", res.status, res.statusText);
    }
  } catch (e) {
    console.error("[Viewer] Error joining stream:", e);
  }
}

// Leave stream
async function leaveViewer() {
  try {
    console.log("[Viewer] Leaving stream...");
    navigator.sendBeacon(VIEWER_ENDPOINT, "");
    console.log("[Viewer] Sent leave request");
  } catch (e) {
    console.error("[Viewer] Error leaving stream:", e);
  }
}

// Get current viewer count
async function updateViewerCount() {
  try {
    console.log("[Viewer] Fetching viewer count...");
    const res = await fetch(VIEWER_ENDPOINT);
    const data = await res.json();
    const el = document.getElementById("viewer-count");
    if (el) {
      el.textContent = data.count;
      console.log("[Viewer] Current count:", data.count);
    }
  } catch (e) {
    console.warn("[Viewer] Viewer count unavailable", e);
  }
}

// Heartbeat to stay counted
function startHeartbeat() {
  console.log("[Viewer] Starting heartbeat every", HEARTBEAT_INTERVAL / 1000, "seconds");
  heartbeatTimer = setInterval(async () => {
    try {
      console.log("[Viewer] Sending heartbeat...");
      const res = await fetch(VIEWER_ENDPOINT, { method: "PUT" });
      if (!res.ok) console.warn("[Viewer] Heartbeat failed:", res.status);
    } catch (e) {
      console.error("[Viewer] Heartbeat error:", e);
    }
  }, HEARTBEAT_INTERVAL);
}

// Lifecycle
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Viewer] DOM loaded, initializing...");
  await joinViewer();
  startHeartbeat();
  updateViewerCount();
  setInterval(updateViewerCount, 5000);
});

window.addEventListener("beforeunload", leaveViewer);
