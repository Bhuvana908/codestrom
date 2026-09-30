import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiApp } from "./src/server/api.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API
app.use(apiApp);

// Static assets from built frontend
const distDir = path.resolve(__dirname, "dist");
app.use(express.static(distDir));

// SPA fallback for client routing
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
