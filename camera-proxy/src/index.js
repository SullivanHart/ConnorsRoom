const CAMERA_URL = "https://camera.saylermag.com/cgi-bin/mjpg/video.cgi";

export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/connor") {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const upstream = await fetch(CAMERA_URL, {
          signal: controller.signal,
          headers: {
            "User-Agent": req.headers.get("User-Agent") || "CF-Proxy",
            "Accept": "multipart/x-mixed-replace"
          }
        });

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            // 🔥 critical for MJPEG
            "Content-Type": upstream.headers.get("Content-Type") || "multipart/x-mixed-replace",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Connection": "keep-alive"
          }
        });
      } catch (err) {
        return new Response("Camera unavailable", { status: 502 });
      } finally {
        clearTimeout(timeout);
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
