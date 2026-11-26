import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Fingerprint,
  ShieldCheck,
  LogOut,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setError("");
    setMessage("");

    try {
      setRegistering(true);

      const optionsRes = await api.post("/auth/key/register");

      const options = optionsRes.data.options || optionsRes.data;

      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });

      await api.post("/auth/key/register/verify", {
        response: registrationResponse,
      });

      setMessage("Biometric authentication registered successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Passkey registration failed.",
      );
    } finally {
      setRegistering(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <ShieldCheck size={22} />
            </div>

            <span className="text-xl font-bold text-text-heading">
              SecureAuth
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-heading transition hover:bg-accent-bg"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-accent">DASHBOARD</p>

          <h1 className="mt-2 text-3xl font-bold text-text-heading">
            Welcome, {user.surname}!
          </h1>

          <p className="mt-2 text-text">
            Manage your account and authentication settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-accent-bg p-3 text-accent">
                <User size={22} />
              </div>

              <h2 className="text-lg font-semibold text-text-heading">
                Profile Information
              </h2>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Mail className="text-accent" size={19} />
                <div>
                  <p className="text-xs text-text">Email</p>
                  <p className="font-medium text-text-heading">
                    {user.email || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-accent" size={19} />
                <div>
                  <p className="text-xs text-text">Phone</p>
                  <p className="font-medium text-text-heading">
                    {user.phone || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-accent" size={19} />
                <div>
                  <p className="text-xs text-text">Date of Birth</p>
                  <p className="font-medium text-text-heading">
                    {user.dob
                      ? new Date(user.dob).toLocaleDateString()
                      : "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Security Card */}
          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-accent-bg p-3 text-accent">
                <Fingerprint size={22} />
              </div>

              <h2 className="text-lg font-semibold text-text-heading">
                Account Security
              </h2>
            </div>

            <div className="rounded-xl border border-border bg-code-bg p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-green-500" size={22} />

                <div>
                  <p className="font-semibold text-text-heading">
                    Passkey Authentication
                  </p>
                  <p className="text-xs text-text">
                    Use device biometrics for secure login.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleRegisterPasskey}
              disabled={registering}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {registering ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint size={19} />
                  Register Biometrics
                </>
              )}
            </button>

            {message && (
              <p className="mt-4 text-sm text-green-500">{message}</p>
            )}

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
