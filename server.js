import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";

const root = path.dirname(fileURLToPath(import.meta.url));
const { routeRequest, routeUpgrade } = await bootstrap();
const app = express();

app.use((req, res, next) => {
  if (routeRequest(req, res)) return;
  next();
});
app.get("/supabase-config.js", (_req, res) => {
  res.type("application/javascript").send(
    `window.BLUEBERRY_SUPABASE_CONFIG = Object.freeze(${JSON.stringify({
      url: process.env.SUPABASE_URL || "",
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    })});`
  );
});
app.use(
  "/vendor/supabase",
  express.static(path.join(root, "node_modules/@supabase/supabase-js/dist/umd"))
);
app.use("/logo", express.static(path.join(root, "logo")));
app.use(express.static(path.join(root, "public")));

const server = http.createServer(app);
server.on("upgrade", routeUpgrade);

const port = Number(process.env.PORT) || 3030;
server.listen(port, () => {
  console.log(`BlueberryUB is running at http://localhost:${port}`);
});