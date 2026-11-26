import express from "express";
import {
  register,
  requestOTP,
  verifyOTP,
  logout,
  getMe,
  registerkey,
  verifykeyRegistration,
  keyLogin,
  verifykeyLogin,
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/requestOTP", requestOTP);
router.post("/verifyOTP", verifyOTP);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
router.post("/key/register", authMiddleware, registerkey);
router.post("/key/register/verify", authMiddleware, verifykeyRegistration);
router.post("/key/login", keyLogin);

router.post("/key/login/verify", verifykeyLogin);

export default router;
