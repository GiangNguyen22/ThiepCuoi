// Helper utilities for Admin Authentication and Security

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derived))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashToken(token) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getIpHash(request) {
  const ip = request.headers.get("cf-connecting-ip") ||
             request.headers.get("x-forwarded-for") ||
             "127.0.0.1";
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "_salt_thiepcuoi_v2");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function extractToken(request) {
  // 1. Check Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }

  // 2. Check X-Admin-Token header
  const customHeader = request.headers.get("X-Admin-Token");
  if (customHeader && customHeader.trim()) {
    return customHeader.trim();
  }

  // 3. Check Cookie: admin_session=<token>
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [name, ...valParts] = cookie.trim().split("=");
      if (name === "admin_session") {
        return valParts.join("=").trim();
      }
    }
  }

  return null;
}
