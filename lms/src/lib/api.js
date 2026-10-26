// Central place for API calls when a backend is connected.
// Example:
// export async function getStudentDashboard() {
//   const response = await fetch("/api/student/dashboard");
//   if (!response.ok) throw new Error("Unable to load dashboard");
//   return response.json();
// }

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
