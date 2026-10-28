// Endpoint: /api/admin/images/upload
import { jsonResponse } from "../_auth.js";
import { MAX_FILE_SIZE, MAX_FILES_PER_REQUEST, detectRasterImageType, sanitizeFilename } from "../_image_utils.js";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    if (!env.MEDIA_BUCKET) {
      return jsonResponse({ error: "Storage hình ảnh chưa sẵn sàng." }, 500);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonResponse({ error: "Dữ liệu upload không hợp lệ." }, 400);
    }

    // Collect all uploaded files (handles both field name 'files' or 'file')
    let fileEntries = formData.getAll("files");
    if (fileEntries.length === 0) {
      const single = formData.get("file");
      if (single) fileEntries = [single];
    }

    // Filter out empty entries
    const files = fileEntries.filter(f => f && typeof f.arrayBuffer === "function" && f.size > 0);

    if (files.length === 0) {
      return jsonResponse({ error: "Vui lòng chọn ít nhất một file ảnh để tải lên." }, 400);
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return jsonResponse({
        error: `Chỉ được tải lên tối đa ${MAX_FILES_PER_REQUEST} ảnh trong một lần gửi.`
      }, 400);
    }

    const uploadedRecords = [];
    const nowIso = new Date().toISOString();

    for (const file of files) {
      // 1. Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return jsonResponse({
          error: `File "${file.name}" có dung lượng ${(file.size / (1024 * 1024)).toFixed(2)}MB, vượt quá giới hạn 5MB.`
        }, 413);
      }

      // 2. Read binary and validate magic bytes
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const detected = detectRasterImageType(bytes);

      if (!detected) {
        return jsonResponse({
          error: `File "${file.name}" không phải định dạng ảnh hợp lệ. Chỉ chấp nhận các định dạng ảnh raster: JPEG, PNG và WebP.`
        }, 400);
      }

      // 3. Generate safe unique storage key
      const randomUuid = crypto.randomUUID().replace(/-/g, "");
      const storageKey = `img_${randomUuid}.${detected.ext}`;
      const originalName = sanitizeFilename(file.name);

      // 4. Save to Cloudflare R2
      await env.MEDIA_BUCKET.put(storageKey, arrayBuffer, {
        httpMetadata: {
          contentType: detected.mime
        }
      });

      // 5. Save metadata to D1 Database
      const insertResult = await env.DB.prepare(
        `INSERT INTO images (storage_key, original_name, mime_type, file_size, alt_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(storageKey, originalName, detected.mime, file.size, "", nowIso).run();

      const newId = insertResult.meta?.last_row_id;

      uploadedRecords.push({
        id: newId,
        storage_key: storageKey,
        original_name: originalName,
        mime_type: detected.mime,
        file_size: file.size,
        alt_text: "",
        created_at: nowIso,
        url: `/api/images/${storageKey}`
      });
    }

    return jsonResponse({
      success: true,
      count: uploadedRecords.length,
      data: uploadedRecords,
      message: `Đã tải lên thành công ${uploadedRecords.length} hình ảnh.`
    }, 201);
  } catch (err) {
    return jsonResponse({ error: "Không thể tải ảnh lên do lỗi hệ thống." }, 500);
  }
}
