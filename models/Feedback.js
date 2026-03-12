import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    ratingLabel: { type: String, default: "" },
    comment: { type: String, default: "" },
    page: { type: String, default: "general" },
  },
  { timestamps: true },
);

export default mongoose.model("Feedback", feedbackSchema);
