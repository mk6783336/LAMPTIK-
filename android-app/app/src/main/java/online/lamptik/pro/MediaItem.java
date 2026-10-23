package online.lamptik.pro;

import android.text.TextUtils;

import org.json.JSONObject;

/**
 * One resolved video, exactly as `/api/fetch` (or `/api/youtube`) returns it.
 *
 * `downloads` are same-origin proxy links (`/api/download?…`), which is what
 * DownloadManager enqueues: the proxy strips CDN referer requirements, forces
 * an attachment filename and passes Range requests through, so a paused
 * download resumes instead of restarting.
 */
final class MediaItem {

    final String id;
    final String platform;
    final String title;
    final String author;
    final String thumbnail;
    final int durationSeconds;
    final String hdUrl;
    final String sdUrl;
    final String mp3Url;
    final long hdBytes;
    final long sdBytes;
    final String codec;

    private MediaItem(
            String id,
            String platform,
            String title,
            String author,
            String thumbnail,
            int durationSeconds,
            String hdUrl,
            String sdUrl,
            String mp3Url,
            long hdBytes,
            long sdBytes,
            String codec) {
        this.id = id;
        this.platform = platform;
        this.title = title;
        this.author = author;
        this.thumbnail = thumbnail;
        this.durationSeconds = durationSeconds;
        this.hdUrl = hdUrl;
        this.sdUrl = sdUrl;
        this.mp3Url = mp3Url;
        this.hdBytes = hdBytes;
        this.sdBytes = sdBytes;
        this.codec = codec;
    }

    static MediaItem fromResponse(JSONObject root) {
        JSONObject media = root.optJSONObject("media");
        if (media == null) return null;

        JSONObject downloads = null;
        JSONObject video = root.optJSONObject("video");
        if (video != null) downloads = video.optJSONObject("downloads");

        String hd = firstNonEmpty(
                downloads == null ? null : downloads.optString("video", null),
                absolute(media.optString("videoHd", null)));
        String sd = firstNonEmpty(
                downloads == null ? null : downloads.optString("videoSd", null),
                absolute(media.optString("videoSd", null)));
        String mp3 = firstNonEmpty(
                downloads == null ? null : downloads.optString("audio", null),
                absolute(media.optString("audioMp3", null)));

        return new MediaItem(
                media.optString("id", "video"),
                media.optString("platform", "tiktok"),
                media.optString("title", "Untitled video"),
                media.optString("author", ""),
                absolute(media.optString("thumbnail", null)),
                media.optInt("duration", 0),
                absolute(hd),
                absolute(sd),
                absolute(mp3),
                media.optLong("videoHdBytes", 0L),
                media.optLong("videoSdBytes", 0L),
                media.optString("videoCodec", ""));
    }

    private static String firstNonEmpty(String a, String b) {
        if (!TextUtils.isEmpty(a)) return a;
        return TextUtils.isEmpty(b) ? null : b;
    }

    private static String absolute(String url) {
        if (TextUtils.isEmpty(url)) return null;
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (url.startsWith("/")) return ApiClient.BASE + url;
        return url;
    }

    boolean hasHd() {
        return !TextUtils.isEmpty(hdUrl);
    }

    boolean hasSd() {
        return !TextUtils.isEmpty(sdUrl) && !sdUrl.equals(hdUrl);
    }

    boolean hasMp3() {
        return !TextUtils.isEmpty(mp3Url);
    }

    String badgeLabel() {
        switch (platform) {
            case "youtube":
                return "YouTube";
            case "instagram":
                return "Instagram Reels";
            case "facebook":
                return "Facebook";
            default:
                return "TikTok";
        }
    }

    String safeFileName(String kind) {
        String base = TextUtils.isEmpty(title) ? "lamptik-" + platform : title;
        String cleaned = base.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", " ").trim();
        if (cleaned.length() > 60) cleaned = cleaned.substring(0, 60).trim();
        if (cleaned.isEmpty()) cleaned = "lamptik-" + platform;
        String extension = "audio".equals(kind) ? "mp3" : "mp4";
        return cleaned + " - " + platform + "." + extension;
    }
}
