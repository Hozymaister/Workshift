import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupDatabase } from "./db-setup";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Nastav NODE_ENV pro správnou detekci prostředí
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  console.log(`Running in ${process.env.NODE_ENV} environment`);

  // Initialize database if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    try {
      await setupDatabase();
    } catch (error) {
      console.error("Failed to set up database:", error);
      
      // V produkčním prostředí opakujeme pokus o inicializaci
      if (process.env.NODE_ENV === 'production') {
        console.log('Attempting database setup retry in production environment...');
        try {
          // Čekáme 5 sekund a zkusíme znovu
          await new Promise(resolve => setTimeout(resolve, 5000));
          await setupDatabase();
        } catch (retryError) {
          console.error("Failed to set up database after retry:", retryError);
          // V produkci neukončujeme aplikaci, ale pokračujeme s varováním
          console.warn("WARNING: Application starting with database initialization issues!");
        }
      }
    }
  } else {
    console.warn("No DATABASE_URL environment variable found, using in-memory storage.");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
    // Nebudeme dále vyhazovat výjimku, protože to může způsobit pád serveru
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Použijeme port z proměnné prostředí PORT, nebo 5000 jako výchozí hodnotu
  // V Replitu nebo jiných prostředích je důležité používat PORT z env proměnné
  const port = process.env.PORT || 5000;
  server.listen({
    port: Number(port),
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server běží na portu ${port}`);
  });
})();
