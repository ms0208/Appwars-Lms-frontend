
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
  KeyRound,
  RefreshCw,
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

  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");

  const [generatedAdminId, setGeneratedAdminId] = useState("");
  const [copied, setCopied] = useState(false);

  // ==========================================
  // COMMON HELPERS
  // ==========================================

  function showMessage(text, type = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setGeneratedAdminId("");
    setCopied(false);
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setResetToken("");
    setShowPassword(false);
  }

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

  // ==========================================
  // LOGIN
  // ==========================================

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) return;

    if (!id.trim() || !password) {
      showMessage("Please enter your ID and password.");
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
          "The server did not return a valid token and user role."
        );
      }

      const role = data.user.role;
      const destination = dashboardRoutes[role];

      if (!destination) {
        throw new Error(`Unsupported account role: ${role}`);
      }

      sessionStorage.setItem("token", data.token);

      sessionStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user._id || data.user.id || data.user.userId,
          userId: data.user.userId,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
        })
      );

      sessionStorage.removeItem("appwars_token");
      sessionStorage.removeItem("appwars_user");

      router.replace(destination);
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // INITIAL ADMIN REGISTRATION
  // ==========================================

  async function handleAdminRegistration(event) {
    event.preventDefault();

    if (loading) return;

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      showMessage("Please complete all registration fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      showMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      showMessage("Password must contain 12 to 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/register-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await readResponse(response);

      const newAdminId = data.user?.userId || data.userId;

      if (!newAdminId) {
        throw new Error(
          "Admin registration succeeded, but the generated ID was not returned."
        );
      }

      setGeneratedAdminId(newAdminId);

      showMessage(
        "Admin registration successful! Save your Admin ID before continuing.",
        "success"
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to register Admin. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // FORGOT PASSWORD - SEND OTP
  // POST /api/auth/forgot-password
  // ==========================================

  async function handleForgotPassword(event) {
    event.preventDefault();

    if (loading) return;

    if (!id.trim()) {
      showMessage("Please enter your generated User ID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id.trim().toUpperCase(),
          }),
        }
      );

      const data = await readResponse(response);

      showMessage(
        data.message ||
          "If an active account exists, an OTP has been sent to its registered email.",
        "success"
      );

      setMode("verify");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // VERIFY OTP
  // POST /api/auth/verify-otp
  // ==========================================

  async function handleVerifyOtp(event) {
    event.preventDefault();

    if (loading) return;

    if (!id.trim() || !otp.trim()) {
      showMessage("Please enter your User ID and OTP.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      showMessage("OTP must contain exactly 6 digits.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: id.trim().toUpperCase(),
          otp: otp.trim(),
        }),
      });

      const data = await readResponse(response);

      if (!data.resetToken) {
        throw new Error(
          "OTP verified, but the server did not return a reset token."
        );
      }

      setResetToken(data.resetToken);
      setOtp("");
      setMode("reset");

      showMessage(
        "OTP verified successfully. You can now create a new password.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // RESEND OTP
  // ==========================================

  async function handleResendOtp() {
    if (loading) return;

    if (!id.trim()) {
      showMessage("Please enter your User ID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id.trim().toUpperCase(),
          }),
        }
      );

      const data = await readResponse(response);

      showMessage(
        data.message || "OTP request submitted.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend OTP."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // RESET PASSWORD
  // POST /api/auth/reset-password
  // ==========================================

  async function handleResetPassword(event) {
    event.preventDefault();

    if (loading) return;

    if (!password || !confirmPassword) {
      showMessage("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      showMessage("Password must contain 8 to 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    if (!resetToken) {
      showMessage("Reset session is missing. Please start again.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: id.trim().toUpperCase(),
            resetToken,
            newPassword: password,
          }),
        }
      );

      const data = await readResponse(response);

      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setResetToken("");

      setMode("login");

      showMessage(
        data.message ||
          "Password reset successfully. Please log in with your new password.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // COPY GENERATED ADMIN ID
  // ==========================================

  async function copyAdminId() {
    try {
      await navigator.clipboard.writeText(generatedAdminId);
      setCopied(true);
    } catch {
      showMessage("Please select and copy your Admin ID manually.");
    }
  }

  // ==========================================
  // FORM SUBMIT HANDLER
  // ==========================================

  function handleSubmit(event) {
    if (mode === "login") {
      return handleLogin(event);
    }

    if (mode === "register") {
      return handleAdminRegistration(event);
    }

    if (mode === "forgot") {
      return handleForgotPassword(event);
    }

    if (mode === "verify") {
      return handleVerifyOtp(event);
    }

    if (mode === "reset") {
      return handleResetPassword(event);
    }
  }

  const titles = {
    login: "Welcome Back!",
    register: "Register Admin",
    forgot: "Forgot Password?",
    verify: "Verify OTP",
    reset: "Create New Password",
  };

  const descriptions = {
    login: "Sign in using your assigned ID and password.",
    register: "Create the initial Admin account for APPWARS LMS.",
    forgot: "Enter your generated User ID to receive a password reset OTP.",
    verify: "Enter the six-digit OTP sent to your registered email address.",
    reset: "Create a new password for your APPWARS LMS account.",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">

        {/* ======================================
            LEFT PANEL
        ====================================== */}

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
                Access batches, manage classes, track progress,
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

        {/* ======================================
            RIGHT PANEL
        ====================================== */}

        <section className="flex flex-col justify-center p-7 sm:p-12">

          {/* ADMIN REGISTRATION SUCCESS */}

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
                  setGeneratedAdminId("");
                  changeMode("login");
                }}
                className="mt-6 w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue to Sign In
              </button>
            </>
          ) : (
            <>

              {/* BACK BUTTON */}

              {mode !== "login" && (
                <button
                  type="button"
                  onClick={() => {
                    if (mode === "verify") {
                      changeMode("forgot");
                    } else if (mode === "reset") {
                      changeMode("forgot");
                    } else {
                      changeMode("login");
                    }
                  }}
                  className="mb-5 flex w-fit items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}

              {/* PAGE TITLE */}

              <div className="mb-2">
                <h2 className="text-2xl font-bold text-[#102e60]">
                  {titles[mode]}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {descriptions[mode]}
                </p>
              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >

                {/* NAME - ADMIN REGISTRATION */}

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

                {[
                  "login",
                  "forgot",
                  "verify",
                  "reset",
                ].includes(mode) && (
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
                        placeholder="Enter your generated ID"
                        autoComplete="username"
                        maxLength={50}
                        required
                        disabled={
                          loading ||
                          mode === "verify" ||
                          mode === "reset"
                        }
                        className="w-full bg-transparent py-3 text-sm text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* OTP */}

                {mode === "verify" && (
                  <div>
                    <label
                      htmlFor="otp"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Six-Digit OTP
                    </label>

                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                      <KeyRound
                        size={18}
                        className="shrink-0 text-slate-400"
                      />

                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otp}
                        onChange={(event) =>
                          setOtp(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6)
                          )
                        }
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        required
                        disabled={loading}
                        className="w-full bg-transparent py-3 text-sm tracking-[0.3em] text-slate-800 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <RefreshCw size={15} />
                      Resend OTP
                    </button>
                  </div>
                )}

                {/* PASSWORD */}

                {[
                  "login",
                  "register",
                  "reset",
                ].includes(mode) && (
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {mode === "register"
                        ? "Create Password"
                        : mode === "reset"
                          ? "New Password"
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
                            : mode === "reset"
                              ? "Enter your new password"
                              : "Enter your password"
                        }
                        autoComplete={
                          mode === "register" || mode === "reset"
                            ? "new-password"
                            : "current-password"
                        }
                        minLength={
                          mode === "register"
                            ? 12
                            : mode === "reset"
                              ? 8
                              : undefined
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

                    {(mode === "register" || mode === "reset") && (
                      <p className="mt-2 text-xs text-slate-500">
                        Password must contain at least{" "}
                        {mode === "register" ? "12" : "8"} characters.
                      </p>
                    )}
                  </div>
                )}

                {/* CONFIRM PASSWORD */}

                {[
                  "register",
                  "reset",
                ].includes(mode) && (
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
                        type={showPassword ? "text" : "password"}
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

                {/* SUBMIT BUTTON */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "login"
                      ? "Sign In"
                      : mode === "register"
                        ? "Create Admin Account"
                        : mode === "forgot"
                          ? "Send OTP"
                          : mode === "verify"
                            ? "Verify OTP"
                            : "Reset Password"}
                </button>
              </form>

              {/* FORGOT PASSWORD LINK */}

              {mode === "login" && (
                <div className="mt-5 text-right">
                  <button
                    type="button"
                    onClick={() => changeMode("forgot")}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* ADMIN REGISTRATION LINK */}

              {mode === "login" && (
                <div className="mt-6 rounded-lg bg-slate-50 p-4 text-center">
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

              {/* BACK TO LOGIN */}

              {mode === "forgot" && (
                <p className="mt-6 text-center text-sm text-slate-500">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => changeMode("login")}
                    className="font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Sign In
                  </button>
                </p>
              )}

              {mode === "verify" && (
                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  The OTP is valid for 5 minutes. Check the
                  registered email address associated with your User ID.
                </p>
              )}

              {mode === "reset" && (
                <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                  Your password reset session expires after 10 minutes.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
