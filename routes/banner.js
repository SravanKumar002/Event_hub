import express from "express";
import BannerMessage from "../models/BannerMessage.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

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

// GET /api/banner/fallback-image — public, returns fallback slider image
router.get("/fallback-image", async (req, res) => {
  try {
    res.json({ fallbackSliderImage: "" });
  } catch (error) {
    res.status(500).json({ fallbackSliderImage: "" });
  }
});

// PUT /api/banner — admin or team, upsert the banner
router.put(
  "/",
  authMiddleware,
  requireRole("team", "admin"),
  async (req, res) => {
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
  },
);

export default router;
