import mongoose from "mongoose";

const trackSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number, default: 0 },
    entryPage: { type: String },
    exitPage: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("TrackSession", trackSessionSchema);
