// Middleware protecting all /api/admin/* endpoints
import { jsonResponse, extractToken, hashToken } from "./_auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Allow login endpoint (POST /api/admin/session) without existing session
  if (url.pathname === "/api/admin/session" && request.method === "POST") {
    return await context.next();
  }

  // Preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": url.origin,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token, X-Requested-With",
        "Access-Control-Allow-Credentials": "true"
      }
    });
  }

  if (!env.DB) {
    return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
  }

  const token = extractToken(request);
  if (!token) {
    return jsonResponse({ error: "Yêu cầu đăng nhập quản trị." }, 401);
  }

  const tokenHash = await hashToken(token);
  const now = Date.now();

  try {
    const session = await env.DB.prepare(
      `SELECT s.token_hash, s.admin_id, s.expires_at, u.username
       FROM admin_sessions s
       JOIN admin_users u ON s.admin_id = u.id
       WHERE s.token_hash = ?`
    ).bind(tokenHash).first();

    if (!session) {
      return jsonResponse({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." }, 401);
    }

    if (session.expires_at < now) {
      // Clean up expired session
      try {
        await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
      } catch {}
      return jsonResponse({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." }, 401);
    }

    // CSRF protection for mutating requests (POST, PATCH, DELETE, PUT)
    const method = request.method.toUpperCase();
    if (["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
      const origin = request.headers.get("Origin");
      const hasCustomHeader = Boolean(
        request.headers.get("X-Requested-With") ||
        request.headers.get("X-Admin-Token") ||
        request.headers.get("Authorization")
      );

      if (origin && !hasCustomHeader) {
        // Verify origin matches request host
        const requestHost = request.headers.get("Host") || url.host;
        try {
          const originHost = new URL(origin).host;
          if (originHost !== requestHost) {
            return jsonResponse({ error: "Yêu cầu bị từ chối do vi phạm quy tắc bảo mật (CSRF)." }, 403);
          }
        } catch {
          return jsonResponse({ error: "Yêu cầu không hợp lệ." }, 403);
        }
      }
    }

    // Attach admin info to context
    context.data = context.data || {};
    context.data.admin = {
      id: session.admin_id,
      username: session.username,
      tokenHash
    };

    return await context.next();
  } catch (error) {
    return jsonResponse({ error: "Lỗi kiểm tra quyền truy cập." }, 500);
  }
}
