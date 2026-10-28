// Endpoint: /api/admin/stats
import { jsonResponse } from "./_auth.js";

export async function onRequestGet(context) {
  try {
    const { env } = context;

    if (!env.DB) {
      return jsonResponse({ error: "Cơ sở dữ liệu chưa sẵn sàng." }, 500);
    }

    // Run parallel aggregation queries on D1
    const [
      rsvpTotal,
      rsvpAttending,
      rsvpDeclined,
      guestCount,
      wishesTotal,
      wishesPending,
      wishesApproved,
      wishesHidden,
      imagesTotal,
      albumTotal
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM rsvps").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rsvps WHERE status = 'attending'").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rsvps WHERE status = 'declined'").first(),
      env.DB.prepare("SELECT COALESCE(SUM(party_size), 0) AS count FROM rsvps WHERE status = 'attending'").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM wishes").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM wishes WHERE status = 'pending'").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM wishes WHERE status = 'approved'").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM wishes WHERE status = 'hidden'").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM images").first(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM album_items WHERE is_visible = 1").first()
    ]);

    return jsonResponse({
      success: true,
      stats: {
        rsvp: {
          total: rsvpTotal?.count || 0,
          attending: rsvpAttending?.count || 0,
          declined: rsvpDeclined?.count || 0,
          total_guests: guestCount?.count || 0
        },
        wishes: {
          total: wishesTotal?.count || 0,
          pending: wishesPending?.count || 0,
          approved: wishesApproved?.count || 0,
          hidden: wishesHidden?.count || 0
        },
        media: {
          total_images: imagesTotal?.count || 0,
          album_count: albumTotal?.count || 0
        }
      }
    });
  } catch (error) {
    return jsonResponse({ error: "Không thể lấy số liệu thống kê." }, 500);
  }
}
