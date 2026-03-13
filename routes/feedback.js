import express from "express";
import Feedback from "../models/Feedback.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// POST /api/feedback — public, submit feedback
router.post("/", async (req, res) => {
  try {
    const {
      rating,
      ratingLabel,
      comment,
      phone,
      page,
      question,
      scaleMax,
      primaryQuestion,
      primaryAnswer,
      secondaryQuestion,
      secondaryAnswer,
    } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating (1-5) is required" });
    }
    const feedback = new Feedback({
      rating,
      ratingLabel,
      comment,
      phone,
      page,
      question,
      scaleMax,
      primaryQuestion,
      primaryAnswer,
      secondaryQuestion,
      secondaryAnswer,
    });
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/feedback — admin only, get all feedback
router.get("/", authMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/feedback/stats — admin only, get feedback statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    const total = feedbacks.length;
    const avgRating =
      total > 0
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
        : "0.0";
    const distribution = [0, 0, 0, 0, 0];
    feedbacks.forEach((f) => {
      distribution[f.rating - 1]++;
    });
    res.json({ total, avgRating: parseFloat(avgRating), distribution });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/feedback/:id — admin only
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: "Feedback deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
