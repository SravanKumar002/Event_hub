import express from "express";
import mongoose from "mongoose";
import TrackEvent from "../models/TrackEvent.js";
import TrackSession from "../models/TrackSession.js";
import { activeSocketSessions } from "../index.js";

const router = express.Router();

// Real-time tracking is handled by Socket.io in index.js

// POST: Track Event
router.post("/track", async (req, res) => {
  try {
    const { userId, sessionId, eventName, page, metadata } = req.body;
    
    // Create track event
    const trackEvent = new TrackEvent({
      userId,
      sessionId,
      eventName,
      page,
      metadata,
    });
    
    await trackEvent.save();
    
    // Update Session endTime and duration
    const session = await TrackSession.findOne({ sessionId });
    if (session) {
      session.endTime = new Date();
      session.duration = (session.endTime - session.startTime) / 1000;
      session.exitPage = page;
      await session.save();
    } else {
      await TrackSession.create({
        sessionId,
        userId,
        entryPage: page,
        exitPage: page
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error tracking event:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Overview statistics
router.get("/overview", async (req, res) => {
  try {
    const totalUsers = await TrackSession.distinct("userId");
    const totalSessions = await TrackSession.countDocuments();
    const totalPageViews = await TrackEvent.countDocuments({ eventName: "page_view" });
    
    // Average Time Spent
    const sessions = await TrackSession.find({ duration: { $gt: 0 } }, "duration");
    const avgTimeSpent = sessions.length > 0 
      ? sessions.reduce((acc, curr) => acc + curr.duration, 0) / sessions.length
      : 0;

    // Bounce Rate Approximation (sessions with only 1 page view)
    const singleSessionEvents = await TrackEvent.aggregate([
      { $match: { eventName: "page_view" } },
      { $group: { _id: "$sessionId", count: { $sum: 1 } } },
      { $match: { count: 1 } }
    ]);
    
    const bounceRate = totalSessions > 0 ? (singleSessionEvents.length / totalSessions) * 100 : 0;
    
    res.json({
      totalUsers: totalUsers.length,
      totalSessions,
      totalPageViews,
      avgTimeSpent: parseFloat(avgTimeSpent.toFixed(2)),
      bounceRate: parseFloat(bounceRate.toFixed(2)),
      realtimeActive: activeSocketSessions.size
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Users list & analytics
router.get("/users", async (req, res) => {
  try {
    const { userId } = req.query;
    if (userId) {
      // Fetch specific user journey
      const sessions = await TrackSession.find({ userId }).sort({ startTime: -1 });
      const events = await TrackEvent.find({ userId }).sort({ timestamp: 1 });
      return res.json({ sessions, events });
    }

    // Aggregate users
    const users = await TrackSession.aggregate([
      {
        $group: {
          _id: "$userId",
          totalSessions: { $sum: 1 },
          totalTimeSpent: { $sum: "$duration" },
          lastActive: { $max: "$endTime" }
        }
      },
      { $sort: { lastActive: -1 } },
      { $limit: 100 }
    ]);
    
    res.json(users.map(u => ({
      userId: u._id,
      sessionsCount: u.totalSessions,
      timeSpent: u.totalTimeSpent,
      lastActive: u.lastActive || new Date()
    })));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Events & pages
router.get("/events", async (req, res) => {
  try {
    const mostVisitedPages = await TrackEvent.aggregate([
      { $match: { eventName: "page_view" } },
      { $group: { _id: "$page", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const mostClickedElements = await TrackEvent.aggregate([
      { $match: { eventName: "click" } },
      { $group: { _id: "$metadata.innerText", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: { $ifNull: ["$_id", "Unknown"] }, count: 1 } },
      { $limit: 10 }
    ]);
    
    const eventFrequency = await TrackEvent.aggregate([
      { $group: { _id: "$eventName", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Daily events for charts
    const chartData = await TrackEvent.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          views: { $sum: { $cond: [{ $eq: ["$eventName", "page_view"] }, 1, 0] } },
          clicks: { $sum: { $cond: [{ $eq: ["$eventName", "click"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      mostVisitedPages,
      mostClickedElements,
      eventFrequency,
      chartData
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Realtime
router.get("/realtime", (req, res) => {
  const active = Array.from(activeSocketSessions.values());
  const pagesCount = active.reduce((acc, curr) => {
    acc[curr.page] = (acc[curr.page] || 0) + 1;
    return acc;
  }, {});

  res.json({
    activeUsers: activeSocketSessions.size,
    pages: Object.entries(pagesCount).map(([page, count]) => ({ page, count }))
  });
});

export default router;
