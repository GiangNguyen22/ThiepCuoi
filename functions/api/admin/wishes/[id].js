// Endpoint: /api/admin/wishes/:id
import { jsonResponse } from "../_auth.js";

export async function onRequestPatch(context) {
  try {
    const { request, env, params } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    const wishId = parseInt(params.id, 10);
    if (isNaN(wishId) || wishId <= 0) {
      return jsonResponse({ error: "ID lời chúc không hợp lệ." }, 400);
    }

    // Parse body
    let body;
    try {
      const text = await request.text();
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Dữ liệu JSON không hợp lệ." }, 400);
    }

    const nextStatus = typeof body.status === "string" ? body.status.toLowerCase().trim() : "";
    const allowedStatuses = ["approved", "hidden", "pending"];

    if (!allowedStatuses.includes(nextStatus)) {
      return jsonResponse({
        error: "Trạng thái mới phải là 'approved', 'hidden' hoặc 'pending'."
      }, 400);
    }

    // Check if wish exists
    const existing = await env.DB.prepare(
      "SELECT id, status FROM wishes WHERE id = ?"
    ).bind(wishId).first();

    if (!existing) {
      return jsonResponse({ error: "Không tìm thấy lời chúc yêu cầu." }, 404);
    }

    // Update status
    await env.DB.prepare(
      "UPDATE wishes SET status = ? WHERE id = ?"
    ).bind(nextStatus, wishId).run();

    const statusLabel = nextStatus === "approved" ? "đã duyệt" : nextStatus === "hidden" ? "đã ẩn" : "chờ duyệt";

    return jsonResponse({
      success: true,
      id: wishId,
      status: nextStatus,
      message: `Lời chúc #${wishId} đã chuyển sang trạng thái ${statusLabel}.`
    });
  } catch (error) {
    return jsonResponse({ error: "Không thể cập nhật lời chúc." }, 500);
  }
}
