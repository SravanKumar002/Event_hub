import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "team"],
      default: "team",
      required: true,
    },
  },
  { timestamps: true, collection: "system_users" },
);
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
const User = mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const team = await User.findOne({ username: "academy_team" });
  console.log("Team user:", team);
  if (team) {
    const isMatch = await team.comparePassword("AcademyTeamevents@2026");
    console.log("Matches AcademyTeamevents@2026?", isMatch);
  }
  process.exit(0);
});
