// Endpoint: /api/content
// Public endpoint serving active wedding invitation text content

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cơ sở dữ liệu chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const row = await env.DB.prepare(
      "SELECT * FROM wedding_details WHERE id = 1"
    ).first();

    if (!row) {
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    let schedule = [];
    try {
      schedule = JSON.parse(row.schedule_json);
    } catch {
      schedule = [];
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        groom_name: row.groom_name,
        bride_name: row.bride_name,
        event_date_text: row.event_date_text,
        lunar_date_text: row.lunar_date_text,
        event_date_iso: row.event_date_iso,
        invitation_title: row.invitation_title,
        invitation_copy: row.invitation_copy,
        venue_name: row.venue_name,
        venue_address: row.venue_address,
        venue_note: row.venue_note,
        map_url: row.map_url,
        schedule,
        closing_heading: row.closing_heading,
        closing_names: row.closing_names,
        closing_date: row.closing_date,
        updated_at: row.updated_at
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Không thể tải nội dung thiệp cưới." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
