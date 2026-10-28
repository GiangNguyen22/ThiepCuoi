// Cloudflare Pages Function: /api/rsvps

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

export async function onRequestGet() {
  return new Response(JSON.stringify({
    error: "Method Not Allowed. Danh sách khách mời không được công khai."
  }), {
    status: 405,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Allow": "POST"
    }
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({
        error: "Cơ sở dữ liệu chưa sẵn sàng."
      }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Rate limiting & anti-spam: 5 submissions per 10 minutes per IP hash
    const ipHash = await getIpHash(request);
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    try {
      const countResult = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM rate_limits WHERE action = 'rsvp' AND ip_hash = ? AND created_at > ?"
      ).bind(ipHash, tenMinutesAgo).first();

      if (countResult && countResult.total >= 5) {
        return new Response(JSON.stringify({
          error: "Bạn đã gửi xác nhận nhiều lần. Vui lòng thử lại sau 10 phút."
        }), {
          status: 429,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    } catch (rateErr) {
      // Non-fatal if rate_limits table query fails, continue with caution
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
        error: "Tên khách mời phải từ 2 đến 100 ký tự."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Prohibit HTML/script tags in name
    if (/[<>]/.test(guestName)) {
      return new Response(JSON.stringify({
        error: "Tên khách mời chứa ký tự không hợp lệ."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Server-side validation: status
    const status = body.status;
    if (status !== "attending" && status !== "declined") {
      return new Response(JSON.stringify({
        error: "Trạng thái tham dự phải là 'attending' hoặc 'declined'."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Server-side validation: party_size
    let partySize = 1;
    if (status === "attending") {
      const parsedSize = parseInt(body.party_size, 10);
      if (isNaN(parsedSize) || parsedSize < 1 || parsedSize > 10) {
        return new Response(JSON.stringify({
          error: "Số lượng người tham dự phải từ 1 đến 10."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      partySize = parsedSize;
    } else {
      partySize = 0;
    }

    // Insert RSVP with prepared parameters
    const nowIso = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO rsvps (guest_name, status, party_size, created_at) VALUES (?, ?, ?, ?)"
    ).bind(guestName, status, partySize, nowIso).run();

    // Record rate limit event
    try {
      await env.DB.prepare(
        "INSERT INTO rate_limits (ip_hash, action, created_at) VALUES (?, ?, ?)"
      ).bind(ipHash, "rsvp", Date.now()).run();
    } catch {
      // Non-fatal
    }

    const message = status === "attending"
      ? "Cảm ơn bạn đã xác nhận tham dự! Chúng mình rất vui được đón tiếp bạn."
      : "Cảm ơn bạn đã phản hồi. Rất tiếc vì bạn không thể đến chung vui cùng chúng mình.";

    return new Response(JSON.stringify({
      success: true,
      message,
      data: {
        guest_name: guestName,
        status,
        party_size: partySize
      }
    }), {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Không thể lưu phản hồi do lỗi hệ thống. Vui lòng thử lại sau."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
