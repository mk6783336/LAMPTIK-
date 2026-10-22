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

/**
 * LAMP TIK 3.2 — a real native Android application.
 *
 * Structure: native top app bar, a native content frame, and a three-tab
 * native bottom navigation (Downloader · My Downloads · Fast Stream). The
 * downloader and the library are plain Android views talking to the resolver
 * API; only the optional "Fast Stream" helper embeds a WebView.
 *
 * Everything is framework-only (no AndroidX, no Material components), which is
 * why the release APK is a few megabytes of real assets instead of a 29 KB
 * wrapper around the website.
 */
public class MainActivity extends Activity implements DownloaderScreen.Host {

    private static final int TAB_DOWNLOADER = 0;
    private static final int TAB_DOWNLOADS = 1;
    private static final int TAB_STREAM = 2;
    private static final int REQ_NOTIFICATIONS = 1001;

    private FrameLayout content;
    private DownloaderScreen downloader;
    private DownloadsScreen downloads;
    private StreamScreen stream;
    private LinearLayout[] navSlots;
    private ImageView[] navIcons;
    private TextView[] navLabels;
    private int activeTab = TAB_DOWNLOADER;
    private String pendingSharedUrl;

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
        routeIntent(getIntent());
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

        TextView badge = Ui.pill(this, getString(R.string.version_badge), Ui.ACCENT_INK);
        bar.addView(badge);

        LinearLayout paste = new LinearLayout(this);
        paste.setOrientation(LinearLayout.HORIZONTAL);
        paste.setGravity(Gravity.CENTER);
        paste.setBackground(Ui.ripple(Ui.roundStroke(this, Ui.SURFACE_2, 12f, Ui.LINE_STRONG), 0x22FFFFFF));
        paste.setPadding(Ui.dp(this, 12f), Ui.dp(this, 10f), Ui.dp(this, 12f), Ui.dp(this, 10f));
        paste.setContentDescription(getString(R.string.paste_clipboard));
        paste.addView(Ui.icon(this, R.drawable.ic_paste, Ui.TEXT, 18f));
        LinearLayout.LayoutParams pasteLp = Ui.lp(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        pasteLp.leftMargin = Ui.dp(this, 10f);
        bar.addView(paste, pasteLp);
        paste.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTab(TAB_DOWNLOADER);
                downloader.pasteFromClipboard();
            }
        });

        View hairline = new View(this);
        hairline.setBackgroundColor(Ui.LINE);
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        wrapper.addView(bar, Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        wrapper.addView(hairline, Ui.lp(LinearLayout.LayoutParams.MATCH_PARENT, Math.max(1, Ui.dp(this, 1f))));
        return wrapper;
    }

    private View buildBottomNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setBackgroundColor(Ui.SURFACE);
        int pad = Ui.dp(this, 8f);
        nav.setPadding(pad, Ui.dp(this, 8f), pad, Ui.dp(this, 8f));

        int[] icons = {R.drawable.ic_download, R.drawable.ic_library, R.drawable.ic_bolt};
        String[] labels = {
                getString(R.string.tab_downloader),
                getString(R.string.tab_downloads),
                getString(R.string.tab_stream)
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
        if (index == TAB_DOWNLOADER) {
            if (downloader == null) downloader = new DownloaderScreen(this, this);
            screen = downloader;
        } else if (index == TAB_DOWNLOADS) {
            if (downloads == null) downloads = new DownloadsScreen(this);
            downloads.refresh();
            screen = downloads;
        } else {
            if (stream == null) stream = new StreamScreen(this);
            screen = stream;
        }

        content.addView(screen, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        if (index == TAB_DOWNLOADER && pendingSharedUrl != null) {
            String url = pendingSharedUrl;
            pendingSharedUrl = null;
            downloader.submitShared(url);
        }
    }

    /* ------------------------------------------------------------- intents */

    private void routeIntent(Intent intent) {
        if (intent == null) return;

        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (shared == null) shared = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            showTab(TAB_DOWNLOADER);
            if (shared != null && shared.trim().length() > 0) {
                downloader.submitShared(shared.trim());
            } else {
                toast("Nothing to paste from that share.");
            }
            return;
        }

        Uri data = intent.getData();
        if (data != null) {
            String host = data.getHost() == null ? "" : data.getHost().toLowerCase();
            if (host.equals("lamptik.online") || host.endsWith(".lamptik.online")) {
                String shared = data.getQueryParameter("shared_url");
                String url = data.getQueryParameter("url");
                showTab(TAB_DOWNLOADER);
                if (shared != null) downloader.submitShared(shared);
                else if (url != null) downloader.submitShared(url);
                return;
            }
        }

        showTab(TAB_DOWNLOADER);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        routeIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (activeTab == TAB_DOWNLOADS && downloads != null) downloads.refresh();
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
}
