import express from "express";
import NotInterested from "../models/NotInterested.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// POST /api/not-interested — public
router.post("/", async (req, res) => {
  try {
    const {
      eventId,
      eventTitle,
      eventCategory,
      eventDate,
      eventTime,
      reason,
      source,
    } = req.body;

    if (!eventId || !String(eventId).trim()) {
      return res.status(400).json({ message: "eventId is required" });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const entry = new NotInterested({
      eventId: String(eventId).trim(),
      eventTitle: String(eventTitle || "").trim(),
      eventCategory: String(eventCategory || "").trim(),
      eventDate: String(eventDate || "").trim(),
      eventTime: String(eventTime || "").trim(),
      reason: String(reason).trim(),
      source: String(source || "notice-board").trim(),
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/not-interested — admin only
router.get("/", authMiddleware, async (req, res) => {
  try {
    const items = await NotInterested.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/not-interested/:id — admin only
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await NotInterested.findByIdAndDelete(req.params.id);
    res.json({ message: "Not interested entry deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
