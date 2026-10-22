package online.lamptik.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * The app's entire preference store: two booleans behind SharedPreferences.
 *
 * Deliberately tiny — a downloader does not need a settings dashboard. Both
 * defaults are the permissive, least-surprising choice: downloads may use
 * mobile data (Android normally prompts) and a shared link starts resolving
 * immediately, which is what "Share → LAMP TIK" is for.
 */
final class Prefs {

    private static final String FILE = "lamptik_prefs";
    private static final String KEY_WIFI_ONLY = "wifi_only";
    private static final String KEY_AUTO_FETCH = "auto_fetch";

    private Prefs() {
    }

    private static SharedPreferences store(Context context) {
        return context.getApplicationContext()
                .getSharedPreferences(FILE, Context.MODE_PRIVATE);
    }

    /** True when the user asked to keep the downloader off mobile data. */
    static boolean wifiOnly(Context context) {
        return store(context).getBoolean(KEY_WIFI_ONLY, false);
    }

    static void setWifiOnly(Context context, boolean value) {
        store(context).edit().putBoolean(KEY_WIFI_ONLY, value).apply();
    }

    /** True when a URL arriving from the share sheet should resolve at once. */
    static boolean autoFetch(Context context) {
        return store(context).getBoolean(KEY_AUTO_FETCH, true);
    }

    static void setAutoFetch(Context context, boolean value) {
        store(context).edit().putBoolean(KEY_AUTO_FETCH, value).apply();
    }
}
