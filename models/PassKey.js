import mongoose from "mongoose";

const PassKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    webAuthnUserID: {
      type: String,
      required: true,
    },
    credentialID: {
      type: String,
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ["singleDevice", "multiDevice"],
      required: true,
    },
    backedUp: {
      type: Boolean,
      required: true,
    },
    authenticators: [],
    transports: [],
  },
  { timestamps: true }
);

const PassKey = mongoose.model("PassKey", PassKeySchema);

export default PassKey;
