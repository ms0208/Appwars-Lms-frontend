
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  Mail,
  Copy,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

// .env.local:
// NEXT_PUBLIC_API_URL=http://localhost:5000/api

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const dashboardRoutes = {
  Admin: "/admin",
  Student: "/studentdashboard",
  Trainer: "/trainerdashboard",
  Counsellor: "/counsellor",
};

export default function SignInPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const [generatedAdminId, setGeneratedAdminId] = useState("");
  const [copied, setCopied] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setGeneratedAdminId("");
    setCopied(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  // Read the backend response safely.
  async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `Request failed with status ${response.status}.`
      );
    }

    return data;
  }

  // LOGIN
  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    if (!id.trim() || !password) {
      setMessage("Please enter your ID and password.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: id.trim(),
          password,
        }),
      });

      const data = await readResponse(response);

      if (!data.token || !data.user?.role) {
        throw new Error(
          "The server did not return a valid token and user role. Check your login controller response."
        );
      }

      const role = data.user.role;
      const destination = dashboardRoutes[role];

      if (!destination) {
        throw new Error(`Unsupported account role: ${role}`);
      }

      // Use the same keys as the protected admin layout.
      sessionStorage.setItem("token", data.token);

      sessionStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user._id || data.user.userId,
          userId: data.user.userId,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        })
      );

      // Clear legacy keys if they were used previously.
      sessionStorage.removeItem("appwars_token");
      sessionStorage.removeItem("appwars_user");

      router.replace(destination);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // INITIAL ADMIN REGISTRATION
  async function handleAdminRegistration(event) {
    event.preventDefault();

    if (loading) return;

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Please complete all registration fields.");
      setMessageType("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      setMessage("Please enter a valid email address.");
      setMessageType("error");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setMessage("Password must contain 12 to 128 characters.");
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/register-admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await readResponse(response);

      // Supports either { user: { userId } } or { userId }.
      const newAdminId = data.user?.userId || data.userId;

      if (!newAdminId) {
        throw new Error(
          "Admin registration succeeded, but the generated ID was not returned. Check your backend response."
        );
      }

      setGeneratedAdminId(newAdminId);
      setMessage(
        "Admin registration successful! Save your Admin ID before continuing."
      );
      setMessageType("success");

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to register Admin. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  // COPY GENERATED ADMIN ID
  async function copyAdminId() {
    try {
      await navigator.clipboard.writeText(generatedAdminId);
      setCopied(true);
    } catch {
      setMessage("Please select and copy your Admin ID manually.");
      setMessageType("error");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="flex flex-col justify-between bg-[#102e60] p-8 text-white sm:p-12">
          <div>
            <div className="flex items-center gap-3">
              <GraduationCap
                size={40}
                className="text-sky-400"
              />

              <div>
                <h1 className="text-lg font-bold">
                  APPWARS LMS
                </h1>

                <p className="text-xs text-blue-200">
                  APPWARS TECHNOLOGIES PVT. LTD.
                </p>
              </div>
            </div>

            <div className="mt-14">
              <p className="text-sm font-semibold text-sky-300">
                LEARN. BUILD. LEAD.
              </p>

              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Your learning journey starts here.
              </h2>

              <p className="mt-5 text-sm leading-7 text-blue-100">
                Access courses, manage classes, track progress,
                and collaborate through one learning management
                platform.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-xl border border-blue-800 bg-blue-900/40 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-sky-300">
              <ShieldCheck size={20} />
              Secure Portal Access
            </h3>

            <p className="mt-2 text-sm leading-6 text-blue-100">
              Admins manage user accounts, while Students,
              Trainers, and Counsellors use the credentials
              assigned to them.
            </p>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="flex flex-col justify-center p-7 sm:p-12">
          {generatedAdminId ? (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 size={32} />
              </div>

              <h2 className="text-2xl font-bold text-[#102e60]">
                Admin Registered!
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your Admin account has been created. Keep this
                ID safe because you will use it to sign in.
              </p>

              <div className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-slate-600">
                  Your Generated Admin ID
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 break-all text-xl font-bold tracking-wide text-[#102e60]">
                    {generatedAdminId}
                  </p>

                  <button
                    type="button"
                    onClick={copyAdminId}
                    aria-label="Copy Admin ID"
                    className="rounded-lg border border-blue-200 bg-white p-3 text-blue-700 hover:bg-blue-100"
                  >
                    {copied ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Copy size={20} />
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="mt-2 text-xs text-green-700">
                    Admin ID copied successfully.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setId(generatedAdminId);
                  changeMode("login");
                }}
                className="mt-6 w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to Sign In
              </button>
            </>
          ) : (
            <>
              {mode === "register" && (
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="mb-5 flex w-fit items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Back to Sign In
                </button>
              )}

              <h2 className="text-2xl font-bold text-[#102e60]">
                {mode === "login"
                  ? "Welcome Back!"
                  : "Register Admin"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "Sign in using your assigned ID and password."
                  : "Create the initial Admin account for APPWARS LMS."}
              </p>

              <form
                onSubmit={
                  mode === "login"
                    ? handleLogin
                    : handleAdminRegistration
                }
                className="mt-8 space-y-5"
              >
                {/* NAME */}
                {mode === "register" && (
                  <>
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Full Name
                      </label>

                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <UserRound
                          size={18}
                          className="shrink-0 text-slate-400"
                        />

                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(event) =>
                            setName(event.target.value)
                          }
                          placeholder="Enter your full name"
                          autoComplete="name"
                          maxLength={100}
                          required
                          disabled={loading}
                          className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Email Address
                      </label>

                      <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                        <Mail
                          size={18}
                          className="shrink-0 text-slate-400"
                        />

                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(event) =>
                            setEmail(event.target.value)
                          }
                          placeholder="Enter your email"
                          autoComplete="email"
                          maxLength={254}
                          required
                          disabled={loading}
                          className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* USER ID */}
                {mode === "login" && (
                  <div>
                    <label
                      htmlFor="userId"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      User ID
                    </label>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <UserRound
                        size={18}
                        className="shrink-0 text-slate-400"
                      />

                      <input
                        id="userId"
                        type="text"
                        value={id}
                        onChange={(event) =>
                          setId(event.target.value)
                        }
                        placeholder="Enter your assigned ID"
                        autoComplete="username"
                        maxLength={50}
                        required
                        disabled={loading}
                        className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    {mode === "register"
                      ? "Create Password"
                      : "Password"}
                  </label>

                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                    <LockKeyhole
                      size={18}
                      className="shrink-0 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder={
                        mode === "register"
                          ? "Create a strong password"
                          : "Enter your password"
                      }
                      autoComplete={
                        mode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      minLength={
                        mode === "register" ? 12 : undefined
                      }
                      maxLength={128}
                      required
                      disabled={loading}
                      className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      className="shrink-0 text-slate-400 hover:text-blue-600"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  {mode === "register" && (
                    <p className="mt-2 text-xs text-slate-500">
                      Use 12–128 characters for your password.
                    </p>
                  )}
                </div>

                {/* CONFIRM PASSWORD */}
                {mode === "register" && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Confirm Password
                    </label>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <LockKeyhole
                        size={18}
                        className="shrink-0 text-slate-400"
                      />

                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        disabled={loading}
                        className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* SUCCESS / ERROR MESSAGE */}
                {message && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={`rounded-lg p-3 text-sm ${
                      messageType === "success"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {message}
                  </p>
                )}

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? mode === "login"
                      ? "Signing In..."
                      : "Registering Admin..."
                    : mode === "login"
                      ? "Sign In"
                      : "Create Admin Account"}
                </button>
              </form>

              {mode === "login" && (
                <div className="mt-6 rounded-lg bg-slate-50 p-4">
                  <p className="text-center text-xs leading-5 text-slate-500">
                    Forgot your password or login ID? Please
                    contact your administrator.
                  </p>
                </div>
              )}

              {mode === "login" && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-600">
                    Setting up the LMS for the first time?
                  </p>

                  <button
                    type="button"
                    onClick={() => changeMode("register")}
                    className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Register Initial Admin
                  </button>
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} APPWARS TECHNOLOGIES
            PVT. LTD.
          </p>
        </section>
      </div>
    </main>
  );
}
