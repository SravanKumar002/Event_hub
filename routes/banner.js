import express from "express";
import BannerMessage from "../models/BannerMessage.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// GET /api/banner — public, returns the single banner doc
router.get("/", async (req, res) => {
  try {
    let banner = await BannerMessage.findOne();
    if (!banner) {
      banner = { text: "", emoji: "📢", isActive: false };
    }
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/banner — admin only, upsert the banner
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { text, emoji, isActive } = req.body;
    const banner = await BannerMessage.findOneAndUpdate(
      {},
      { text, emoji: emoji || "📢", isActive: !!isActive },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
