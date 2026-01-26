// ViewerCounter Durable Object
export class ViewerCounter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const id =
      request.headers.get("CF-Connecting-IP") ?? crypto.randomUUID();

    const now = Date.now();
    let viewers = (await this.state.storage.get("viewers")) || {};

    // Remove viewers inactive for 30s
    for (const [key, ts] of Object.entries(viewers)) {
      if (now - ts > 30000) delete viewers[key];
    }

    if (request.method === "POST" || request.method === "PUT") {
      viewers[id] = now;
    }

    if (request.method === "DELETE") {
      delete viewers[id];
    }

    await this.state.storage.put("viewers", viewers);

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    };

    return new Response(
      JSON.stringify({ count: Object.keys(viewers).length }),
      { headers }
    );
  }
}

// Main Worker entry
export default {
  async fetch(request, env) {
    // Handle preflight OPTIONS request for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
      });
    }

    const id = env.VIEWERS.idFromName("main-stream");
    return env.VIEWERS.get(id).fetch(request);
  },
};
