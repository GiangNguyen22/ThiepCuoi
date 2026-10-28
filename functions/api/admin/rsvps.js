// Endpoint: /api/admin/rsvps
import { jsonResponse } from "./_auth.js";

export async function onRequestGet(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    const url = new URL(request.url);
    const statusParam = (url.searchParams.get("status") || "all").toLowerCase();
    const searchParam = (url.searchParams.get("search") || "").trim();
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = parseInt(url.searchParams.get("limit") || "15", 10);

    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = !isNaN(limitParam) && limitParam > 0 && limitParam <= 50 ? limitParam : 15;
    const offset = (page - 1) * limit;

    const validStatuses = ["all", "attending", "declined"];
    const status = validStatuses.includes(statusParam) ? statusParam : "all";

    let whereClauses = [];
    let bindings = [];

    if (status !== "all") {
      whereClauses.push("status = ?");
      bindings.push(status);
    }

    if (searchParam) {
      whereClauses.push("guest_name LIKE ?");
      bindings.push(`%${searchParam}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM rsvps ${whereSql}`;
    const countStmt = env.DB.prepare(countSql);
    const countResult = await (bindings.length > 0 ? countStmt.bind(...bindings).first() : countStmt.first());
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Data query
    const dataSql = `SELECT id, guest_name, status, party_size, created_at FROM rsvps ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`;
    const dataBindings = [...bindings, limit, offset];
    const dataResult = await env.DB.prepare(dataSql).bind(...dataBindings).all();

    return jsonResponse({
      success: true,
      data: dataResult.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    return jsonResponse({ error: "Không thể lấy danh sách RSVP." }, 500);
  }
}
