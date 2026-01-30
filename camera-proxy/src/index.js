const CAMERA_URL =
  "https://camera.saylermag.com/cgi-bin/jpg/image.cgi";

const CACHE_TTL_MS = 200; // ~5 FPS

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== "/snapshot") {
      return new Response("Not found", { status: 404 });
    }

    const cache = caches.default;
    const cacheKey = new Request("https://camera.local/latest.jpg");

    // Serve cached frame if available
	const cached = await cache.match(cacheKey);
	if (cached) {
	ctx.waitUntil(updateCache(cache, cacheKey));
	return cached;
	}

	return await updateCache(cache, cacheKey);

	async function updateCache(cache, key) {
	const upstream = await fetch(CAMERA_URL, {
		headers: {
		"User-Agent": "CF-Camera",
		"Accept": "image/jpeg"
		}
	});

	if (!upstream.ok) {
		return new Response("Camera unavailable", { status: 502 });
	}

	const resp = new Response(upstream.body, {
		headers: {
		"Content-Type": "image/jpeg",
		"Cache-Control": "no-store",
		"Access-Control-Allow-Origin": "*"
		}
	});

	await cache.put(key, resp.clone(), {
		expirationTtl: CACHE_TTL_MS / 1000
	});

	return resp;
	}
  }
};
