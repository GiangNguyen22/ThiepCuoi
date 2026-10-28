// Endpoint: /api/admin/album
import { jsonResponse } from "../_auth.js";

// GET /api/admin/album: List all album items (both visible and hidden)
export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    const sql = `
      SELECT 
        a.id,
        a.image_id,
        a.sort_order,
        a.is_visible,
        a.caption,
        a.created_at,
        img.storage_key,
        img.original_name,
        img.mime_type,
        img.file_size,
        img.alt_text
      FROM album_items a
      JOIN images img ON a.image_id = img.id
      ORDER BY a.sort_order ASC, a.id ASC
    `;

    const result = await env.DB.prepare(sql).all();

    const data = (result.results || []).map((row) => ({
      id: row.id,
      image_id: row.image_id,
      sort_order: row.sort_order,
      is_visible: Boolean(row.is_visible),
      caption: row.caption || "",
      created_at: row.created_at,
      storage_key: row.storage_key,
      original_name: row.original_name,
      alt_text: row.alt_text || "",
      url: `/api/images/${row.storage_key}`
    }));

    return jsonResponse({
      success: true,
      data
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lấy danh sách album." }, 500);
  }
}

// POST /api/admin/album: Add an image to album
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

    const imageId = parseInt(body.image_id, 10);
    if (isNaN(imageId) || imageId <= 0) {
      return jsonResponse({ error: "ID hình ảnh không hợp lệ." }, 400);
    }

    const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 150) : "";

    // Verify image exists
    const image = await env.DB.prepare(
      "SELECT id, storage_key, original_name FROM images WHERE id = ?"
    ).bind(imageId).first();

    if (!image) {
      return jsonResponse({ error: "Không tìm thấy hình ảnh yêu cầu." }, 404);
    }

    // Check if already in album
    const existing = await env.DB.prepare(
      "SELECT id FROM album_items WHERE image_id = ?"
    ).bind(imageId).first();

    if (existing) {
      return jsonResponse({ error: "Hình ảnh này đã có trong Album cưới." }, 400);
    }

    // Calculate next sort order
    const maxOrderRow = await env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM album_items"
    ).first();
    const nextOrder = (maxOrderRow?.max_order ?? -1) + 1;

    const nowIso = new Date().toISOString();
    const insertRes = await env.DB.prepare(
      `INSERT INTO album_items (image_id, sort_order, is_visible, caption, created_at)
       VALUES (?, ?, 1, ?, ?)`
    ).bind(imageId, nextOrder, caption, nowIso).run();

    return jsonResponse({
      success: true,
      data: {
        id: insertRes.meta?.last_row_id,
        image_id: imageId,
        sort_order: nextOrder,
        is_visible: true,
        caption,
        url: `/api/images/${image.storage_key}`
      },
      message: "Đã thêm ảnh vào Album cưới thành công."
    }, 201);
  } catch (err) {
    return jsonResponse({ error: "Không thể thêm ảnh vào Album." }, 500);
  }
}
