// Endpoint: /api/admin/images/:id
import { jsonResponse } from "../_auth.js";

// PATCH /api/admin/images/:id: Update alt_text
export async function onRequestPatch(context) {
  try {
    const { params, request, env } = context;
    const imageId = parseInt(params.id, 10);

    if (isNaN(imageId) || imageId <= 0) {
      return jsonResponse({ error: "ID hình ảnh không hợp lệ." }, 400);
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

    const altText = typeof body.alt_text === "string" ? body.alt_text.trim().slice(0, 200) : "";

    await env.DB.prepare(
      "UPDATE images SET alt_text = ? WHERE id = ?"
    ).bind(altText, imageId).run();

    return jsonResponse({
      success: true,
      message: "Đã cập nhật mô tả hình ảnh thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể cập nhật hình ảnh." }, 500);
  }
}

// DELETE /api/admin/images/:id: Delete image safely (checks usage references)
export async function onRequestDelete(context) {
  try {
    const { params, env } = context;
    const imageId = parseInt(params.id, 10);

    if (isNaN(imageId) || imageId <= 0) {
      return jsonResponse({ error: "ID hình ảnh không hợp lệ." }, 400);
    }

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    // 1. Fetch image record
    const image = await env.DB.prepare(
      "SELECT id, storage_key, original_name FROM images WHERE id = ?"
    ).bind(imageId).first();

    if (!image) {
      return jsonResponse({ error: "Không tìm thấy hình ảnh yêu cầu." }, 404);
    }

    // 2. Check if image is referenced in site_media (cover_photo, venue_photo, etc.)
    const siteSlot = await env.DB.prepare(
      "SELECT slot_name FROM site_media WHERE image_id = ?"
    ).bind(imageId).first();

    if (siteSlot) {
      const slotLabel = siteSlot.slot_name === "cover_photo" ? "ảnh bìa thiệp cưới" : "ảnh khu vực thiệp cưới";
      return jsonResponse({
        error: `Không thể xóa ảnh này vì đang được sử dụng làm ${slotLabel}. Vui lòng thay thế hoặc gỡ ảnh trước khi xóa.`
      }, 409);
    }

    // 3. Check if image is referenced in album_items
    const albumItem = await env.DB.prepare(
      "SELECT id FROM album_items WHERE image_id = ?"
    ).bind(imageId).first();

    if (albumItem) {
      return jsonResponse({
        error: "Không thể xóa ảnh này vì đang có mặt trong Album ảnh cưới. Vui lòng gỡ ảnh khỏi album trước khi xóa hoàn toàn."
      }, 409);
    }

    // 4. Delete from D1 database
    await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(imageId).run();

    // 5. Delete object from Cloudflare R2
    if (env.MEDIA_BUCKET && image.storage_key) {
      try {
        await env.MEDIA_BUCKET.delete(image.storage_key);
      } catch (r2Err) {
        console.warn("R2 delete warning:", r2Err);
      }
    }

    return jsonResponse({
      success: true,
      message: `Đã xóa hình ảnh "${image.original_name}" thành công.`
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể xóa hình ảnh." }, 500);
  }
}
