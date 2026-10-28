// Endpoint: /api/admin/content
// Protected admin endpoint for managing wedding invitation text content

import { jsonResponse } from "./_auth.js";

function sanitizeText(str, maxLength = 255) {
  if (typeof str !== "string") return "";
  // Strip control chars and tags
  return str.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function isValidHttpUrl(string) {
  if (!string) return true; // Optional field
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// GET /api/admin/content
export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    const row = await env.DB.prepare(
      "SELECT * FROM wedding_details WHERE id = 1"
    ).first();

    if (!row) {
      return jsonResponse({ success: true, data: null });
    }

    let schedule = [];
    try {
      schedule = JSON.parse(row.schedule_json);
    } catch {
      schedule = [];
    }

    return jsonResponse({
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
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lấy nội dung thiệp cưới." }, 500);
  }
}

// PUT /api/admin/content
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

    const groom_name = sanitizeText(body.groom_name, 50);
    const bride_name = sanitizeText(body.bride_name, 50);
    if (!groom_name || !bride_name) {
      return jsonResponse({ error: "Tên cô dâu và chú rể không được để trống." }, 400);
    }

    const event_date_text = sanitizeText(body.event_date_text, 100);
    const lunar_date_text = sanitizeText(body.lunar_date_text, 100);
    const event_date_iso = typeof body.event_date_iso === "string" ? body.event_date_iso.trim() : "";

    // Validate event_date_iso
    if (event_date_iso) {
      const parsedDate = new Date(event_date_iso);
      if (isNaN(parsedDate.getTime())) {
        return jsonResponse({ error: "Định dạng ngày ISO đếm ngược không hợp lệ." }, 400);
      }
    }

    const invitation_title = sanitizeText(body.invitation_title, 150);
    const invitation_copy = sanitizeText(body.invitation_copy, 1000);
    const venue_name = sanitizeText(body.venue_name, 100);
    const venue_address = sanitizeText(body.venue_address, 200);
    const venue_note = sanitizeText(body.venue_note, 200);

    const map_url = typeof body.map_url === "string" ? body.map_url.trim() : "";
    if (map_url && !isValidHttpUrl(map_url)) {
      return jsonResponse({ error: "Đường dẫn Google Maps phải bắt đầu bằng http:// hoặc https://" }, 400);
    }

    // Schedule JSON
    let schedule = [];
    if (Array.isArray(body.schedule)) {
      schedule = body.schedule.slice(0, 10).map((item) => ({
        date: sanitizeText(item.date, 30),
        day: sanitizeText(item.day, 50),
        desc: sanitizeText(item.desc, 200)
      }));
    }
    const schedule_json = JSON.stringify(schedule);

    const closing_heading = sanitizeText(body.closing_heading, 100);
    const closing_names = sanitizeText(body.closing_names, 100);
    const closing_date = sanitizeText(body.closing_date, 100);
    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO wedding_details (
        id, groom_name, bride_name, event_date_text, lunar_date_text, event_date_iso,
        invitation_title, invitation_copy, venue_name, venue_address, venue_note,
        map_url, schedule_json, closing_heading, closing_names, closing_date, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      ) ON CONFLICT(id) DO UPDATE SET
        groom_name = excluded.groom_name,
        bride_name = excluded.bride_name,
        event_date_text = excluded.event_date_text,
        lunar_date_text = excluded.lunar_date_text,
        event_date_iso = excluded.event_date_iso,
        invitation_title = excluded.invitation_title,
        invitation_copy = excluded.invitation_copy,
        venue_name = excluded.venue_name,
        venue_address = excluded.venue_address,
        venue_note = excluded.venue_note,
        map_url = excluded.map_url,
        schedule_json = excluded.schedule_json,
        closing_heading = excluded.closing_heading,
        closing_names = excluded.closing_names,
        closing_date = excluded.closing_date,
        updated_at = excluded.updated_at
    `).bind(
      groom_name, bride_name, event_date_text, lunar_date_text, event_date_iso,
      invitation_title, invitation_copy, venue_name, venue_address, venue_note,
      map_url, schedule_json, closing_heading, closing_names, closing_date, nowIso
    ).run();

    return jsonResponse({
      success: true,
      message: "Đã lưu nội dung thiệp cưới thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể cập nhật nội dung thiệp cưới." }, 500);
  }
}
