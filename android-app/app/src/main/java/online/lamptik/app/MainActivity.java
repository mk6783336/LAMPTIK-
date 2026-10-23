package online.lamptik.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;

/**
 * LAMP TIK 3.4 — a real native Android application.
 *
 * Launch contract: the icon opens straight into the native Home downloader
 * (paste → resolve → download). Nothing web ever renders here — no WebView, no
 * /app-download, no install instructions. The only web address this app is
 * allowed to open is the clean downloader root, and only from an explicit tap
 * in Settings.
 *
 * Three destinations, all native views: Home (link → resolve → download),
 * Downloads (Android's own DownloadManager as the source of truth) and
 * Settings. There is no WebView anywhere in the app: the website's job is to
 * hand out this APK, not to be embedded inside it.
 *
 * Everything is framework-only (no AndroidX, no Material components), so the
 * release APK is a few megabytes of real code and art instead of a thin
 * wrapper around a browser.
 */
public class MainActivity extends Activity
        implements DownloaderScreen.Host, SettingsScreen.Host {

    private static final int TAB_HOME = 0;
    private static final int TAB_DOWNLOADS = 1;
    private static final int TAB_SETTINGS = 2;
    private static final int REQ_NOTIFICATIONS = 1001;

    /** Guards against the same share or link being handled twice in one second. */
    private static final long DEDUPE_MS = 1_500;

    private FrameLayout content;
    private DownloaderScreen downloader;
    private DownloadsScreen downloads;
    private SettingsScreen settings;
    private LinearLayout[] navSlots;
    private ImageView[] navIcons;
    private TextView[] navLabels;
    private int activeTab = TAB_HOME;
    private String lastHandledUrl;
    private long lastHandledAt;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Ui.BG);
        getWindow().setNavigationBarColor(Ui.BG);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Ui.BG);
        root.setFitsSystemWindows(true);

        root.addView(buildTopBar(), Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, Ui.dp(this, 64f)));

        content = new FrameLayout(this);
        root.addView(content, Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        root.addView(buildBottomNav(), Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, Ui.dp(this, 68f)));

        setContentView(root);

        requestNotificationPermission();
        // A recreated activity still holds the intent that started it; routing
        // it again would re-resolve (and re-download) the same link.
        if (savedInstanceState == null) routeIntent(getIntent());
        else showTab(activeTab);
    }

    /* -------------------------------------------------------------- chrome */

    private View buildTopBar() {
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        int pad = Ui.dp(this, 16f);
        bar.setPadding(pad, Ui.dp(this, 10f), pad, Ui.dp(this, 10f));
        bar.setBackgroundColor(Ui.BG);

        // Brand tile: gradient square + bolt, drawn natively.
        FrameLayout tile = new FrameLayout(this);
        GradientDrawable tileBg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{0xFF22D3EE, 0xFF2F6BFF, 0xFF4F46E5});
        tileBg.setCornerRadius(Ui.dp(this, 12f));
        tile.setBackground(tileBg);
        ImageView bolt = new ImageView(this);
        bolt.setImageResource(R.drawable.ic_bolt);
        bolt.setColorFilter(Color.WHITE);
        FrameLayout.LayoutParams boltLp = new FrameLayout.LayoutParams(
                Ui.dp(this, 20f), Ui.dp(this, 20f), Gravity.CENTER);
        tile.addView(bolt, boltLp);
        bar.addView(tile, Ui.lp(Ui.dp(this, 40f), Ui.dp(this, 40f)));

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams titlesLp = Ui.lp(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        titlesLp.leftMargin = Ui.dp(this, 10f);
        bar.addView(titles, titlesLp);

        titles.addView(Ui.text(this, "LAMP TIK", 17f, Ui.TEXT, Ui.W_BOLD));
        titles.addView(Ui.text(this, getString(R.string.app_tagline), 11f, Ui.TEXT_3, Ui.W_REGULAR));

        bar.addView(Ui.pill(this, getString(R.string.version_badge), Ui.ACCENT_INK));
        bar.addView(quickAction(R.drawable.ic_paste, R.string.paste_clipboard, new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTab(TAB_HOME);
                downloader.pasteFromClipboard();
            }
        }));
        bar.addView(quickAction(R.drawable.ic_settings, R.string.tab_settings, new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTab(TAB_SETTINGS);
            }
        }));

        View hairline = new View(this);
        hairline.setBackgroundColor(Ui.LINE);
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        wrapper.addView(bar, Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        wrapper.addView(hairline, Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, Math.max(1, Ui.dp(this, 1f))));
        return wrapper;
    }

    /** 40dp square icon action — the smallest comfortable touch target here. */
    private View quickAction(int iconRes, int labelRes, View.OnClickListener click) {
        FrameLayout box = new FrameLayout(this);
        box.setBackground(Ui.ripple(Ui.roundStroke(this, Ui.SURFACE_2, 12f, Ui.LINE_STRONG), 0x22FFFFFF));
        box.setContentDescription(getString(labelRes));
        box.setClickable(true);
        box.setFocusable(true);
        box.setOnClickListener(click);
        ImageView icon = Ui.icon(this, iconRes, Ui.TEXT, 18f);
        box.addView(icon, new FrameLayout.LayoutParams(Ui.dp(this, 18f), Ui.dp(this, 18f), Gravity.CENTER));
        LinearLayout.LayoutParams lp = Ui.lp(Ui.dp(this, 40f), Ui.dp(this, 40f));
        lp.leftMargin = Ui.dp(this, 8f);
        box.setLayoutParams(lp);
        return box;
    }

    private View buildBottomNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(Ui.SURFACE);
        int pad = Ui.dp(this, 8f);
        nav.setPadding(pad, Ui.dp(this, 8f), pad, Ui.dp(this, 8f));

        int[] icons = {R.drawable.ic_download, R.drawable.ic_library, R.drawable.ic_settings};
        String[] labels = {
                getString(R.string.tab_home),
                getString(R.string.tab_downloads),
                getString(R.string.tab_settings)
        };

        navSlots = new LinearLayout[3];
        navIcons = new ImageView[3];
        navLabels = new TextView[3];

        for (int i = 0; i < 3; i++) {
            final int index = i;
            LinearLayout slot = new LinearLayout(this);
            slot.setOrientation(LinearLayout.VERTICAL);
            slot.setGravity(Gravity.CENTER);
            slot.setClickable(true);
            slot.setFocusable(true);
            slot.setContentDescription(labels[i]);
            LinearLayout.LayoutParams slotLp = Ui.lp(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
            if (i > 0) slotLp.leftMargin = Ui.dp(this, 6f);
            nav.addView(slot, slotLp);

            ImageView icon = Ui.icon(this, icons[i], Ui.TEXT_3, 20f);
            LinearLayout.LayoutParams iconLp = Ui.lp(Ui.dp(this, 20f), Ui.dp(this, 20f));
            iconLp.gravity = Gravity.CENTER_HORIZONTAL;
            slot.addView(icon, iconLp);

            TextView label = Ui.text(this, labels[i], 11f, Ui.TEXT_3, Ui.W_MEDIUM);
            LinearLayout.LayoutParams labelLp = Ui.lp(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            labelLp.topMargin = Ui.dp(this, 3f);
            labelLp.gravity = Gravity.CENTER_HORIZONTAL;
            slot.addView(label, labelLp);

            slot.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showTab(index);
                }
            });

            navSlots[i] = slot;
            navIcons[i] = icon;
            navLabels[i] = label;
        }

        applyNavState();
        return nav;
    }

    private void applyNavState() {
        if (navSlots == null) return;
        for (int i = 0; i < navSlots.length; i++) {
            boolean active = i == activeTab;
            navSlots[i].setBackground(active
                    ? Ui.round(this, 0x1422D3EE, 12f)
                    : Ui.round(this, Color.TRANSPARENT, 12f));
            navIcons[i].setColorFilter(active ? Ui.ACCENT_INK : Ui.TEXT_3);
            navLabels[i].setTextColor(active ? Ui.ACCENT_INK : Ui.TEXT_3);
        }
    }

    /* --------------------------------------------------------------- tabs */

    private void showTab(int index) {
        activeTab = index;
        applyNavState();
        content.removeAllViews();

        View screen;
        if (index == TAB_HOME) {
            if (downloader == null) downloader = new DownloaderScreen(this, this);
            screen = downloader;
        } else if (index == TAB_DOWNLOADS) {
            if (downloads == null) downloads = new DownloadsScreen(this);
            downloads.refresh();
            screen = downloads;
        } else {
            if (settings == null) settings = new SettingsScreen(this, this);
            screen = settings;
        }

        content.addView(screen, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

    }

    /* ------------------------------------------------------------- intents */

    private void routeIntent(Intent intent) {
        if (intent == null) {
            showTab(TAB_HOME);
            return;
        }

        String action = intent.getAction();

        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            String shared = sharedText(intent);
            if (shared == null) {
                showTab(TAB_HOME);
                toast("That share contained no link.");
                return;
            }
            showTab(TAB_HOME);
            if (isDuplicate(shared)) return;
            downloader.submitShared(shared);
            return;
        }

        // A VIEW intent can only arrive from an explicit caller (the manifest
        // claims no web links at all). Even then the app must never navigate
        // into install pages: an /app-download target is ignored outright, and
        // anything without a real shared video link simply lands on Home.
        Uri data = intent.getData();
        if (data != null) {
            String path = data.getPath() == null ? "" : data.getPath();
            if (path.startsWith("/app-download")) {
                showTab(TAB_HOME);
                return;
            }
            String host = data.getHost() == null ? "" : data.getHost().toLowerCase();
            if (host.equals("lamptik.online") || host.endsWith(".lamptik.online")) {
                String shared = data.getQueryParameter("shared_url");
                String url = data.getQueryParameter("url");
                showTab(TAB_HOME);
                String candidate = shared != null ? shared : url;
                if (candidate != null && !isDuplicate(candidate)) downloader.submitShared(candidate);
                return;
            }
        }

        showTab(TAB_HOME);
    }

    /** First usable text from a SEND or SEND_MULTIPLE intent. */
    private String sharedText(Intent intent) {
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        if (text != null && text.length() > 0) return text.toString().trim();

        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (subject != null && subject.trim().length() > 0) return subject.trim();

        ArrayList<CharSequence> many =
                intent.getCharSequenceArrayListExtra(Intent.EXTRA_TEXT);
        if (many != null) {
            for (CharSequence candidate : many) {
                if (candidate != null && candidate.length() > 0) return candidate.toString().trim();
            }
        }
        return null;
    }

    /**
     * A share can reach the same activity twice (share sheet + notification
     * tap). Same link inside the window means the first one already won.
     */
    private boolean isDuplicate(String url) {
        long now = System.currentTimeMillis();
        if (url.equals(lastHandledUrl) && now - lastHandledAt < DEDUPE_MS) return true;
        lastHandledUrl = url;
        lastHandledAt = now;
        return false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (activeTab != TAB_HOME) showTab(TAB_HOME);
        routeIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (activeTab == TAB_DOWNLOADS && downloads != null) downloads.refresh();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putInt("tab", activeTab);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        activeTab = savedInstanceState.getInt("tab", TAB_HOME);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    /* ---------------------------------------------------------------- host */

    @Override
    public void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onDownloadQueued() {
        if (downloads != null) downloads.refresh();
    }

    @Override
    public void openDownloads() {
        showTab(TAB_DOWNLOADS);
    }

    @Override
    public void onHistoryCleared() {
        if (downloads != null) downloads.refresh();
    }
}
