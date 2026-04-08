import jwt from "jsonwebtoken";
import { adminConfig } from "../config.js";

export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing admin token" });
  }

  try {
    const payload = jwt.verify(token, adminConfig.jwtSecret);
    if (payload.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin role required" });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
