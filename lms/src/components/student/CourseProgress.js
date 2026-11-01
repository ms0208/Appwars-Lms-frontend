
"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function CourseProgress({ onDetails }) {
  const [courses, setCourses] = useState([]);
  const [batchName, setBatchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        sessionStorage.getItem("appwars_token") ||
        sessionStorage.getItem("token");

      if (!token) {
        throw new Error("Please log in to view your courses.");
      }

      const response = await fetch(`${API_URL}/api/student/courses`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            "Failed to fetch courses."
        );
      }

      // Supports multiple backend response formats.
      const courseList =
        result.courses ??
        result.data?.courses ??
        result.data?.myCourses ??
        (Array.isArray(result.data) ? result.data : []);

      if (!Array.isArray(courseList)) {
        throw new Error("Invalid courses data received from the server.");
      }

      const normalizedCourses = courseList.map((item, index) => {
        // StudentProgress may return course as a populated object.
        const courseData =
          item.course && typeof item.course === "object"
            ? item.course
            : item;

        const completed = Number(
          item.completedLessonCount ??
            item.completedLessonsCount ??
            item.lessonsCompleted ??
            item.completed ??
            0
        );

        const total = Number(
          item.totalLessons ??
            item.lessonsCount ??
            item.total ??
            courseData.totalLessons ??
            0
        );

        const percentage = Number(
          item.progressPercent ??
            (total > 0 ? (completed / total) * 100 : 0)
        );

        const safePercentage = Math.min(
          100,
          Math.max(0, Math.round(percentage))
        );

        return {
          id: item._id || courseData._id || index,
          name:
            courseData.title ||
            courseData.name ||
            item.courseName ||
            item.title ||
            "Untitled course",
          code: courseData.code || item.courseCode || "",
          completed,
          total,
          percentage: safePercentage,
          status:
            safePercentage >= 100
              ? "Completed"
              : completed > 0
                ? `${completed} of ${total} lessons`
                : "Not started",
        };
      });

      setCourses(normalizedCourses);

      // Batch information can be returned separately by the backend.
      const assignedBatch =
        result.assignedBatch ||
        result.data?.assignedBatch ||
        result.batch ||
        result.data?.batch ||
        null;

      setBatchName(
        typeof assignedBatch === "string"
          ? assignedBatch
          : assignedBatch?.batch ||
              assignedBatch?.name ||
              result.batchName ||
              result.data?.batchName ||
              ""
      );
    } catch (err) {
      setError(
        err.message || "Something went wrong while fetching courses."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4">
      <h2 className="text-xs font-bold text-[#102e60]">
        My courses
      </h2>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Loading your courses...
        </p>
      ) : error ? (
        <div className="py-5 text-center">
          <p className="text-sm text-red-600">{error}</p>

          <button
            type="button"
            onClick={fetchCourses}
            className="mt-2 rounded-lg border border-blue-500 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            Try again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No courses have been assigned to you yet.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {courses.map((course) => (
            <div key={course.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-[#102e60]">
                    {course.name}
                  </h3>

                  {course.code && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {course.code}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-[10px] text-slate-500">
                  {course.status}
                </span>
              </div>

              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100"
                role="progressbar"
                aria-label={`${course.name} completion`}
                aria-valuenow={course.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${course.percentage}%`,
                  }}
                />
              </div>

              <p className="mt-1 text-right text-[10px] text-slate-400">
                {course.percentage}% completed
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-blue-50 pt-3">
        <p className="text-xs text-slate-500">
          {batchName || "Your assigned batch"}
        </p>

        <button
          type="button"
          onClick={onDetails}
          className="shrink-0 rounded-lg border border-blue-500 px-3 py-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
        >
          Batch details
        </button>
      </div>
    </section>
  );
}
