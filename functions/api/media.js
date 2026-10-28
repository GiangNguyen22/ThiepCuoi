// Endpoint: /api/media
// Public endpoint providing active site images (cover photo, venue photo, album)

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cơ sở dữ liệu chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // 1. Fetch site slots (cover_photo, venue_photo)
    const slotsQuery = await env.DB.prepare(
      `SELECT sm.slot_name, img.storage_key, img.alt_text
       FROM site_media sm
       JOIN images img ON sm.image_id = img.id`
    ).all();

    const slotsMap = {};
    if (slotsQuery.results) {
      slotsQuery.results.forEach((row) => {
        slotsMap[row.slot_name] = {
          url: `/api/images/${row.storage_key}`,
          alt_text: row.alt_text || ""
        };
      });
    }

    // 2. Fetch active album items
    const albumQuery = await env.DB.prepare(
      `SELECT a.id, a.caption, a.sort_order, img.storage_key, img.alt_text
       FROM album_items a
       JOIN images img ON a.image_id = img.id
       WHERE a.is_visible = 1
       ORDER BY a.sort_order ASC, a.id ASC`
    ).all();

    const albumList = (albumQuery.results || []).map((row) => ({
      id: row.id,
      url: `/api/images/${row.storage_key}`,
      alt_text: row.alt_text || row.caption || "",
      caption: row.caption || "",
      sort_order: row.sort_order
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        cover_photo: slotsMap["cover_photo"] || null,
        venue_photo: slotsMap["venue_photo"] || null,
        album: albumList
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Không thể tải danh sách hình ảnh thiệp cưới." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
