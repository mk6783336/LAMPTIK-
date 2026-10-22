package online.lamptik.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * "Fast Stream" helper tab: a confined preview browser plus the app's one
 * sponsor slot.
 *
 * This is the only WebView in the product and it is clearly a helper — the
 * downloader and the download library are 100% native. Any navigation that
 * leaves lamptik.online is handed to the system browser instead of being
 * trapped in the app.
 */
final class StreamScreen extends LinearLayout {

    private static final String START_URL = ApiClient.BASE + "/?source=android_apk&app=android_apk";

    private final Context context;
    private final WebView webView;

    StreamScreen(Context context) {
        super(context);
        this.context = context;
        setOrientation(VERTICAL);
        setBackgroundColor(Ui.BG);

        int pad = Ui.dp(context, 16f);

        LinearLayout header = new LinearLayout(context);
        header.setOrientation(VERTICAL);
        header.setPadding(pad, Ui.dp(context, 12f), pad, Ui.dp(context, 8f));
        header.addView(Ui.text(context, "Fast Stream", 24f, Ui.TEXT, Ui.W_DISPLAY));
        TextView sub = Ui.text(context,
                context.getString(R.string.stream_body), 13f, Ui.TEXT_2, Ui.W_REGULAR);
        LinearLayout.LayoutParams subLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        subLp.topMargin = Ui.dp(context, 3f);
        header.addView(sub, subLp);
        addView(header, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        android.widget.ImageView hero = Ui.artView(context, "art/hero_stream.png", 0, 84f, 16f);
        LinearLayout.LayoutParams heroLp = Ui.lp(LayoutParams.MATCH_PARENT, Ui.dp(context, 84f));
        heroLp.leftMargin = pad;
        heroLp.rightMargin = pad;
        heroLp.bottomMargin = Ui.dp(context, 10f);
        addView(hero, heroLp);

        LinearLayout frame = new LinearLayout(context);
        LinearLayout.LayoutParams frameLp = Ui.lp(LayoutParams.MATCH_PARENT, 0, 1f);
        frameLp.leftMargin = pad;
        frameLp.rightMargin = pad;
        frame.setOrientation(VERTICAL);
        frame.setBackground(Ui.roundStroke(context, Ui.SURFACE, 16f, Ui.LINE));
        frame.setPadding(Ui.dp(context, 2f), Ui.dp(context, 2f), Ui.dp(context, 2f), Ui.dp(context, 2f));
        addView(frame, frameLp);

        webView = new WebView(context);
        webView.setBackgroundColor(0xFF0C0D14);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " LampTikAndroidApp/3.1");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }
        });
        webView.loadUrl(START_URL);
        frame.addView(webView, Ui.lp(LayoutParams.MATCH_PARENT, 0, 1f));

        addView(buildSponsorSlot(), Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        if (host.equals("lamptik.online") || host.endsWith(".lamptik.online")) return false;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception ignored) {
            // No browser installed — keep the user in the app.
        }
        return true;
    }

    /**
     * The app's only ad surface: an inline, labelled sponsor card. It never
     * overlays content and never intercepts a gesture outside its own bound.
     */
    private View buildSponsorSlot() {
        LinearLayout wrap = new LinearLayout(context);
        wrap.setOrientation(VERTICAL);
        int pad = Ui.dp(context, 16f);
        wrap.setPadding(pad, Ui.dp(context, 10f), pad, Ui.dp(context, 12f));

        LinearLayout card = new LinearLayout(context);
        card.setOrientation(VERTICAL);
        card.setBackground(Ui.roundStroke(context, 0x14000000, 16f, 0x4DFCD34D));
        int p = Ui.dp(context, 14f);
        card.setPadding(p, p, p, p);

        TextView pill = Ui.text(context, context.getString(R.string.sponsored), 11f, Ui.AMBER, Ui.W_SEMIBOLD);
        pill.setBackground(Ui.roundStroke(context, 0x0DFCD34D, 999f, 0x40FCD34D));
        pill.setPadding(Ui.dp(context, 10f), Ui.dp(context, 4f), Ui.dp(context, 10f), Ui.dp(context, 4f));
        LinearLayout.LayoutParams pillLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        card.addView(pill, pillLp);

        TextView title = Ui.text(context, context.getString(R.string.sponsor_text), 14f, Ui.TEXT, Ui.W_SEMIBOLD);
        LinearLayout.LayoutParams titleLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = Ui.dp(context, 8f);
        card.addView(title, titleLp);

        TextView cta = Ui.secondaryButton(context, context.getString(R.string.sponsor_cta) + "  ↗");
        LinearLayout.LayoutParams ctaLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        ctaLp.topMargin = Ui.dp(context, 10f);
        card.addView(cta, ctaLp);
        cta.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW,
                            Uri.parse("https://uplcm.com/4/12078941"));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception ignored) {
                    // Ignore.
                }
            }
        });

        wrap.addView(card, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        return wrap;
    }

    void loadUrl(String url) {
        if (webView != null && url != null) webView.loadUrl(url);
    }
}
