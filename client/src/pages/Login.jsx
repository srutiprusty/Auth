import { useState } from "react";
import { Fingerprint, ShieldCheck, ArrowRight } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const requestOTP = async () => {
    try {
      const res = await api.post("/auth/requestOTP", {
        email,
      });

      setOtpSent(true);
      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to send OTP");
    }
  };

  const verifyOTP = async () => {
    try {
      await api.post("/auth/verifyOTP", {
        email,
        otp,
      });

      onSuccess();
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.response?.data?.message || "Invalid OTP");
    }
  };

  const biometricLogin = async () => {
    try {
      setMessage("Starting biometric login...");

      const res = await api.post("/auth/key/login", {
        email,
      });

      const options = res.data.options || res.data;

      const credential = await startAuthentication({
        optionsJSON: options,
      });

      const verifyRes = await api.post("/auth/key/login/verify", {
        email,
        credential,
      });

      onSuccess?.();
      navigate("/dashboard");
    } catch (error) {
      console.error("Biometric error:", error);
      console.error("Backend response:", error.response?.data);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Biometric login failed",
      );
    }
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-text">
            Sign in securely to your account
          </p>
        </div>

        {/* Login Card */}
        <div
          className="bg-background border border-border
          rounded-2xl p-7 shadow-xl"
        >
          <label className="block text-sm font-medium text-text-heading mb-2">
            Email or Phone Number
          </label>

          <input
            type="text"
            placeholder="Enter email or phone"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border
              bg-background text-text-heading outline-none
              focus:border-accent focus:ring-2 focus:ring-accent-bg
              transition"
          />

          {!otpSent ? (
            <button
              onClick={requestOTP}
              disabled={!email.trim()}
              className="w-full mt-5 flex items-center justify-center
                gap-2 rounded-xl bg-accent text-white font-semibold
                py-3 hover:opacity-90 transition disabled:opacity-50"
            >
              Send OTP <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <label
                className="block text-sm font-medium
                text-text-heading mt-5 mb-2"
              >
                Verification Code
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 rounded-xl border
                  border-border bg-background text-text-heading
                  tracking-[0.4em] text-center outline-none
                  focus:border-accent focus:ring-2 focus:ring-accent-bg"
              />

              <button
                onClick={verifyOTP}
                disabled={!/^\d{6}$/.test(otp)}
                className="w-full mt-4 rounded-xl bg-accent
                  text-white font-semibold py-3 hover:opacity-90
                  disabled:opacity-50 transition"
              >
                Verify & Login
              </button>
            </>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text">OR CONTINUE WITH</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Biometric */}
          <button
            onClick={biometricLogin}
            disabled={!email.trim()}
            className="w-full flex items-center justify-center
              gap-3 py-3 rounded-xl border border-accent-border
              bg-accent-bg text-accent font-semibold
              hover:bg-accent hover:text-white transition
              disabled:opacity-50"
          >
            <Fingerprint size={21} />
            Face ID / Fingerprint
          </button>

          {message && (
            <p className="text-sm text-center mt-4 text-accent">{message}</p>
          )}
        </div>

        <p className="text-center text-xs text-text mt-6">
          Protected with secure authentication
        </p>
      </div>
    </div>
  );
}

export default Login;
