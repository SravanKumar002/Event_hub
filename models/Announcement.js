import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warning", "success", "urgent"],
      default: "info",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Announcement", announcementSchema);
