
import jwt from "jsonwebtoken";

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in your .env file");
  }

  const token = jwt.sign(
    {
      sub: user._id.toString(),
      userId: user.userId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      algorithm: "HS256",
    }
  );

  return token;
};

export default generateToken;
