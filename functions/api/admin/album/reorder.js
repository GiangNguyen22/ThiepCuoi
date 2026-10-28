// Endpoint: /api/admin/album/reorder
import { jsonResponse } from "../_auth.js";

export async function onRequestPut(context) {
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

    const itemIds = body.item_ids;
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return jsonResponse({ error: "Danh sách ID mục album không hợp lệ." }, 400);
    }

    // Prepare batch update statements
    const stmts = itemIds.map((id, index) => {
      const parsedId = parseInt(id, 10);
      return env.DB.prepare("UPDATE album_items SET sort_order = ? WHERE id = ?").bind(index, parsedId);
    });

    await env.DB.batch(stmts);

    return jsonResponse({
      success: true,
      message: "Đã lưu thứ tự hiển thị Album cưới thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lưu thứ tự album." }, 500);
  }
}
