import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../storage";
import { hasDataAccess, requireRole } from "./common";

const router = Router();
const uploadRoot = path.join(process.cwd(), "attached_assets", "uploads");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

ensureDir(uploadRoot);

const multerStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const folder = file.mimetype === "application/pdf"
      ? path.join(uploadRoot, "pdf")
      : path.join(uploadRoot, "images");
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

router.get("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const documents = await storage.getUserDocuments(req.user!.id);
    return res.json(documents);
  } catch (error) {
    console.error("Error loading documents:", error);
    return res.status(500).json({ error: "Failed to load documents" });
  }
});

router.post(
  "/upload",
  requireRole("admin", "company"),
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const type = file.mimetype.startsWith("image/") ? "image" : "pdf";
      const size = formatFileSize(file.size);
      const document = await storage.createDocument({
        userId: req.user!.id,
        name: req.body?.name || file.originalname,
        type,
        size,
        path: file.path,
        thumbnailPath: type === "image" ? file.path : null,
      });

      return res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      return res.status(500).json({ error: "Failed to upload document" });
    }
  },
);

router.get("/file/:id", requireRole("admin", "company"), hasDataAccess("document"), async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (!document.path || !fs.existsSync(document.path)) {
      return res.status(404).json({ error: "Document file not found" });
    }

    const contentType = document.type === "image" ? "image/jpeg" : "application/pdf";
    res.setHeader("Content-Type", contentType);
    fs.createReadStream(document.path).pipe(res);
  } catch (error) {
    console.error("Error serving document:", error);
    return res.status(500).json({ error: "Failed to load document" });
  }
});

router.post("/", requireRole("admin", "company"), async (req, res) => {
  try {
    const payload = { ...req.body, userId: req.user!.id };
    if (!payload.name || !payload.type || !payload.path || !payload.size) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const document = await storage.createDocument(payload);
    return res.status(201).json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/:id", requireRole("admin", "company"), hasDataAccess("document"), async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    return res.json(document);
  } catch (error) {
    console.error("Error reading document:", error);
    return res.status(500).json({ error: "Failed to load document" });
  }
});

router.delete("/:id", requireRole("admin", "company"), hasDataAccess("document"), async (req, res) => {
  try {
    const documentId = Number(req.params.id);
    const document = await storage.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.path && fs.existsSync(document.path)) {
      fs.unlink(document.path, () => undefined);
    }

    await storage.deleteDocument(documentId);
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting document:", error);
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default router;
