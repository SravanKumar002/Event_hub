import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, default: "" },
    tags: { type: [String], default: [] },
    fullDescription: { type: String, default: "" },
    eligibility: { type: String, default: "" },
    joinLink: { type: String, default: "#" },
    ctaText: { type: String, default: "View Details" },
    instructions: { type: String, default: "" },
    duration: { type: String, default: "" },
    googleMapsLink: { type: String, default: "" },
    enrolledCount: { type: Number, default: 0 },
    bannerImage: { type: String, default: "" },
    interestCount: { type: Number, default: 0 },
    isSlider: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Event", eventSchema);
