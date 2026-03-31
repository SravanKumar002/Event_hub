import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();

const createTokenPayload = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
});

const handleLoginForRole = (role) => async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(createTokenPayload(user), process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/auth/team/register
router.post("/team/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedEmail.endsWith("@nxtwave.co.in")) {
      return res
        .status(400)
        .json({ message: "Email must be an @nxtwave.co.in address" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({
      username: normalizedEmail,
      role: "team",
    });
    if (existing) {
      return res.status(409).json({ message: "Account already exists" });
    }

    const user = await User.create({
      username: normalizedEmail,
      password,
      role: "team",
    });

    const token = jwt.sign(createTokenPayload(user), process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/auth/admin/login
router.post("/admin/login", handleLoginForRole("admin"));

// POST /api/auth/team/login
router.post("/team/login", handleLoginForRole("team"));

// Backward-compatible admin login endpoint
router.post("/login", handleLoginForRole("admin"));

// GET /api/auth/verify
router.get("/verify", authMiddleware, (req, res) => {
  res.json({ valid: true, username: req.user.username, role: req.user.role });
});

// GET /api/auth/admin/verify
router.get(
  "/admin/verify",
  authMiddleware,
  requireRole("admin"),
  (req, res) => {
    res.json({ valid: true, username: req.user.username, role: req.user.role });
  },
);

// GET /api/auth/team/verify
router.get("/team/verify", authMiddleware, requireRole("team"), (req, res) => {
  res.json({ valid: true, username: req.user.username, role: req.user.role });
});

export default router;
