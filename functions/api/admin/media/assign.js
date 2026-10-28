// Endpoint: /api/admin/media/assign
import { jsonResponse } from "../_auth.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Dữ liệu JSON không hợp lệ." }, 400);
    }

    const slotName = typeof body.slot_name === "string" ? body.slot_name.trim() : "";
    const allowedSlots = ["cover_photo", "venue_photo"];

    if (!allowedSlots.includes(slotName)) {
      return jsonResponse({ error: "Vị trí ảnh không hợp lệ." }, 400);
    }

    const imageId = body.image_id !== null && body.image_id !== undefined ? parseInt(body.image_id, 10) : null;
    const nowIso = new Date().toISOString();

    if (imageId === null || isNaN(imageId) || imageId <= 0) {
      // Unassign: revert to default site asset
      await env.DB.prepare("DELETE FROM site_media WHERE slot_name = ?").bind(slotName).run();
      return jsonResponse({
        success: true,
        slot_name: slotName,
        image_id: null,
        message: `Đã khôi phục ảnh mặc định cho vị trí ${slotName === "cover_photo" ? "ảnh bìa" : "ảnh sự kiện"}.`
      });
    }

    // Verify image exists
    const image = await env.DB.prepare(
      "SELECT id, storage_key, original_name FROM images WHERE id = ?"
    ).bind(imageId).first();

    if (!image) {
      return jsonResponse({ error: "Không tìm thấy hình ảnh yêu cầu." }, 404);
    }

    // Assign image to slot using upsert
    await env.DB.prepare(
      `INSERT INTO site_media (slot_name, image_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(slot_name) DO UPDATE SET image_id = excluded.image_id, updated_at = excluded.updated_at`
    ).bind(slotName, imageId, nowIso).run();

    const label = slotName === "cover_photo" ? "Ảnh bìa thiệp cưới" : "Ảnh sự kiện";

    return jsonResponse({
      success: true,
      slot_name: slotName,
      image_id: imageId,
      url: `/api/images/${image.storage_key}`,
      message: `${label} đã được cập nhật thành công.`
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể gán hình ảnh cho vị trí này." }, 500);
  }
}
