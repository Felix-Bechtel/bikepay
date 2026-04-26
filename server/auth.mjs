import jwt from "jsonwebtoken";
import { config } from "./config.mjs";

export function signToken(sub) {
  return jwt.sign({ sub }, config.jwtSecret, { expiresIn: "30d" });
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const sub = verifyToken(token);
  if (!sub) return res.status(401).json({ error: "unauthorized" });
  req.userEmail = sub;
  next();
}

export function checkOwnerLogin(email, password) {
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (email.toLowerCase() !== config.ownerEmail.toLowerCase()) return null;
  if (password !== config.ownerPassword) return null;
  return email.toLowerCase();
}
