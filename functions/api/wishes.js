// Cloudflare Pages Function: /api/wishes

async function getIpHash(request) {
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

// GET /api/wishes: Public approved wishes only
export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cơ sở dữ liệu chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);

    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = !isNaN(limitParam) && limitParam > 0 && limitParam <= 30 ? limitParam : 10;
    const offset = (page - 1) * limit;

    // Fetch ONLY approved wishes. Never return pending or hidden rows.
    const wishesQuery = await env.DB.prepare(
      "SELECT id, guest_name, message, created_at FROM wishes WHERE status = 'approved' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();

    const countQuery = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM wishes WHERE status = 'approved'"
    ).first();

    const total = countQuery ? countQuery.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return new Response(JSON.stringify({
      success: true,
      data: wishesQuery.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Không thể lấy danh sách lời chúc." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

// POST /api/wishes: Public wish submission (always saved as 'pending')
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cơ sở dữ liệu chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Rate limiting: 5 wishes per 10 minutes per IP hash
    const ipHash = await getIpHash(request);
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    try {
      const countResult = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM rate_limits WHERE action = 'wish' AND ip_hash = ? AND created_at > ?"
      ).bind(ipHash, tenMinutesAgo).first();

      if (countResult && countResult.total >= 5) {
        return new Response(JSON.stringify({
          error: "Bạn đã gửi lời chúc nhiều lần. Vui lòng thử lại sau 10 phút."
        }), {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    } catch {
      // Non-fatal
    }

    // Parse body
    let body;
    try {
      const rawText = await request.text();
      if (rawText.length > 10240) {
        return new Response(JSON.stringify({ error: "Dữ liệu gửi lên quá lớn." }), {
          status: 413,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      body = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify({ error: "Dữ liệu JSON không hợp lệ." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Honeypot check
    if (body.website || body.company || body.hp_field) {
      return new Response(JSON.stringify({ error: "Yêu cầu bị từ chối." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Server-side validation: guest_name
    const guestName = typeof body.guest_name === "string" ? body.guest_name.trim() : "";
    if (guestName.length < 2 || guestName.length > 100) {
      return new Response(JSON.stringify({
        error: "Tên người gửi phải từ 2 đến 100 ký tự."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (/[<>]/.test(guestName)) {
      return new Response(JSON.stringify({
        error: "Tên người gửi chứa ký tự không hợp lệ."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Server-side validation: message
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message.length < 3 || message.length > 1000) {
      return new Response(JSON.stringify({
        error: "Lời chúc phải từ 3 đến 1000 ký tự."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Security requirement 4 & 6: ALWAYS force status = 'pending'.
    // Ignore any status sent by client so users cannot approve their own wish.
    const status = "pending";
    const nowIso = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO wishes (guest_name, message, status, created_at) VALUES (?, ?, ?, ?)"
    ).bind(guestName, message, status, nowIso).run();

    // Record rate limit event
    try {
      await env.DB.prepare(
        "INSERT INTO rate_limits (ip_hash, action, created_at) VALUES (?, ?, ?)"
      ).bind(ipHash, "wish", Date.now()).run();
    } catch {
      // Non-fatal
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Cảm ơn bạn đã gửi lời chúc! Lời chúc của bạn sẽ được hiển thị sau khi được gia đình duyệt."
    }), {
      status: 201,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Không thể lưu lời chúc do lỗi hệ thống. Vui lòng thử lại sau."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
