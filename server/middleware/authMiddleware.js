import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (
      !user ||
      !user.activeSessionId ||
      user.activeSessionId !== decoded.sessionId
    ) {
      return res.status(401).json({
        message: "Session expired or logged in on another device",
      });
    }

    req.user = {
      id: decoded.id,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired session",
    });
  }
};

export default authMiddleware;
