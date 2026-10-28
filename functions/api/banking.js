// Endpoint: /api/banking
// Public endpoint providing active wedding congratulatory bank accounts & VietQR

import { generateVietQrUrl } from "./_banking_utils.js";

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Cơ sở dữ liệu chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const rows = await env.DB.prepare(
      "SELECT * FROM bank_accounts WHERE enabled = 1"
    ).all();

    const result = {
      groom: null,
      bride: null
    };

    if (rows.results && rows.results.length > 0) {
      for (const row of rows.results) {
        if (!row.bank_bin || !row.account_number) continue;

        const qrUrl = generateVietQrUrl({
          bankBin: row.bank_bin,
          accountNumber: row.account_number,
          accountHolder: row.account_holder,
          transferNote: row.transfer_note || "Mung cuoi",
          template: "compact2"
        });

        const accData = {
          role: row.role,
          bank_bin: row.bank_bin,
          bank_name: row.bank_name,
          bank_short_name: row.bank_short_name,
          account_number: row.account_number,
          account_holder: row.account_holder,
          transfer_note: row.transfer_note,
          qr_url: qrUrl
        };

        if (row.role === "groom") result.groom = accData;
        if (row.role === "bride") result.bride = accData;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Không thể tải thông tin mừng cưới." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
