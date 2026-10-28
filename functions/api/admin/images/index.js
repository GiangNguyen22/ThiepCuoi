// Endpoint: /api/admin/images
import { jsonResponse } from "../_auth.js";

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    // Query images with aggregated usage information from site_media and album_items
    const sql = `
      SELECT 
        img.id,
        img.storage_key,
        img.original_name,
        img.mime_type,
        img.file_size,
        img.alt_text,
        img.created_at,
        CASE WHEN sm_cover.image_id IS NOT NULL THEN 1 ELSE 0 END AS used_in_cover,
        CASE WHEN sm_venue.image_id IS NOT NULL THEN 1 ELSE 0 END AS used_in_venue,
        CASE WHEN alb.id IS NOT NULL THEN 1 ELSE 0 END AS used_in_album,
        alb.id AS album_item_id,
        alb.sort_order AS album_order,
        alb.is_visible AS album_visible,
        alb.caption AS album_caption
      FROM images img
      LEFT JOIN site_media sm_cover ON img.id = sm_cover.image_id AND sm_cover.slot_name = 'cover_photo'
      LEFT JOIN site_media sm_venue ON img.id = sm_venue.image_id AND sm_venue.slot_name = 'venue_photo'
      LEFT JOIN album_items alb ON img.id = alb.image_id
      ORDER BY img.created_at DESC, img.id DESC
    `;

    const result = await env.DB.prepare(sql).all();

    const data = (result.results || []).map((row) => ({
      id: row.id,
      storage_key: row.storage_key,
      original_name: row.original_name,
      mime_type: row.mime_type,
      file_size: row.file_size,
      alt_text: row.alt_text || "",
      created_at: row.created_at,
      url: `/api/images/${row.storage_key}`,
      used_in_cover: Boolean(row.used_in_cover),
      used_in_venue: Boolean(row.used_in_venue),
      used_in_album: Boolean(row.used_in_album),
      album_item_id: row.album_item_id || null,
      album_order: row.album_order !== null ? row.album_order : null,
      album_visible: row.album_visible !== null ? Boolean(row.album_visible) : null,
      album_caption: row.album_caption || ""
    }));

    return jsonResponse({
      success: true,
      data
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lấy danh sách hình ảnh." }, 500);
  }
}
