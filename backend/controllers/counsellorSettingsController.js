import User from "../models/user.js";
import CounsellorSettings from "../models/CounsellorSettings.js";

// ==========================================
// GET /api/counsellor/settings
// Fetch logged-in counsellor settings
// ==========================================
export const getCounsellorSettings = async (req, res, next) => {
  try {
    // Support the JWT payload used by your auth middleware
    const userId =
      req.user?.sub ??
      req.user?.id ??
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Find logged-in user
    const user = await User.findById(userId)
      .select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account is inactive.",
      });
    }

    // Only Admin and Counsellor can access this settings endpoint
    if (!["Admin", "Counsellor"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access these settings.",
      });
    }

    // Find existing settings or create defaults
    let settings = await CounsellorSettings.findOne({
      user: user._id,
    });

    if (!settings) {
      settings = await CounsellorSettings.create({
        user: user._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Counsellor settings fetched successfully.",

      data: {
        profile: {
          fullName: user.name || "",
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          designation: user.designation || user.role || "Counsellor",
          department: user.department || "Admissions",
          employeeId: user.userId || "",
          timezone: user.timezone || "Asia/Kolkata",
          language: user.language || "English",
          photo: user.photo || "",
        },

        notifications: settings.notifications,
        appearance: settings.appearance,
        privacy: settings.privacy,
      },
    });
  } catch (error) {
    console.error("Get Counsellor Settings Error:", error);
    next(error);
  }
};