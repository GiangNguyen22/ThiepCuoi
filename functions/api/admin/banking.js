// Endpoint: /api/admin/banking
// Protected admin endpoint for managing wedding gift banking accounts & VietQR configurations

import { jsonResponse } from "./_auth.js";
import {
  VIETNAM_BANKS,
  removeVietnameseTones,
  isValidAccountNumber,
  generateVietQrUrl
} from "../_banking_utils.js";

// GET /api/admin/banking
export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    const { results } = await env.DB.prepare(
      `SELECT role, enabled, bank_bin, bank_name, bank_short_name, 
              account_number, account_holder, transfer_note, updated_at
       FROM bank_accounts
       ORDER BY role ASC`
    ).all();

    const accounts = (results || []).map(row => {
      const isEnabled = Number(row.enabled) === 1;
      const qrUrl = isEnabled && row.bank_bin && row.account_number
        ? generateVietQrUrl({
            bankBin: row.bank_bin,
            accountNumber: row.account_number,
            accountHolder: row.account_holder,
            transferNote: row.transfer_note
          })
        : null;

      return {
        role: row.role,
        enabled: isEnabled,
        bank_bin: row.bank_bin || "",
        bank_name: row.bank_name || "",
        bank_short_name: row.bank_short_name || "",
        account_number: row.account_number || "",
        account_holder: row.account_holder || "",
        transfer_note: row.transfer_note || "",
        qr_url: qrUrl,
        updated_at: row.updated_at
      };
    });

    return jsonResponse({
      success: true,
      data: {
        accounts,
        supported_banks: VIETNAM_BANKS
      }
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lấy danh sách tài khoản ngân hàng." }, 500);
  }
}

// PUT /api/admin/banking
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

    // Security check: reject prohibited sensitive fields
    const sensitiveKeys = ["pin", "password", "cvv", "otp", "card_number", "card_exp", "token"];
    for (const key of sensitiveKeys) {
      if (key in body || (body.accounts && body.accounts.some(acc => key in acc))) {
        return jsonResponse({
          error: "Yêu cầu chứa trường thông tin nhạy cảm không được phép (PIN, Password, CVV...)."
        }, 400);
      }
    }

    // Support both single account update and batch array of accounts
    const accountList = Array.isArray(body.accounts) ? body.accounts : [body];

    if (!accountList.length) {
      return jsonResponse({ error: "Không có thông tin tài khoản nào để cập nhật." }, 400);
    }

    for (const acc of accountList) {
      const role = acc.role;
      if (role !== "groom" && role !== "bride") {
        return jsonResponse({ error: "Vai trò tài khoản phải là 'groom' (chú rể) hoặc 'bride' (cô dâu)." }, 400);
      }

      const enabled = acc.enabled === true || acc.enabled === 1 || acc.enabled === "1" ? 1 : 0;
      let bank_bin = (acc.bank_bin || "").trim();
      let bank_name = (acc.bank_name || "").trim().slice(0, 100);
      let bank_short_name = (acc.bank_short_name || "").trim().slice(0, 20);
      let account_number = (acc.account_number || "").trim().slice(0, 30);
      let account_holder = removeVietnameseTones(acc.account_holder || "").slice(0, 60);
      let transfer_note = removeVietnameseTones(acc.transfer_note || "Mung cuoi").slice(0, 50);

      // Match bank metadata from supported list if bin matches
      const matchedBank = VIETNAM_BANKS.find(b => b.bin === bank_bin);
      if (matchedBank) {
        bank_name = matchedBank.name;
        bank_short_name = matchedBank.shortName;
      }

      // If enabled, strict validation on bank and account number
      if (enabled === 1) {
        if (!bank_bin || !/^[0-9]{6}$/.test(bank_bin)) {
          return jsonResponse({ error: `Ngân hàng cho ${role === "groom" ? "Chú Rể" : "Cô Dâu"} không hợp lệ (mã BIN phải có 6 chữ số).` }, 400);
        }
        if (!isValidAccountNumber(account_number)) {
          return jsonResponse({ error: `Số tài khoản cho ${role === "groom" ? "Chú Rể" : "Cô Dâu"} không hợp lệ (từ 6-25 ký tự chữ và số).` }, 400);
        }
        if (!account_holder || account_holder.length < 2) {
          return jsonResponse({ error: `Tên chủ tài khoản cho ${role === "groom" ? "Chú Rể" : "Cô Dâu"} không được để trống.` }, 400);
        }
      }

      // Upsert into bank_accounts table
      await env.DB.prepare(
        `INSERT INTO bank_accounts (role, enabled, bank_bin, bank_name, bank_short_name, account_number, account_holder, transfer_note, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(role) DO UPDATE SET
           enabled = excluded.enabled,
           bank_bin = excluded.bank_bin,
           bank_name = excluded.bank_name,
           bank_short_name = excluded.bank_short_name,
           account_number = excluded.account_number,
           account_holder = excluded.account_holder,
           transfer_note = excluded.transfer_note,
           updated_at = datetime('now')`
      ).bind(role, enabled, bank_bin, bank_name, bank_short_name, account_number, account_holder, transfer_note).run();
    }

    return jsonResponse({
      success: true,
      message: "Cập nhật thông tin nhận mừng cưới thành công."
    });
  } catch (err) {
    return jsonResponse({ error: "Không thể lưu thông tin nhận mừng cưới." }, 500);
  }
}
