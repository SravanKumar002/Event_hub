import mongoose from "mongoose";

const trackEventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    eventName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    page: { type: String },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("TrackEvent", trackEventSchema);
