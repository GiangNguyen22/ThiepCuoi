// Endpoint: /api/admin/album/:id
import { jsonResponse } from "../_auth.js";

// PATCH /api/admin/album/:id: Update visibility or caption
export async function onRequestPatch(context) {
  try {
    const { params, request, env } = context;
    const albumItemId = parseInt(params.id, 10);

    if (isNaN(albumItemId) || albumItemId <= 0) {
      return jsonResponse({ error: "ID album không hợp lệ." }, 400);
    }

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Dữ liệu JSON không hợp lệ." }, 400);
    }

    const updates = [];
    const bindings = [];

    if (body.is_visible !== undefined) {
      updates.push("is_visible = ?");
      bindings.push(body.is_visible ? 1 : 0);
    }

    if (body.caption !== undefined) {
      updates.push("caption = ?");
      bindings.push(typeof body.caption === "string" ? body.caption.trim().slice(0, 150) : "");
    }

    if (body.sort_order !== undefined) {
      const order = parseInt(body.sort_order, 10);
      if (!isNaN(order) && order >= 0) {
        updates.push("sort_order = ?");
        bindings.push(order);
      }
    }

    if (updates.length === 0) {
      return jsonResponse({ error: "Không có thông tin cần cập nhật." }, 400);
    }

    bindings.push(albumItemId);
    await env.DB.prepare(
      `UPDATE album_items SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...bindings).run();

    return jsonResponse({
      success: true,
      message: "Đã cập nhật mục album thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể cập nhật mục album." }, 500);
  }
}

// DELETE /api/admin/album/:id: Remove image from album (does NOT delete underlying image file)
export async function onRequestDelete(context) {
  try {
    const { params, env } = context;
    const albumItemId = parseInt(params.id, 10);

    if (isNaN(albumItemId) || albumItemId <= 0) {
      return jsonResponse({ error: "ID album không hợp lệ." }, 400);
    }

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    await env.DB.prepare(
      "DELETE FROM album_items WHERE id = ?"
    ).bind(albumItemId).run();

    return jsonResponse({
      success: true,
      message: "Đã gỡ ảnh khỏi Album cưới thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể gỡ ảnh khỏi album." }, 500);
  }
}
