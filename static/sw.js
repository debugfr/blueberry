importScripts(new URL("controller/controller.sw.js", self.registration.scope).href);

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
