package online.lamptik.app;

import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * Screen C — Settings.
 *
 * Four short sections and nothing else: two real preferences, the legal links
 * the site already publishes, one destructive action behind a confirmation,
 * and the version actually installed on this device. No dashboards.
 */
final class SettingsScreen extends ScrollView {

    interface Host {
        void toast(String message);

        void onHistoryCleared();
    }

    private final Context context;
    private final Host host;

    SettingsScreen(Context context, Host host) {
        super(context);
        this.context = context;
        this.host = host;

        setFillViewport(true);
        setBackgroundColor(Ui.BG);
        setVerticalScrollBarEnabled(false);

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Ui.dp(context, 16f);
        root.setPadding(pad, Ui.dp(context, 12f), pad, Ui.dp(context, 28f));
        addView(root, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        TextView title = Ui.text(context, context.getString(R.string.tab_settings), 24f, Ui.TEXT, Ui.W_DISPLAY);
        root.addView(title);
        TextView sub = Ui.text(context,
                "Preferences, support and app information", 12f, Ui.TEXT_2, Ui.W_REGULAR);
        LinearLayout.LayoutParams subLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        subLp.topMargin = Ui.dp(context, 2f);
        root.addView(sub, subLp);

        /* ------------------------------------------------------- downloading */
        root.addView(section(context.getString(R.string.settings_downloading)));

        LinearLayout downloadCard = Ui.card(context);
        root.addView(downloadCard, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        final Switch wifi = buildSwitch(Prefs.wifiOnly(context));
        downloadCard.addView(row(
                context.getString(R.string.settings_wifi_only),
                context.getString(R.string.settings_wifi_only_body),
                wifi,
                new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        wifi.toggle();
                    }
                }));
        wifi.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(android.widget.CompoundButton buttonView, boolean isChecked) {
                Prefs.setWifiOnly(context, isChecked);
            }
        });

        downloadCard.addView(Ui.divider(context));

        final Switch autoFetch = buildSwitch(Prefs.autoFetch(context));
        downloadCard.addView(row(
                context.getString(R.string.settings_auto_fetch),
                context.getString(R.string.settings_auto_fetch_body),
                autoFetch,
                new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        autoFetch.toggle();
                    }
                }));
        autoFetch.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(android.widget.CompoundButton buttonView, boolean isChecked) {
                Prefs.setAutoFetch(context, isChecked);
            }
        });

        /* -------------------------------------------------- support & legal */
        root.addView(section(context.getString(R.string.settings_support)));

        LinearLayout legal = Ui.card(context);
        root.addView(legal, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        legal.addView(link(R.string.settings_privacy, ApiClient.BASE + "/privacy"));
        legal.addView(Ui.divider(context));
        legal.addView(link(R.string.settings_terms, ApiClient.BASE + "/terms"));
        legal.addView(Ui.divider(context));
        legal.addView(link(R.string.settings_contact, ApiClient.BASE + "/contact"));
        legal.addView(Ui.divider(context));
        // Clean downloader root only — never /app-download: the visitor is
        // already inside the app, so install instructions would be nonsense.
        legal.addView(link(R.string.settings_website, ApiClient.SITE_ROOT));

        /* ---------------------------------------------------------- storage */
        root.addView(section(context.getString(R.string.settings_storage)));

        LinearLayout storage = Ui.card(context);
        root.addView(storage, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        storage.addView(row(
                context.getString(R.string.settings_clear_history),
                context.getString(R.string.settings_clear_history_body),
                chevron(),
                new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        confirmClearHistory();
                    }
                }));

        /* ------------------------------------------------------------ about */
        root.addView(section(context.getString(R.string.settings_about)));

        LinearLayout about = Ui.card(context);
        root.addView(about, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        about.addView(row(
                context.getString(R.string.settings_version),
                context.getString(R.string.settings_native),
                valueLabel("v" + versionName()),
                null));
        about.addView(Ui.divider(context));
        about.addView(row(
                context.getString(R.string.settings_licences),
                "Inter typeface · Android platform",
                chevron(),
                new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showLicences();
                    }
                }));
    }

    /* --------------------------------------------------------------- rows */

    private TextView section(String label) {
        TextView header = Ui.text(context, label.toUpperCase(), 11f, Ui.TEXT_3, Ui.W_SEMIBOLD);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 20f);
        lp.bottomMargin = Ui.dp(context, 8f);
        lp.leftMargin = Ui.dp(context, 4f);
        header.setLayoutParams(lp);
        return header;
    }

    private LinearLayout row(CharSequence title, CharSequence body, View trailing, OnClickListener click) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int pv = Ui.dp(context, 12f);
        row.setPadding(0, pv, 0, pv);

        LinearLayout copy = new LinearLayout(context);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.addView(Ui.text(context, title, 14f, Ui.TEXT, Ui.W_MEDIUM));
        if (body != null && body.length() > 0) {
            TextView detail = Ui.text(context, body, 12f, Ui.TEXT_3, Ui.W_REGULAR);
            LinearLayout.LayoutParams detailLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            detailLp.topMargin = Ui.dp(context, 2f);
            copy.addView(detail, detailLp);
        }
        row.addView(copy, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));

        if (trailing != null) {
            LinearLayout.LayoutParams trailLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            trailLp.leftMargin = Ui.dp(context, 12f);
            row.addView(trailing, trailLp);
        }

        if (click != null) {
            row.setClickable(true);
            row.setFocusable(true);
            row.setOnClickListener(click);
        }
        return row;
    }

    private LinearLayout link(int labelRes, final String url) {
        return row(context.getString(labelRes), null, chevron(), new OnClickListener() {
            @Override
            public void onClick(View v) {
                open(url);
            }
        });
    }

    private Switch buildSwitch(boolean checked) {
        Switch toggle = new Switch(context);
        toggle.setChecked(checked);
        toggle.setContentDescription(context.getString(R.string.settings_downloading));
        return toggle;
    }

    private TextView chevron() {
        return Ui.text(context, "›", 20f, Ui.TEXT_3, Ui.W_REGULAR);
    }

    private TextView valueLabel(String value) {
        return Ui.text(context, value, 13f, Ui.TEXT_2, Ui.W_MEDIUM);
    }

    /* ------------------------------------------------------------ actions */

    private void open(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception error) {
            host.toast("No app can open this link on your device.");
        }
    }

    /** Destructive, so it asks first and says exactly what will be removed. */
    private void confirmClearHistory() {
        final long[] ids = downloadIds();
        if (ids.length == 0) {
            host.toast("There is no download history to clear.");
            return;
        }
        new AlertDialog.Builder(context)
                .setTitle(context.getString(R.string.settings_clear_history))
                .setMessage("This deletes " + ids.length + " downloaded file"
                        + (ids.length == 1 ? "" : "s") + " and their history entries from this device. "
                        + "Files already shared elsewhere are not affected.")
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.delete, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        DownloadManager manager =
                                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                        if (manager == null) {
                            host.toast("Android's download manager is unavailable.");
                            return;
                        }
                        int removed = 0;
                        for (long id : ids) {
                            try {
                                removed += manager.remove(id);
                            } catch (Exception ignored) {
                                // A record Android already dropped: nothing to do.
                            }
                        }
                        host.toast(removed + " download" + (removed == 1 ? "" : "s") + " removed.");
                        host.onHistoryCleared();
                    }
                })
                .show();
    }

    private long[] downloadIds() {
        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return new long[0];
        List<Long> ids = new ArrayList<>();
        android.database.Cursor cursor = null;
        try {
            cursor = manager.query(new DownloadManager.Query());
            if (cursor != null) {
                int idColumn = cursor.getColumnIndex(DownloadManager.COLUMN_ID);
                while (cursor.moveToNext()) ids.add(cursor.getLong(idColumn));
            }
        } catch (Exception ignored) {
            return new long[0];
        } finally {
            if (cursor != null) cursor.close();
        }
        long[] result = new long[ids.size()];
        for (int i = 0; i < ids.size(); i++) result[i] = ids.get(i);
        return result;
    }

    private void showLicences() {
        new AlertDialog.Builder(context)
                .setTitle(context.getString(R.string.settings_licences))
                .setMessage("Inter typeface — SIL Open Font License 1.1.\n\n"
                        + "Android platform APIs — Apache License 2.0.\n\n"
                        + "LAMP TIK ships no third-party Android libraries: every screen, "
                        + "icon and component in this app is built on the framework itself.")
                .setPositiveButton("Close", null)
                .show();
    }

    /** The version actually installed, read from the package, never hardcoded. */
    private String versionName() {
        try {
            PackageInfo info = context.getPackageManager()
                    .getPackageInfo(context.getPackageName(), 0);
            return info.versionName == null ? "3.3" : info.versionName;
        } catch (Exception ignored) {
            return "3.3";
        }
    }
}
