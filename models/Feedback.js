import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    ratingLabel: { type: String, default: "" },
    question: { type: String, default: "" },
    primaryQuestion: { type: String, default: "" },
    primaryAnswer: { type: String, default: "" },
    secondaryQuestion: { type: String, default: "" },
    secondaryAnswer: { type: String, default: "" },
    scaleMax: { type: Number, default: 5 },
    comment: { type: String, default: "" },
    phone: { type: String, default: "" },
    page: { type: String, default: "general" },
  },
  { timestamps: true },
);

export default mongoose.model("Feedback", feedbackSchema);
