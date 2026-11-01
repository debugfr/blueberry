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

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  } else if (ultraviolet.route(event)) {
    event.respondWith(ultraviolet.fetch(event));
  }
});
