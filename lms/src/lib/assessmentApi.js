const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const getAssessmentToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("appwars_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
};

export const assessmentApi = async (
  endpoint,
  options = {}
) => {
  const token = getAssessmentToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong."
    );
  }

  return data;
};

export const getErrorMessage = (error) =>
  error?.message || "Something went wrong.";