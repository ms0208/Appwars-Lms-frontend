
"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BatchDetailsModal({ onClose }) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchBatchDetails() {
    try {
      setLoading(true);
      setError("");

      const token =
        sessionStorage.getItem("token") ||
        localStorage.getItem("appwars_token");

      if (!token) {
        throw new Error("Please log in to view your batch details.");
      }

      const response = await fetch(
        `${API_URL}/api/student/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to fetch batch details."
        );
      }

      // Correctly access backend response
      const student = result.user;

      const batchData = student?.batchDetails;

      if (!batchData) {
        setBatch(null);
        return;
      }

      setBatch({
        ...batchData,
        batch: batchData.batch || student.batch,
      });

    } catch (err) {
      setError(err.message || "Unable to load batch details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBatchDetails();
  }, []);

  function formatDate(value) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const batchName = batch?.batch || "Not assigned";

  const trainer =
    typeof batch?.trainer === "object"
      ? batch.trainer?.name || "Not assigned"
      : batch?.trainer
        ? "Trainer assigned"
        : "Not assigned";

  const duration = batch?.durationMonths
    ? `${batch.durationMonths} Months`
    : "Not specified";

  const startDate = formatDate(batch?.startDate);

  const endDate = batch?.endDate
    ? formatDate(batch.endDate)
    : batch?.startDate && batch?.durationMonths
      ? formatDate(
          new Date(
            new Date(batch.startDate).setMonth(
              new Date(batch.startDate).getMonth() +
                batch.durationMonths
            )
          )
        )
      : "Not specified";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2
            id="batch-title"
            className="text-lg font-bold text-[#102e60]"
          >
            Batch Details
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close batch details"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <RefreshCw
              className="mx-auto animate-spin text-blue-600"
              size={24}
            />
            <p className="mt-3 text-sm text-slate-500">
              Loading batch details...
            </p>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={fetchBatchDetails}
              className="mt-3 rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Try again
            </button>
          </div>
        ) : !batch ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No batch has been assigned to your account yet.
          </p>
        ) : (
          <dl className="mt-5 space-y-4 text-sm">

            <div>
              <dt className="text-xs text-slate-500">
                Batch Name
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {batchName}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Course
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {batch.course || "Not specified"}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Trainer
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {trainer}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Start Date
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {startDate}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                End Date
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {endDate}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Duration
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {duration}
              </dd>
            </div>

            {batch.description && (
              <div>
                <dt className="text-xs text-slate-500">
                  Description
                </dt>
                <dd className="mt-1 text-slate-700">
                  {batch.description}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-xs text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-semibold capitalize text-green-600">
                {batch.status || "Not specified"}
              </dd>
            </div>

          </dl>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Close
        </button>
      </section>
    </div>
  );
}
