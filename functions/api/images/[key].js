// Endpoint: /api/images/:key
// Public streaming endpoint for user uploaded images stored in Cloudflare R2

const SAFE_KEY_REGEX = /^img_[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;

export async function onRequestGet(context) {
  try {
    const { params, env, request } = context;
    const key = params.key;

    // Strict validation of storage key to prevent path traversal or invalid keys
    if (!key || !SAFE_KEY_REGEX.test(key) || key.includes("..") || key.includes("/") || key.includes("\\")) {
      return new Response(JSON.stringify({ error: "Khóa hình ảnh không hợp lệ." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    if (!env.MEDIA_BUCKET) {
      return new Response(JSON.stringify({ error: "Storage hình ảnh chưa sẵn sàng." }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) {
      return new Response(JSON.stringify({ error: "Không tìm thấy hình ảnh." }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }

    // Check ETag for caching
    const etag = object.httpEtag || `"${key}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch.includes(etag))) {
      return new Response(null, { status: 304 });
    }

    const contentType = object.httpMetadata?.contentType || "image/jpeg";

    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "ETag": etag,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Không thể tải hình ảnh." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}
