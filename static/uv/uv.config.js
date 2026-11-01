const configScriptUrl = document.currentScript?.src || new URL("uv.config.js", location.href).href;
const staticScope = new URL("../", configScriptUrl);
const staticFile = (path) => new URL(path, staticScope).pathname;

self.__uv$config = {
  prefix: staticFile("uv/service/"),
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: staticFile("uv/uv.handler.js"),
  client: staticFile("uv/uv.client.js"),
  bundle: staticFile("uv/uv.bundle.js"),
  config: staticFile("uv/uv.config.js"),
  sw: staticFile("uv/uv.sw.js"),
};
