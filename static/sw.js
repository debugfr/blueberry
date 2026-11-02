const scope = self.registration.scope;
const file = (path) => new URL(path, scope).href;

addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

importScripts(file("controller/controller.sw.js"));
importScripts(file("uv/uv.bundle.js"));

self.__uv$config = {
  prefix: new URL("uv/service/", scope).pathname,
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: new URL("uv/uv.handler.js", scope).pathname,
  client: new URL("uv/uv.client.js", scope).pathname,
  bundle: new URL("uv/uv.bundle.js", scope).pathname,
  config: new URL("uv/uv.config.js", scope).pathname,
  sw: new URL("uv/uv.sw.js", scope).pathname,
};

importScripts(file("uv/uv.sw.js"));
const ultraviolet = new UVServiceWorker();

async function serveAppAsHtml(request) {
  const response = await fetch(request);
  if (!response.ok) return response;
  const source = await response.text();
  const foreignObject = source.match(/<foreignObject\b[^>]*>([\s\S]*?)<\/foreignObject>/i);
  if (!foreignObject) {
    return new Response("Blueberry could not prepare its HTML app shell.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const appMarkup = foreignObject[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BlueberryUB</title><link rel="icon" type="image/png" href="../logo/blueub.png"></head><body>${appMarkup}</body></html>`;
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const appUrl = new URL("index.svg", scope);
  if (event.request.mode === "navigate" && url.pathname === appUrl.pathname) {
    event.respondWith(serveAppAsHtml(event.request));
  } else if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  } else if (ultraviolet.route(event)) {
    event.respondWith(ultraviolet.fetch(event));
  }
});
