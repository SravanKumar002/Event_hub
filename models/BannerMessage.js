import mongoose from "mongoose";

const bannerMessageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, default: "" },
    emoji: { type: String, default: "📢" },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("BannerMessage", bannerMessageSchema);
