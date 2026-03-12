import express from "express";
import Announcement from "../models/Announcement.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// GET /api/announcements — public
router.get("/", async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/announcements — admin only
router.post("/", authMiddleware, async (req, res) => {
  try {
    const announcement = new Announcement(req.body);
    await announcement.save();
    res.status(201).json(announcement);
  } catch (error) {
    res.status(400).json({ message: "Validation error", error: error.message });
  }
});

// PUT /api/announcements/:id — admin only
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!announcement)
      return res.status(404).json({ message: "Announcement not found" });
    res.json(announcement);
  } catch (error) {
    res.status(400).json({ message: "Update error", error: error.message });
  }
});

// DELETE /api/announcements/:id — admin only
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement)
      return res.status(404).json({ message: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
