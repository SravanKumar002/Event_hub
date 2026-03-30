import express from "express";
import mongoose from "mongoose";
import TrackEvent from "../models/TrackEvent.js";
import TrackSession from "../models/TrackSession.js";
import { activeSocketSessions } from "../index.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

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

// Protect analytics read/write management routes for admin only.
router.use(authMiddleware, requireRole("admin"));

const ANALYTICS_TZ = process.env.ANALYTICS_TIMEZONE || "Asia/Kolkata";

function todayYmdInTz(tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ymdMinusDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return ymd;
  const u = Date.UTC(y, m - 1, d);
  const t = new Date(u - days * 86400000);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function parseAnchorYmd(queryDate, tz) {
  if (typeof queryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
    return queryDate;
  }
  return todayYmdInTz(tz);
}

function tsYmdExpr(tz) {
  return { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: tz } };
}

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

    const fourteenAgo = new Date();
    fourteenAgo.setDate(fourteenAgo.getDate() - 13);
    fourteenAgo.setHours(0, 0, 0, 0);

    const [dailyActivity, topEventTypes, topPages] = await Promise.all([
      TrackEvent.aggregate([
        { $match: { timestamp: { $gte: fourteenAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: ANALYTICS_TZ },
            },
            total: { $sum: 1 },
            pageViews: { $sum: { $cond: [{ $eq: ["$eventName", "page_view"] }, 1, 0] } },
            clicks: { $sum: { $cond: [{ $eq: ["$eventName", "click"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      TrackEvent.aggregate([
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      TrackEvent.aggregate([
        { $match: { eventName: "page_view" } },
        { $group: { _id: "$page", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
    ]);
    
    res.json({
      totalUsers: totalUsers.length,
      totalSessions,
      totalPageViews,
      avgTimeSpent: parseFloat(avgTimeSpent.toFixed(2)),
      bounceRate: parseFloat(bounceRate.toFixed(2)),
      realtimeActive: activeSocketSessions.size,
      dailyActivity,
      topEventTypes,
      topPages,
      analyticsTimezone: ANALYTICS_TZ,
    });
  } catch (error) {
    console.error("Error fetching overview:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Activity heatmap (day × hour) for admin Analysis tab
router.get("/activity-heatmap", async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 7), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const tzGroup = {
      dow: { $isoDayOfWeek: { date: "$timestamp", timezone: ANALYTICS_TZ } },
      hour: { $hour: { date: "$timestamp", timezone: ANALYTICS_TZ } },
    };
    const utcGroup = {
      dow: { $isoDayOfWeek: "$timestamp" },
      hour: { $hour: "$timestamp" },
    };

    let rows;
    try {
      rows = await TrackEvent.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: tzGroup, count: { $sum: 1 } } },
      ]);
    } catch (aggErr) {
      console.warn("activity-heatmap TZ aggregation failed, using UTC:", aggErr?.message);
      rows = await TrackEvent.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: utcGroup, count: { $sum: 1 } } },
      ]);
    }

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    for (const r of rows) {
      const d = (r._id?.dow ?? 1) - 1;
      const h = r._id?.hour ?? 0;
      if (d >= 0 && d < 7 && h >= 0 && h < 24) {
        matrix[d][h] += r.count;
        if (matrix[d][h] > max) max = matrix[d][h];
      }
    }

    res.json({
      days,
      matrix,
      dayLabels,
      max,
      timezone: ANALYTICS_TZ,
    });
  } catch (error) {
    console.error("Error fetching activity heatmap:", error);
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

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const basePipeline = [
      {
        $group: {
          _id: "$userId",
          totalSessions: { $sum: 1 },
          totalTimeSpent: { $sum: "$duration" },
          lastActive: { $max: "$endTime" }
        }
      },
      { $sort: { lastActive: -1 } }
    ];

    const [countRows, users] = await Promise.all([
      TrackSession.aggregate([...basePipeline, { $count: "total" }]),
      TrackSession.aggregate([...basePipeline, { $skip: skip }, { $limit: limit }]),
    ]);

    const total = countRows?.[0]?.total || 0;

    res.json({
      page,
      limit,
      total,
      items: users.map((u) => ({
      userId: u._id,
      sessionsCount: u.totalSessions,
      timeSpent: u.totalTimeSpent,
      lastActive: u.lastActive || new Date()
      })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE: Remove tracked user analytics data
router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [eventsResult, sessionsResult] = await Promise.all([
      TrackEvent.deleteMany({ userId }),
      TrackSession.deleteMany({ userId })
    ]);
    res.json({
      success: true,
      deletedEvents: eventsResult.deletedCount || 0,
      deletedSessions: sessionsResult.deletedCount || 0
    });
  } catch (error) {
    console.error("Error deleting user analytics:", error);
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

// DELETE: Remove a single tracked event entry by id
router.delete("/events/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const deleted = await TrackEvent.findByIdAndDelete(eventId);
    if (!deleted) return res.status(404).json({ error: "Event not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting analytics event:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: V2 Metrics
router.get("/v2-metrics", async (req, res) => {
  try {
    const period = req.query.period === "week" ? "week" : "day";
    const anchorYmd = parseAnchorYmd(req.query.date, ANALYTICS_TZ);
    const tsYmd = tsYmdExpr(ANALYTICS_TZ);

    const singleDayMatch = { $expr: { $eq: [tsYmd, anchorYmd] } };
    const weekStartYmd = ymdMinusDays(anchorYmd, 6);
    const rollingWeekMatch = {
      $expr: {
        $and: [
          { $gte: [tsYmd, weekStartYmd] },
          { $lte: [tsYmd, anchorYmd] },
        ],
      },
    };

    const baseMatch = period === "week" ? rollingWeekMatch : singleDayMatch;
    const withEvent = (eventName) => ({ $and: [baseMatch, { eventName }] });

    const allTimeUsers = await TrackSession.distinct("userId");
    const allTimeUsersCount = allTimeUsers.length;

    const activeUsersInPeriod = await TrackEvent.distinct("userId", baseMatch);
    const dauUsers = await TrackEvent.distinct("userId", singleDayMatch);
    const wauUsers = await TrackEvent.distinct("userId", rollingWeekMatch);

    const [
      calendarViewers,
      eventViews,
      totalClicks,
      calendarDurations,
      addToCalendarClicks,
      eventRegistrationsViaCalendar,
      scrollEvents,
      filterEvents
    ] = await Promise.all([
      TrackEvent.distinct("userId", { ...baseMatch, page: "/calendar" }),
      TrackEvent.countDocuments(withEvent("event_viewed")),
      TrackEvent.countDocuments(withEvent("click")),
      TrackEvent.find({ ...withEvent("time_spent_calendar"), page: "/calendar" }, "metadata"),
      TrackEvent.countDocuments(withEvent("add_to_calendar")),
      TrackEvent.countDocuments({
        ...withEvent("add_to_calendar"),
        "metadata.source": "calendar"
      }),
      TrackEvent.find({ ...withEvent("scroll_depth"), page: "/calendar" }, "metadata"),
      TrackEvent.find({ ...withEvent("calendar_filter_used"), page: "/calendar" }, "metadata")
    ]);

    const activeUsersCount = activeUsersInPeriod.length;
    const percentCalendarVisit = activeUsersCount > 0
      ? (calendarViewers.length / activeUsersCount) * 100
      : 0;
    const viewsPerUser = activeUsersCount > 0 ? eventViews / activeUsersCount : 0;
    const clicksPerEvent = eventViews > 0 ? totalClicks / eventViews : 0;

    const totalTimeCalendar = calendarDurations.reduce(
      (sum, eventDoc) => sum + Number(eventDoc.metadata?.durationSeconds || 0),
      0
    );
    const avgCalendarTime = calendarDurations.length > 0
      ? Math.round(totalTimeCalendar / calendarDurations.length)
      : 0;

    const avgScrollDepth = scrollEvents.length > 0
      ? Math.round(
          scrollEvents.reduce((sum, eventDoc) => {
            const raw = String(eventDoc.metadata?.depth || "0").replace("%", "");
            return sum + Number.parseInt(raw || "0", 10);
          }, 0) / scrollEvents.length
        )
      : 0;

    const filterUsageByType = filterEvents.reduce((acc, eventDoc) => {
      const filterName = eventDoc.metadata?.filter || "unknown";
      acc[filterName] = (acc[filterName] || 0) + 1;
      return acc;
    }, {});
    const filtersUsedCount = filterEvents.length;

    const percentRegistrationsFromCalendar = addToCalendarClicks > 0
      ? (eventRegistrationsViaCalendar / addToCalendarClicks) * 100
      : 0;

    const trendFormat = period === "week" ? "%G-W%V" : "%Y-%m-%d";
    const trendLimit = period === "week" ? 12 : 14;
    const trendStartYmd =
      period === "week" ? ymdMinusDays(anchorYmd, 12 * 7 - 1) : ymdMinusDays(anchorYmd, 13);
    const trendWindowMatch = {
      $expr: {
        $and: [{ $gte: [tsYmd, trendStartYmd] }, { $lte: [tsYmd, anchorYmd] }],
      },
    };

    const trend = await TrackEvent.aggregate([
      { $match: trendWindowMatch },
      {
        $group: {
          _id: { $dateToString: { format: trendFormat, date: "$timestamp", timezone: ANALYTICS_TZ } },
          activeUsersSet: { $addToSet: "$userId" },
          pageViews: {
            $sum: { $cond: [{ $eq: ["$eventName", "page_view"] }, 1, 0] },
          },
          calendarViews: {
            $sum: { $cond: [{ $eq: ["$eventName", "calendar_viewed"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 1,
          activeUsers: { $size: "$activeUsersSet" },
          pageViews: 1,
          calendarViews: 1,
        },
      },
      { $sort: { _id: 1 } },
      { $limit: trendLimit },
    ]);

    res.json({
      period,
      anchorDate: anchorYmd,
      analyticsTimezone: ANALYTICS_TZ,
      activeUsers: activeUsersCount,
      dau: dauUsers.length,
      wau: wauUsers.length,
      portalUsers: allTimeUsersCount,
      percentCalendarVisit: Number(percentCalendarVisit.toFixed(1)),
      eventsViewedPerUser: Number(viewsPerUser.toFixed(2)),
      clicksPerEvent: Number(clicksPerEvent.toFixed(2)),
      avgCalendarTimeSeconds: avgCalendarTime,
      avgScrollDepthPercent: avgScrollDepth,
      filtersUsedCount,
      filterUsageByType,
      eventRegistrationsViaCalendar,
      percentRegistrationsFromCalendar: Number(percentRegistrationsFromCalendar.toFixed(1)),
      addToCalendarClicks,
      trend
    });
  } catch (err) {
    console.error("v2 metrics error:", err);
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
