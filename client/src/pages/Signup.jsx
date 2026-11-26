import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Mail, Phone, Calendar, User } from "lucide-react";
import api from "../services/api";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    phone: "",
    dob: "",
    surname: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email && !form.phone) {
      setError("Please enter an email or phone number.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dob: form.dob,
        surname: form.surname.trim(),
      });

      setSuccess("Account created successfully!");

      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 pl-11 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-bg";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-heading">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-text">Register to get started</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-background p-6 shadow-xl sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-text-heading">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-text" size={18} />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-heading">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-3.5 text-text"
                  size={18}
                />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className={inputClass}
                />
              </div>
            </div>

            <p className="-mt-3 text-xs text-text">
              Provide at least one: email or phone number.
            </p>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-heading">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-3.5 text-text"
                  size={18}
                />
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-heading">
                Surname
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-text" size={18} />
                <input
                  type="text"
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  placeholder="Enter your surname"
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-accent py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="mt-6 text-center text-sm text-text">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-accent hover:underline"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
