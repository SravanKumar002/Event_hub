import mongoose from "mongoose";

const notInterestedSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, trim: true },
    eventTitle: { type: String, default: "", trim: true },
    eventCategory: { type: String, default: "", trim: true },
    eventDate: { type: String, default: "", trim: true },
    eventTime: { type: String, default: "", trim: true },
    reason: { type: String, required: true, trim: true },
    source: { type: String, default: "notice-board", trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("NotInterested", notInterestedSchema);
