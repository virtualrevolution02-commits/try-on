import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as fs from "fs";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the AR try-on HTML page
  app.get("/ar-tryon", (req: Request, res: Response) => {
    const htmlPath = path.resolve(process.cwd(), "server", "templates", "ar-tryon.html");
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).json({ error: "AR try-on template not found" });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store");
    // Allow camera in iframes (for WebView and web)
    res.setHeader("Feature-Policy", "camera *");
    res.setHeader("Permissions-Policy", "camera=*");
    res.send(fs.readFileSync(htmlPath, "utf-8"));
  });

  const httpServer = createServer(app);
  return httpServer;
}
