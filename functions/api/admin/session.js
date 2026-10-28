// Endpoint: /api/admin/session
import { jsonResponse, hashPassword, hashToken, getIpHash } from "./_auth.js";

// GET /api/admin/session: Check current login status
export async function onRequestGet(context) {
  const admin = context.data?.admin;
  if (!admin) {
    return jsonResponse({ authenticated: false, error: "Chưa đăng nhập." }, 401);
  }
  return jsonResponse({
    authenticated: true,
    username: admin.username
  });
}

// POST /api/admin/session: Admin login
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    // Rate limiting: 5 failed attempts per 15 minutes per IP
    const ipHash = await getIpHash(request);
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

    try {
      const failCount = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM rate_limits WHERE action = 'admin_login_fail' AND ip_hash = ? AND created_at > ?"
      ).bind(ipHash, fifteenMinutesAgo).first();

      if (failCount && failCount.total >= 5) {
        return jsonResponse({
          error: "Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau 15 phút."
        }, 429);
      }
    } catch {}

    // Parse body
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Dữ liệu yêu cầu không hợp lệ." }, 400);
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return jsonResponse({ error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." }, 400);
    }

    // Generic error message to prevent user enumeration
    const genericAuthError = "Tên đăng nhập hoặc mật khẩu không chính xác.";

    // Query user
    const user = await env.DB.prepare(
      "SELECT id, username, password_hash, salt FROM admin_users WHERE username = ? COLLATE NOCASE"
    ).bind(username).first();

    if (!user) {
      // Record failed attempt
      try {
        await env.DB.prepare(
          "INSERT INTO rate_limits (ip_hash, action, created_at) VALUES (?, 'admin_login_fail', ?)"
        ).bind(ipHash, Date.now()).run();
      } catch {}
      return jsonResponse({ error: genericAuthError }, 401);
    }

    // Verify password hash
    const calculatedHash = await hashPassword(password, user.salt);
    if (calculatedHash !== user.password_hash) {
      // Record failed attempt
      try {
        await env.DB.prepare(
          "INSERT INTO rate_limits (ip_hash, action, created_at) VALUES (?, 'admin_login_fail', ?)"
        ).bind(ipHash, Date.now()).run();
      } catch {}
      return jsonResponse({ error: genericAuthError }, 401);
    }

    // Success: Generate cryptographically secure session token
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const rawToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    const tokenHash = await hashToken(rawToken);

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
    const nowIso = new Date().toISOString();

    // Store session in D1
    await env.DB.prepare(
      "INSERT INTO admin_sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).bind(tokenHash, user.id, expiresAt, nowIso).run();

    // Determine cookie flags (Secure if https or production)
    const url = new URL(request.url);
    const isHttps = url.protocol === "https:";
    const cookieHeader = `admin_session=${rawToken}; Path=/api/admin; Max-Age=86400; HttpOnly; SameSite=Strict;${isHttps ? " Secure;" : ""}`;

    return jsonResponse({
      success: true,
      username: user.username,
      token: rawToken,
      expires_at: expiresAt
    }, 200, {
      "Set-Cookie": cookieHeader
    });
  } catch (error) {
    return jsonResponse({ error: "Lỗi hệ thống khi đăng nhập." }, 500);
  }
}

// DELETE /api/admin/session: Admin logout
export async function onRequestDelete(context) {
  try {
    const { env } = context;
    const admin = context.data?.admin;

    if (admin && env.DB) {
      try {
        await env.DB.prepare(
          "DELETE FROM admin_sessions WHERE token_hash = ?"
        ).bind(admin.tokenHash).run();
      } catch {}
    }

    // Clear cookie
    const url = new URL(context.request.url);
    const isHttps = url.protocol === "https:";
    const clearCookie = `admin_session=; Path=/api/admin; Max-Age=0; HttpOnly; SameSite=Strict;${isHttps ? " Secure;" : ""}`;

    return jsonResponse({
      success: true,
      message: "Đăng xuất thành công."
    }, 200, {
      "Set-Cookie": clearCookie
    });
  } catch (error) {
    return jsonResponse({ error: "Lỗi khi đăng xuất." }, 500);
  }
}
