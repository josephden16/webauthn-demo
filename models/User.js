import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
    },
    authenticators: [],
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
