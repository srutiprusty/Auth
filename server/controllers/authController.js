import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import sendOTP from "../utils/sendOtp.js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const hashOTP = (otp) =>
  crypto.createHmac("sha256", process.env.OTP_SECRET).update(otp).digest("hex");

const issueSession = (user, res) => {
  const sessionId = crypto.randomUUID();

  user.activeSessionId = sessionId;
  user.failedAttempts = 0;
  user.lockedUntil = null;

  const token = jwt.sign(
    {
      id: user._id.toString(),
      sessionId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const register = async (req, res) => {
  try {
    const { email, phone, dob, surname } = req.body;

    if ((!email && !phone) || !dob || !surname) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      return res.status(400).json({
        message: "Use phone number with country code",
      });
    }

    const parsedDOB = new Date(dob);

    if (Number.isNaN(parsedDOB.getTime()) || parsedDOB >= new Date()) {
      return res.status(400).json({
        message: "Enter a valid date of birth",
      });
    }

    const existing = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase() }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (existing) {
      return res.status(409).json({
        message: "Account already exists",
      });
    }

    const user = await User.create({
      email: email ? email.toLowerCase() : undefined,
      phone,
      dob: parsedDOB,
      surname: surname.trim(),
    });

    res.status(201).json({
      message: "Registration successful. Please login.",
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalized = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalized });

    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        message: "Account locked. Try again later.",
        lockedUntil: user.lockedUntil,
      });
    }

    const otp = generateOTP();

    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    if (user.email) {
      await sendOTP(user.email, otp);
    } else {
      return res.status(501).json({
        message: "SMS provider not configured yet",
      });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || typeof email !== "string" || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const normalized = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalized });

    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        message: "Account locked for one hour",
        lockedUntil: user.lockedUntil,
      });
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.lockedUntil = null;
      user.failedAttempts = 0;
    }

    const isValid =
      /^\d{6}$/.test(otp || "") &&
      user.otpHash &&
      user.otpExpiresAt > new Date() &&
      hashOTP(otp) === user.otpHash;

    if (!isValid) {
      user.failedAttempts += 1;

      if (user.failedAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      }

      await user.save();

      return res.status(401).json({
        message: user.lockedUntil
          ? "Too many attempts. Account locked for 1 hour."
          : "Invalid or expired OTP",
        attemptsRemaining: Math.max(0, 5 - user.failedAttempts),
      });
    }

    user.otpHash = undefined;
    user.otpExpiresAt = undefined;

    issueSession(user, res);

    await user.save();

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        surname: user.surname,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user && user.activeSessionId === req.user.sessionId) {
      user.activeSessionId = null;
      await user.save();
    }

    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "-otpHash -otpExpiresAt -credentials -currentChallenge",
  );

  res.json({ user });
};

const rpID = () => process.env.RP_ID;

// Generate registration challenge
export const registerkey = async (req, res) => {
  const user = await User.findById(req.user.id);

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME,
    rpID,
    userID: Buffer.from(user._id.toString()),
    userName: user.email || user.phone,
    attestationType: "none",
    excludeCredentials: user.credentials.map((c) => ({
      id: c.credentialID,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  user.currentChallenge = options.challenge;
  await user.save();

  res.json(options);
};

export const verifykeyRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const { response } = req.body;

    if (!response || !response.id) {
      return res.status(400).json({
        message: "key credential is missing",
      });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.ORIGIN,
      expectedRPID: rpID(),
    });

    if (!verification.verified) {
      return res.status(400).json({
        message: "Biometric registration failed",
      });
    }

    const credential = verification.registrationInfo.credential;

    user.credentials.push({
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString(
        "base64url",
      ),
      counter: credential.counter,
      transports: credential.transports || [],
    });

    user.currentChallenge = undefined;

    await user.save();

    res.json({
      message: "Biometric authentication registered successfully",
    });
  } catch (error) {
    console.error("key registration error:", error);

    res.status(500).json({
      message: error.message || "key registration failed",
    });
  }
};

export const keyLogin = async (req, res) => {
  const { email } = req.body;

  const normalized = email.includes("@") ? email.toLowerCase() : email;

  const user = await User.findOne({
    $or: [{ email: normalized }, { phone: normalized }],
  });

  if (!user || user.credentials.length === 0) {
    return res.status(404).json({
      message: "No registered key found",
    });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: "Account locked for one hour",
    });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.credentials.map((c) => ({
      id: c.credentialID,
      transports: c.transports,
    })),
    userVerification: "required",
  });

  user.currentChallenge = options.challenge;
  await user.save();

  res.json(options);
};

export const verifykeyLogin = async (req, res) => {
  const { email, credential } = req.body;

  const normalized = email.includes("@") ? email.toLowerCase() : email;

  const user = await User.findOne({
    $or: [{ email: normalized }, { phone: normalized }],
  });

  if (!user) {
    return res.status(401).json({
      message: "Authentication failed",
    });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: "Account locked for one hour",
    });
  }

  const stored = user.credentials.find((c) => c.credentialID === credential.id);

  if (!stored || !user.currentChallenge) {
    return res.status(401).json({
      message: "Invalid biometric credential",
    });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.ORIGIN,
      expectedRPID: [rpID()],
      credential: {
        id: stored.credentialID,
        publicKey: Buffer.from(stored.credentialPublicKey, "base64url"),
        counter: stored.counter,
        transports: stored.transports,
      },
    });

    if (!verification.verified) {
      throw new Error("Verification failed");
    }

    stored.counter = verification.authenticationInfo.newCounter;

    user.currentChallenge = undefined;
    issueSession(user, res);

    await user.save();

    res.json({
      message: "Biometric login successful",
    });
  } catch (error) {
    console.error("KEY ERROR:", error);
    console.error("ERROR STACK:", error.stack);
    user.currentChallenge = undefined;
    await user.save();

    res.status(401).json({
      message: error.message || "Biometric login failed",
    });
  }
};
