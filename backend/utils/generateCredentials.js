
import crypto from "crypto";

const ROLE_PREFIXES = {
  Admin: "ADM",
  Student: "STU",
  Trainer: "TRN",
  Counsellor: "CNS",
};

export const generateUserId = (role) => {
  const prefix = ROLE_PREFIXES[role];

  if (!prefix) {
    throw new Error("Invalid user role");
  }

  const uniquePart = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `${prefix}${uniquePart}`;
};

export const generateTemporaryPassword = (length = 16) => {
  if (!Number.isInteger(length) || length < 12 || length > 128) {
    throw new Error("Password length must be between 12 and 128");
  }

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!";

  const maxValidByte = 256 - (256 % characters.length);
  let password = "";

  while (password.length < length) {
    const bytes = crypto.randomBytes(length);

    for (const byte of bytes) {
      if (byte < maxValidByte) {
        password += characters[byte % characters.length];

        if (password.length === length) break;
      }
    }
  }

  return password;
};
