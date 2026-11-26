import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    surname: {
      type: String,
      required: true,
      trim: true,
    },

    otpHash: String,
    otpExpiresAt: Date,

    failedAttempts: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    activeSessionId: {
      type: String,
      default: null,
    },

    currentChallenge: String,

    credentials: [
      {
        credentialID: String,
        credentialPublicKey: String,
        counter: Number,
        transports: [String],
      },
    ],
    default: [],
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
