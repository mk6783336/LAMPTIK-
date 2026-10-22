package online.lamptik.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Thin HTTP client for the LAMP TIK resolver API.
 *
 * Deliberately dependency-free (HttpURLConnection + org.json, both in the
 * platform): the release APK ships no networking library at all.
 */
final class ApiClient {

    static final String BASE = "https://www.lamptik.online";
    /** Lets the server recognise the native client for logs and support. */
    static final String USER_AGENT = "LampTikAndroidApp/3.0 (Android; native)";

    private static final int CONNECT_TIMEOUT_MS = 12_000;
    private static final int READ_TIMEOUT_MS = 30_000;

    private ApiClient() {
    }

    /** Resolve a pasted link. Throws with a user-readable message on failure. */
    static MediaItem resolve(String rawUrl) throws IOException {
        String endpoint = isYouTube(rawUrl) ? "/api/youtube" : "/api/fetch";
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(BASE + endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", USER_AGENT);

            JSONObject body = new JSONObject();
            body.put("url", rawUrl);

            try (OutputStream out = connection.getOutputStream()) {
                out.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = connection.getResponseCode();
            String payload = readAll(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
            JSONObject json = payload.isEmpty() ? new JSONObject() : new JSONObject(payload);

            if (status >= 400 || !json.optBoolean("ok", false)) {
                throw new IOException(messageFrom(json, status));
            }

            MediaItem item = MediaItem.fromResponse(json);
            if (item == null) throw new IOException("That link did not resolve to a video.");
            return item;
        } catch (org.json.JSONException error) {
            throw new IOException("The server sent an unreadable response.", error);
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String messageFrom(JSONObject json, int status) {
        JSONObject error = json.optJSONObject("error");
        if (error != null) {
            String message = error.optString("message", "");
            if (!message.isEmpty()) return message;
        }
        if (status == 429) return "Too many requests — wait a moment and try again.";
        if (status >= 500) return "The resolver is busy. Try again in a few seconds.";
        return "Could not resolve this link.";
    }

    private static boolean isYouTube(String url) {
        String lower = url.toLowerCase();
        return lower.contains("youtube.com") || lower.contains("youtu.be") || lower.contains("/shorts/");
    }

    /** Fetch a thumbnail with a hard size cap so one bad image can't OOM us. */
    static Bitmap thumbnail(String url, int maxWidthPx) {
        if (url == null || url.isEmpty()) return null;
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(8_000);
            connection.setReadTimeout(8_000);
            connection.setRequestProperty("User-Agent", USER_AGENT);
            try (InputStream in = connection.getInputStream()) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[16 * 1024];
                int read;
                long total = 0;
                while ((read = in.read(chunk)) > 0) {
                    total += read;
                    if (total > 6L * 1024 * 1024) break;
                    buffer.write(chunk, 0, read);
                }
                byte[] bytes = buffer.toByteArray();
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
                int sample = 1;
                while (bounds.outWidth / sample > maxWidthPx * 2) sample *= 2;
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = sample;
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
            }
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String readAll(InputStream stream) throws IOException {
        if (stream == null) return "";
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }
}
