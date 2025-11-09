import { Router } from "express";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import { requireAuth } from "./common";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    let users;
    if (req.user?.role === "admin") {
      users = await storage.getAllUsers();
    } else if (req.user?.role === "company") {
      users = (await storage.getAllUsers()).filter(
        (user) => user.parentCompanyId === req.user!.id || user.id === req.user!.id,
      );
    } else {
      const self = await storage.getUser(req.user!.id);
      users = self ? [self] : [];
    }

    const safeUsers = users.map(({ password, ...rest }) => rest);
    return res.json(safeUsers);
  } catch (error) {
    console.error("Error fetching workers:", error);
    return res.status(500).json({ error: "Failed to fetch workers" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "company") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const userData = { ...req.body };

    if (await storage.getUserByEmail(userData.email)) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (await storage.getUserByUsername(userData.username)) {
      return res.status(400).json({ error: "Username already exists" });
    }

    if (typeof userData.hourlyWage === "string") {
      userData.hourlyWage = parseInt(userData.hourlyWage, 10);
    }

    const payload = {
      ...userData,
      password: await hashPassword(userData.password),
    };

    if (req.user?.role === "company") {
      payload.role = "worker";
      payload.parentCompanyId = req.user.id;
    }

    const newUser = await storage.createUser(payload);
    const { password, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  } catch (error) {
    console.error("Error creating worker:", error);
    return res.status(500).json({ error: "Failed to create worker" });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const canEdit =
      req.user?.role === "admin" ||
      req.user?.id === userId ||
      (req.user?.role === "company" && existingUser.parentCompanyId === req.user.id);

    if (!canEdit) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = { ...req.body };

    if (updates.email && updates.email !== existingUser.email) {
      const existingEmail = await storage.getUserByEmail(updates.email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    if (updates.username && updates.username !== existingUser.username) {
      const existingUsername = await storage.getUserByUsername(updates.username);
      if (existingUsername && existingUsername.id !== userId) {
        return res.status(400).json({ error: "Username already exists" });
      }
    }

    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    if (typeof updates.hourlyWage === "string") {
      updates.hourlyWage = parseInt(updates.hourlyWage, 10);
    }

    if (req.user?.role === "company" && updates.role && req.user.id !== userId) {
      delete updates.role;
    }

    if (req.user?.role === "worker" && updates.role) {
      delete updates.role;
    }

    const updated = await storage.updateUser(userId, updates);
    if (!updated) {
      return res.status(500).json({ error: "Failed to update worker" });
    }

    const { password, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error) {
    console.error("Error updating worker:", error);
    return res.status(500).json({ error: "Failed to update worker" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const existingUser = await storage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "Worker not found" });
    }

    if (userId === req.user?.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const canDelete =
      req.user?.role === "admin" ||
      (req.user?.role === "company" && existingUser.parentCompanyId === req.user.id);

    if (!canDelete) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const success = await storage.deleteUser(userId);
    if (!success) {
      return res.status(500).json({ error: "Failed to delete worker" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting worker:", error);
    return res.status(500).json({ error: "Failed to delete worker" });
  }
});

export default router;
