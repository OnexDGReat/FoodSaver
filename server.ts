import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

// Lazy initialize Firebase Admin
let db: admin.firestore.Firestore;

function getDb() {
  if (!db) {
    try {
      if (admin.apps.length === 0) {
        // Force use of the project ID from config to avoid mis-targeting default AI Studio project
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
        console.log(`Firebase Admin initialized for Project: ${firebaseConfig.projectId}`);
      }
      // Use the specific database ID if it's provided in the config, otherwise use default
      db = firebaseConfig.firestoreDatabaseId 
        ? admin.firestore(firebaseConfig.firestoreDatabaseId)
        : admin.firestore();
      
      const targetDb = firebaseConfig.firestoreDatabaseId || "(default)";
      console.log(`Firestore instance initialized for database: ${targetDb}`);
    } catch (error) {
      console.error("Firebase Admin initialization failed.", error);
      throw error;
    }
  }
  return db;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // --- VITE MIDDLEWARE ---
  console.log(`NODE_ENV is: ${process.env.NODE_ENV}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in Development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true, 
        host: '0.0.0.0',
        hmr: false // Explicitly disable HMR to avoid extra port usage
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Starting in Production mode. Serving from: ${distPath}`);
    if (express.static(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
