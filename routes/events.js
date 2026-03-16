import express from "express";
import Event from "../models/Event.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const toCategorySlug = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const categorySlugAliases = {
  assignments: "assessments",
  "guidence-meets": "guidance-meets",
};

const normalizeCategorySlug = (value = "") => {
  const slug = toCategorySlug(value);
  if (slug.includes("challenge")) return "challenges";
  if (slug.includes("assessment") || slug.includes("assignment")) {
    return "assessments";
  }
  return categorySlugAliases[slug] ?? slug;
};

const filterByCategorySlug = (events, categorySlug) => {
  const normalized = normalizeCategorySlug(categorySlug);
  if (!normalized) return events;
  return events.filter(
    (event) => normalizeCategorySlug(event.category) === normalized,
  );
};

// GET /api/events — public, get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    const { category } = req.query;
    if (typeof category === "string" && category.trim() !== "") {
      return res.json(filterByCategorySlug(events, category));
    }
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/events/category/:categorySlug — public, get events by category slug
router.get("/category/:categorySlug", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: -1 });
    const filtered = filterByCategorySlug(events, req.params.categorySlug);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/events/slider — public, get only slider events
router.get("/slider", async (req, res) => {
  try {
    const events = await Event.find({ isSlider: true }).sort({ date: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/events — admin only, create event
router.post("/", authMiddleware, async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: "Validation error", error: error.message });
  }
});

// PUT /api/events/:id — admin only, update event
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: "Update error", error: error.message });
  }
});

// DELETE /api/events/:id — admin only
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/events/:id/interest — public, increment interest count
router.post("/:id/interest", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { interestCount: 1 } },
      { new: true },
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ interestCount: event.interestCount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/events/:id/uninterest — public, decrement interest count
router.post("/:id/uninterest", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { interestCount: -1 } },
      { new: true },
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ interestCount: Math.max(0, event.interestCount) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
