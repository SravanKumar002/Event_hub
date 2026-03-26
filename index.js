import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import announcementRoutes from "./routes/announcements.js";
import feedbackRoutes from "./routes/feedback.js";
import notInterestedRoutes from "./routes/notInterested.js";
import bannerRoutes from "./routes/banner.js";
import User from "./models/User.js";
import Event from "./models/Event.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGODB_URI || process.env.MONGODB_URL;

// Middleware – handle CORS for all origins (Vercel + any client)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors()); // explicitly handle every OPTIONS pre-flight
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/not-interested", notInterestedRoutes);
app.use("/api/banner", bannerRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server immediately so Render health-check passes quickly
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Connect to MongoDB in background and seed defaults
if (!MONGO_URL) {
  console.error(
    "❌ Missing MongoDB URL. Set MONGODB_URI (or MONGODB_URL) in backend/.env",
  );
} else {
  mongoose
    .connect(MONGO_URL)
    .then(async () => {
      console.log("✅ Connected to MongoDB");

      // Ensure default admin and team users for role-based access.
      // Admin user: academy_admin / Academysystemadmin@2025
      let adminUser = await User.findOne({ username: "academy_admin" });
      if (!adminUser) {
        adminUser = await User.create({
          username: "academy_admin",
          password: "Academysystemadmin@2025",
          role: "admin",
        });
        console.log(
          "🔑 Default admin created (academy_admin / Academysystemadmin@2025)",
        );
      } else {
        // Always enforce admin role and a known password so deployments stay in sync
        adminUser.role = "admin";
        adminUser.password = "Academysystemadmin@2025";
        await adminUser.save();
        console.log("🔐 Admin password reset to Academysystemadmin@2025");
      }

      // Team user: academy_team / AcademyTeamevents@2026
      let teamUser = await User.findOne({ username: "academy_team" });
      if (!teamUser) {
        teamUser = await User.create({
          username: "academy_team",
          password: "AcademyTeamevents@2026",
          role: "team",
        });
        console.log(
          "👥 Default team user created (academy_team / AcademyTeamevents@2026)",
        );
      } else {
        // Always enforce team role and a known password
        teamUser.role = "team";
        teamUser.password = "AcademyTeamevents@2026";
        await teamUser.save();
        console.log("👥 Team password reset to AcademyTeamevents@2026");
      }

      // Seed default events if none exist
      const eventCount = await Event.countDocuments();
      if (eventCount === 0) {
        const seedEvents = [
          {
            title: "Interview Intelligence – Product SDE Interview Analysis",
            category: "placement-insights",
            date: "2026-03-10",
            time: "10:00 AM",
            description:
              "What do product companies actually ask in interviews? We analyzed a recent Product SDE interview and documented real questions + key insights.",
            fullDescription:
              "What do product companies actually ask in interviews?\n\nWe analyzed a recent Product SDE interview and documented real questions + key insights.\n\nIf you're preparing for placements and want to upskill, this is worth seeing.\n\nAfter going through it, please share your feedback with us — your inputs will help us bring more such insights for you.",
            eligibility: "2026, 2027 Batch Students",
            joinLink: "https://bit.ly/4aUMnNq",
            ctaText: "View Insights",
            instructions:
              "After going through the insights, please fill the feedback form: https://forms.ccbp.in/interview_insights_feedback_form",
            enrolledCount: 4520,
            isSlider: false,
          },
          {
            title: "Placement Guidance Meet – 14th Mar",
            category: "placement-awareness",
            date: "2026-03-14",
            time: "7:00 PM",
            duration: "1 hour",
            description:
              "Confused about placements? Let's clear it up! Placement process explained, skills required for internships, preparation tips, mistakes, and next steps.",
            fullDescription:
              "Confused about placements? Let's clear it up!\n\nHere's everything we'll cover in this Placement Guidance Meet:\n\n✅ How do assessments work?\n✅ What do companies actually expect from you?\n✅ What skills do you need to stand out?\n✅ What are the different interview rounds?\n✅ What does the placement timeline look like?\n✅ How do internships and full-time roles work?\n✅ How should you start preparing — RIGHT NOW?\n✅ What are the most common mistakes students make?\n\nThis is not a generic gyaan session. This is real, practical, no-nonsense guidance that will give you clarity and direction.\n\nJoin via the Learning Portal → Live Classes → Placement Guidance Sessions.\n\nThis session = clarity + direction + momentum 🚀\nBe there. Let's level up your placement journey.",
            eligibility: "All students",
            joinLink: "#",
            ctaText: "Join via Learning Portal",
            instructions:
              "Join via Learning Portal → Live Classes → Placement Guidance Sessions",
            enrolledCount: 8920,
            bannerImage: "https://ik.imagekit.io/7oe9i2zuc/14th-mar-pgm.png",
            isSlider: false,
          },
          {
            title: "Chat With Champions (CWC) – Kannada Students",
            category: "placement-communication",
            date: "2026-03-14",
            time: "6:00 PM",
            duration: "1 hour",
            description:
              "Exclusive for Kannada Students! Join CWC and get your placement doubts cleared directly from a recently placed student.",
            fullDescription:
              "🚨 Exclusive for Kannada Students – CWC Incoming!\n\nStill thinking…\n🤔 How do I actually start placement preparation?\n🤔 What skills really get you shortlisted?\n🤔 What do interviewers actually ask in interviews?\n\nDon't overthink… just ask a recently placed student who already survived the placement battlefield 😅\n\nJoin CWC – Chat With Champions and get your doubts cleared directly from someone who has successfully gone through the placement journey. 🚀\n\n📅 Date: 14th March\n⏰ Time: 6:00 PM\n\nHow to Join:\nGo to → Learning Portal → Live Classes → Chat with Champions\nJoin exactly at 6 PM.\n\nStop guessing the placement game… learn it from someone who already won it. 💻✨",
            eligibility: "Kannada-speaking students only",
            joinLink: "#",
            ctaText: "Join via Learning Portal",
            instructions:
              "Go to → Learning Portal → Live Classes → Chat with Champions. Join exactly at 6 PM.",
            enrolledCount: 3250,
            bannerImage: "https://ik.imagekit.io/7oe9i2zuc/cwc-a4.png",
            isSlider: true, // This one slides
          },
          {
            title: "Placement Guidance Meet – 13th Mar",
            category: "placement-awareness",
            date: "2026-03-13",
            time: "7:00 PM",
            duration: "1 hour",
            description:
              "Confused about placements? Let's clear it up! Placement process explained, skills required for internships, preparation tips, mistakes, and next steps.",
            fullDescription:
              "Confused about placements? Let's clear it up!\n\nHere's everything we'll cover in this Placement Guidance Meet:\n\n✅ How do assessments work?\n✅ What do companies actually expect from you?\n✅ What skills do you need to stand out?\n✅ What are the different interview rounds?\n✅ What does the placement timeline look like?\n✅ How do internships and full-time roles work?\n✅ How should you start preparing — RIGHT NOW?\n✅ What are the most common mistakes students make?\n\nThis is not a generic gyaan session. This is real, practical, no-nonsense guidance that will give you clarity and direction.\n\nJoin via the Learning Portal → Live Classes → Placement Guidance Sessions.\n\nThis session = clarity + direction + momentum 🚀\nBe there. Let's level up your placement journey.",
            eligibility: "All students",
            joinLink: "#",
            ctaText: "Join via Learning Portal",
            instructions:
              "Join via Learning Portal → Live Classes → Placement Guidance Sessions",
            enrolledCount: 7650,
            bannerImage: "https://ik.imagekit.io/7oe9i2zuc/13th-mar-pgm.png",
            isSlider: false,
          },
          {
            title: "Deploy AI Full Stack Web Application – Live Class",
            category: "workshops",
            date: "2026-03-15",
            time: "6:00 PM",
            duration: "4 hours",
            description:
              "Want to Deploy AI Full Stack Web Application? Build AI Powered Smart Code Translator in Live Class!",
            fullDescription:
              "Want to Deploy AI Full Stack Web Application?\n\nBuild AI Powered Smart Code Translator in Live Class!\n\n📅 15th March 2026 | 6 PM – 10 PM\n\nGo to → Learning Portal → Live Classes → Weekend Sprints\n\nJoin Now!",
            eligibility: "All students",
            joinLink: "#",
            ctaText: "Join Now",
            instructions:
              "Go to → Learning Portal → Live Classes → Weekend Sprints",
            enrolledCount: 11200,
            bannerImage: "https://ik.imagekit.io/7oe9i2zuc/mar-15th-class.png",
            isSlider: true, // This one slides
          },
        ];
        await Event.insertMany(seedEvents);
        console.log("📦 Seeded", seedEvents.length, "default events");
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });
}
