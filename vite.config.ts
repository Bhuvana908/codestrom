import path from "node:path";
import { defineConfig, type UserConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function apiMiddlewarePlugin(): Plugin {
  return {
    name: "shkb-api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith("/api/") || req.url === "/api")) {
          try {
            const { apiApp } = await import("./src/server/api.ts");
            apiApp(req as any, res as any, next);
          } catch (err) {
            console.error("API error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal API Server Error" }));
          }
        } else {
          next();
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      apiMiddlewarePlugin(),
    ],
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(__dirname, "./src") },
        // lucide 1.x dropped brand logos; src/lib/lucide-react.tsx restores them on top of the real package.
        { find: /^lucide-react$/, replacement: path.resolve(__dirname, "./src/lib/lucide-react.tsx") },
        { find: "lucide-react-upstream", replacement: path.resolve(__dirname, "./node_modules/lucide-react") },
        // recharts 3's Tooltip callback types reject the annotations agents write; src/lib/recharts.tsx adapts them.
        { find: /^recharts$/, replacement: path.resolve(__dirname, "./src/lib/recharts.tsx") },
        { find: "recharts-upstream", replacement: path.resolve(__dirname, "./node_modules/recharts") },
      ],
    },
    optimizeDeps: {
      include: [
        "@base-ui/react/button",
        "@base-ui/react/checkbox",
        "@base-ui/react/dialog",
        "@base-ui/react/input",
        "@base-ui/react/menu",
        "@base-ui/react/merge-props",
        "@base-ui/react/popover",
        "@base-ui/react/select",
        "@base-ui/react/tabs",
        "@base-ui/react/use-render",
        "@tanstack/react-query",
        "class-variance-authority",
        "clsx",
        "date-fns",
        "@icons-pack/react-simple-icons",
        "lucide-react-upstream",
        "motion/react",
        "next-themes",
        "react",
        "react-day-picker",
        "react-dom/client",
        "react-is",
        "react-router-dom",
        "recharts-upstream",
        "sonner",
        "tailwind-merge",
      ],
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      cors: true,
      hmr: false,
    },
  } satisfies UserConfig;
});
