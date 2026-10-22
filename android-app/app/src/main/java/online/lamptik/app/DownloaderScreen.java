package online.lamptik.app;

import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Screen A — Home: link card → resolve → result card → DownloadManager.
 *
 * No WebView, no countdown and no fake percentage anywhere on this screen.
 * A download starts the moment the user taps a format; the percentage that
 * appears afterwards is read back from Android's DownloadManager, so it only
 * ever shows bytes that actually arrived.
 */
final class DownloaderScreen extends ScrollView {

    interface Host {
        void toast(String message);

        void onDownloadQueued();

        void openDownloads();
    }

    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"'<>]+");

    /** Platform key per chip; index 0 ("All") accepts everything. */
    private static final String[] CHIP_PLATFORMS = {
            null, "tiktok", "instagram", "facebook", "youtube"
    };
    private static final String[] CHIP_LABELS = {
            "All", "TikTok", "Instagram", "Facebook", "YouTube"
    };
    private static final String[] CHIP_HINTS = {
            "Paste TikTok, Instagram, Facebook or YouTube link…",
            "Paste a TikTok link…",
            "Paste an Instagram Reels link…",
            "Paste a Facebook video link…",
            "Paste a YouTube or Shorts link…"
    };
    /** Restrained brand dots: recognisable without shipping trademarked logos. */
    private static final int[] CHIP_DOTS = {
            0xFF67E8F9, 0xFF25F4EE, 0xFFE1306C, 0xFF1877F2, 0xFFFF3B30
    };

    private static final long POLL_MS = 700L;

    private final Context context;
    private final Host host;
    private final Handler main = new Handler(Looper.getMainLooper());

    private final EditText input;
    private final TextView status;
    private final ProgressBar spinner;
    private final LinearLayout resultCard;
    private final TextView fetchButton;
    private final LinearLayout chipRow;
    private final ImageView clearButton;

    private int selectedChip = 0;

    /** Download currently being watched, or -1 when nothing is queued. */
    private long activeId = -1L;
    private Runnable poller;
    private LinearLayout downloadCard;
    private ProgressBar downloadBar;
    private TextView downloadPercent;
    private TextView downloadState;
    private TextView cancelAction;
    private String activeKind;
    private String activeLabel;
    private String activeUrl;
    private MediaItem activeItem;
    /** True once a final state (saved / failed) has been rendered for the card. */
    private boolean terminalHandled;

    DownloaderScreen(Context context, Host host) {
        super(context);
        this.context = context;
        this.host = host;

        setFillViewport(true);
        setBackgroundColor(Ui.BG);
        setVerticalScrollBarEnabled(false);

        LinearLayout root = new LinearLayout(context);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Ui.dp(context, 16f);
        root.setPadding(pad, Ui.dp(context, 8f), pad, Ui.dp(context, 28f));
        addView(root, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        /* ----------------------------------------------------------- hero */
        ImageView hero = Ui.artView(context, "art/hero_downloader.png", R.drawable.ic_launcher_background, 128f, 18f);
        LinearLayout.LayoutParams heroLp = Ui.lp(LayoutParams.MATCH_PARENT, Ui.dp(context, 128f));
        heroLp.bottomMargin = Ui.dp(context, 14f);
        root.addView(hero, heroLp);

        /* ---------------------------------------------------------- chips */
        chipRow = new LinearLayout(context);
        chipRow.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < CHIP_LABELS.length; i++) {
            final int index = i;
            LinearLayout chip = new LinearLayout(context);
            chip.setOrientation(LinearLayout.HORIZONTAL);
            chip.setGravity(Gravity.CENTER_VERTICAL);
            chip.setPadding(Ui.dp(context, 12f), Ui.dp(context, 7f), Ui.dp(context, 13f), Ui.dp(context, 7f));
            chip.setClickable(true);
            chip.setFocusable(true);
            chip.setContentDescription(CHIP_LABELS[i]);

            View dot = new View(context);
            dot.setBackground(Ui.round(context, CHIP_DOTS[i], 999f));
            LinearLayout.LayoutParams dotLp = Ui.lp(Ui.dp(context, 7f), Ui.dp(context, 7f));
            dotLp.rightMargin = Ui.dp(context, 7f);
            chip.addView(dot, dotLp);
            chip.addView(Ui.text(context, CHIP_LABELS[i], 13f, Ui.TEXT_2, Ui.W_MEDIUM));

            LinearLayout.LayoutParams chipLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            chipLp.rightMargin = Ui.dp(context, 8f);
            chip.setLayoutParams(chipLp);
            chip.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    selectChip(index);
                }
            });
            chipRow.addView(chip);
        }
        android.widget.HorizontalScrollView chipScroll = new android.widget.HorizontalScrollView(context);
        chipScroll.setHorizontalScrollBarEnabled(false);
        chipScroll.addView(chipRow);
        root.addView(chipScroll, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        /* ------------------------------------------------------ input card */
        LinearLayout card = Ui.card(context);
        LinearLayout.LayoutParams cardLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        cardLp.topMargin = Ui.dp(context, 12f);
        root.addView(card, cardLp);

        LinearLayout headerRow = new LinearLayout(context);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView dot = Ui.text(context, "●", 9f, Ui.ACCENT_INK, Ui.W_REGULAR);
        headerRow.addView(dot);
        TextView ready = Ui.text(context, "  Ready", 12f, Ui.TEXT_2, Ui.W_MEDIUM);
        headerRow.addView(ready);
        headerRow.addView(new View(context), Ui.lp(0, 1, 1f));
        headerRow.addView(Ui.pill(context, "NO WATERMARK", Ui.ACCENT_INK));
        card.addView(headerRow);

        LinearLayout inputRow = new LinearLayout(context);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        inputRow.setGravity(Gravity.CENTER_VERTICAL);
        inputRow.setBackground(Ui.roundStroke(context, Ui.SURFACE_3, 12f, Ui.LINE_STRONG));
        int ip = Ui.dp(context, 8f);
        inputRow.setPadding(ip, ip, ip, ip);
        LinearLayout.LayoutParams inputLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        inputLp.topMargin = Ui.dp(context, 12f);
        card.addView(inputRow, inputLp);

        inputRow.addView(Ui.icon(context, R.drawable.ic_link, Ui.TEXT_3, 20f));
        input = new EditText(context);
        input.setHint(CHIP_HINTS[0]);
        input.setHintTextColor(Ui.TEXT_3);
        input.setTextColor(Ui.TEXT);
        input.setTextSize(15f);
        input.setTypeface(Ui.font(context, Ui.W_REGULAR));
        input.setSingleLine(true);
        input.setImeOptions(EditorInfo.IME_ACTION_GO);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setBackground(null);
        input.setPadding(Ui.dp(context, 10f), 0, Ui.dp(context, 8f), 0);
        input.setOnEditorActionListener(new TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(TextView v, int actionId, android.view.KeyEvent event) {
                if (actionId == EditorInfo.IME_ACTION_GO) {
                    onFetchClicked();
                    return true;
                }
                return false;
            }
        });
        inputRow.addView(input, Ui.lp(0, Ui.dp(context, 44f), 1f));

        clearButton = Ui.icon(context, R.drawable.ic_close, Ui.TEXT_3, 16f);
        clearButton.setContentDescription(context.getString(R.string.clear));
        clearButton.setPadding(Ui.dp(context, 6f), Ui.dp(context, 6f), Ui.dp(context, 6f), Ui.dp(context, 6f));
        clearButton.setClickable(true);
        clearButton.setFocusable(true);
        clearButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                input.setText("");
                resetStatus();
            }
        });
        inputRow.addView(clearButton);

        LinearLayout pasteBox = new LinearLayout(context);
        pasteBox.setOrientation(LinearLayout.HORIZONTAL);
        pasteBox.setGravity(Gravity.CENTER_VERTICAL);
        pasteBox.setBackground(Ui.ripple(Ui.roundStroke(context, Ui.SURFACE_2, 10f, Ui.LINE), 0x22FFFFFF));
        pasteBox.setPadding(Ui.dp(context, 10f), Ui.dp(context, 8f), Ui.dp(context, 10f), Ui.dp(context, 8f));
        pasteBox.setClickable(true);
        pasteBox.setFocusable(true);
        pasteBox.addView(Ui.icon(context, R.drawable.ic_paste, Ui.TEXT_2, 16f));
        TextView pasteLabel = Ui.text(context, " Paste", 13f, Ui.TEXT_2, Ui.W_MEDIUM);
        pasteBox.addView(pasteLabel);
        pasteBox.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                pasteFromClipboard();
            }
        });
        inputRow.addView(pasteBox);

        fetchButton = Ui.primaryButton(context, context.getString(R.string.fetch));
        LinearLayout.LayoutParams fetchLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        fetchLp.topMargin = Ui.dp(context, 12f);
        card.addView(fetchButton, fetchLp);
        fetchButton.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                onFetchClicked();
            }
        });

        LinearLayout statusRow = new LinearLayout(context);
        statusRow.setOrientation(LinearLayout.HORIZONTAL);
        statusRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams statusLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        statusLp.topMargin = Ui.dp(context, 10f);
        card.addView(statusRow, statusLp);

        spinner = new ProgressBar(context);
        spinner.setIndeterminate(true);
        spinner.setVisibility(View.GONE);
        LinearLayout.LayoutParams spinnerLp = Ui.lp(Ui.dp(context, 16f), Ui.dp(context, 16f));
        spinnerLp.rightMargin = Ui.dp(context, 8f);
        statusRow.addView(spinner, spinnerLp);

        status = Ui.text(context, "Server-side · nothing stored", 12f, Ui.TEXT_3, Ui.W_REGULAR);
        statusRow.addView(status, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));

        /* ---------------------------------------------------- result card */
        resultCard = new LinearLayout(context);
        resultCard.setOrientation(LinearLayout.VERTICAL);
        resultCard.setBackground(Ui.roundStroke(context, Ui.SURFACE, 16f, Ui.LINE));
        resultCard.setVisibility(View.GONE);
        LinearLayout.LayoutParams resultLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        resultLp.topMargin = Ui.dp(context, 16f);
        root.addView(resultCard, resultLp);

        /* ------------------------------------------------------ how it works */
        root.addView(buildStepsCard(), Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        /* ---------------------------------------------------- sponsor card */
        root.addView(buildSponsorCard(), Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
    }

    private LinearLayout buildStepsCard() {
        LinearLayout card = Ui.card(context);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 16f);
        card.setLayoutParams(lp);

        TextView eyebrow = Ui.text(context, "How it works", 13f, Ui.TEXT_2, Ui.W_SEMIBOLD);
        card.addView(eyebrow);

        String[][] steps = {
                {"01", "Paste a link", "Copy from TikTok, Instagram, Facebook or YouTube and tap Paste."},
                {"02", "Fetch the stream", "We verify the real H.264 file before showing a button."},
                {"03", "Save natively", "Android's download manager writes it to your Downloads folder."}
        };
        for (String[] step : steps) {
            LinearLayout row = new LinearLayout(context);
            row.setOrientation(LinearLayout.HORIZONTAL);
            LinearLayout.LayoutParams rowLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            rowLp.topMargin = Ui.dp(context, 14f);
            row.setLayoutParams(rowLp);

            TextView number = Ui.text(context, step[0], 11f, Ui.ACCENT_INK, Ui.W_SEMIBOLD);
            number.setBackground(Ui.roundStroke(context, 0x1422D3EE, 8f, 0x3322D3EE));
            number.setGravity(Gravity.CENTER);
            number.setPadding(Ui.dp(context, 7f), Ui.dp(context, 4f), Ui.dp(context, 7f), Ui.dp(context, 4f));
            row.addView(number);

            LinearLayout copy = new LinearLayout(context);
            copy.setOrientation(LinearLayout.VERTICAL);
            LinearLayout.LayoutParams copyLp = Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f);
            copyLp.leftMargin = Ui.dp(context, 12f);
            row.addView(copy, copyLp);
            copy.addView(Ui.text(context, step[1], 14f, Ui.TEXT, Ui.W_SEMIBOLD));
            copy.addView(Ui.text(context, step[2], 12f, Ui.TEXT_2, Ui.W_REGULAR));

            card.addView(row);
        }
        return card;
    }

    /**
     * The app's only ad surface: one labelled card at the very bottom of Home,
     * below the downloader and its result. It never overlays content, never
     * pretends to be a system message and never sits between the user and a
     * download button.
     */
    private LinearLayout buildSponsorCard() {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(Ui.roundStroke(context, 0x14000000, 16f, 0x4DFCD34D));
        int p = Ui.dp(context, 14f);
        card.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 16f);
        card.setLayoutParams(lp);

        TextView pill = Ui.text(context, context.getString(R.string.sponsored), 10f, Ui.AMBER, Ui.W_SEMIBOLD);
        pill.setBackground(Ui.roundStroke(context, 0x0DFCD34D, 999f, 0x40FCD34D));
        pill.setPadding(Ui.dp(context, 9f), Ui.dp(context, 4f), Ui.dp(context, 9f), Ui.dp(context, 4f));
        card.addView(pill, Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT));

        TextView title = Ui.text(context, context.getString(R.string.sponsor_text), 13f, Ui.TEXT_2, Ui.W_REGULAR);
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
                } catch (Exception error) {
                    host.toast("No browser available to open the sponsor link.");
                }
            }
        });
        return card;
    }

    /* ------------------------------------------------------------ actions */

    private void selectChip(int index) {
        selectedChip = index;
        for (int i = 0; i < chipRow.getChildCount(); i++) {
            LinearLayout chip = (LinearLayout) chipRow.getChildAt(i);
            boolean active = i == index;
            TextView label = (TextView) chip.getChildAt(1);
            label.setTextColor(active ? Ui.ACCENT_INK : Ui.TEXT_2);
            chip.setBackground(Ui.ripple(
                    active
                            ? Ui.roundStroke(context, 0x2622D3EE, 999f, 0x8022D3EE)
                            : Ui.roundStroke(context, Ui.SURFACE_2, 999f, Ui.LINE),
                    0x22FFFFFF));
        }
        input.setHint(CHIP_HINTS[index]);
    }

    void pasteFromClipboard() {
        try {
            ClipboardManager clipboard =
                    (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null || !clipboard.hasPrimaryClip()) {
                host.toast("Clipboard is empty.");
                return;
            }
            ClipData clip = clipboard.getPrimaryClip();
            if (clip == null || clip.getItemCount() == 0) {
                host.toast("Clipboard is empty.");
                return;
            }
            CharSequence text = clip.getItemAt(0).coerceToText(context);
            if (text == null || text.length() == 0) {
                host.toast("Clipboard is empty.");
                return;
            }
            String url = extractUrl(text.toString());
            if (url == null) {
                inlineError("No video link found on the clipboard.");
                return;
            }
            input.setText(url);
            input.setSelection(url.length());
            submit(url);
        } catch (Exception error) {
            host.toast("Could not read the clipboard.");
        }
    }

    /** Hand-off from the Android share sheet or a deep link. */
    void submitShared(String shared) {
        String url = extractUrl(shared);
        if (url == null) {
            input.setText(shared);
            inlineError("That share contained no video link.");
            host.toast("No video link in that share.");
            return;
        }
        input.setText(url);
        input.setSelection(url.length());
        if (!Prefs.autoFetch(context)) {
            resetStatus();
            status.setText("Link ready — tap Fetch & download.");
            return;
        }
        submit(url);
    }

    void focusInput() {
        input.requestFocus();
    }

    private void onFetchClicked() {
        String raw = input.getText() == null ? "" : input.getText().toString().trim();
        if (raw.isEmpty()) {
            inlineError("Paste a video link first.");
            return;
        }
        String url = extractUrl(raw);
        if (url == null) {
            inlineError("That doesn't look like a video link.");
            return;
        }
        input.setText(url);
        submit(url);
    }

    /**
     * Validates before any network call: a link from another site, or one that
     * does not match the selected platform, is answered here instead of with a
     * confusing server error.
     */
    private void submit(String url) {
        String platform = ApiClient.platformOf(url);
        if (platform == null) {
            inlineError("Only TikTok, Instagram, Facebook and YouTube links are supported.");
            return;
        }
        String selected = CHIP_PLATFORMS[selectedChip];
        if (selected != null && !selected.equals(platform)) {
            inlineError("That is a " + platformLabel(platform) + " link — choose "
                    + platformLabel(platform) + " or All above.");
            return;
        }
        fetch(url);
    }

    private static String platformLabel(String platform) {
        switch (platform) {
            case "instagram":
                return "Instagram";
            case "facebook":
                return "Facebook";
            case "youtube":
                return "YouTube";
            default:
                return "TikTok";
        }
    }

    private void fetch(final String url) {
        setLoading(true);

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final MediaItem item = ApiClient.resolve(url);
                    main.post(new Runnable() {
                        @Override
                        public void run() {
                            setLoading(false);
                            renderResult(item);
                        }
                    });
                } catch (final IOException error) {
                    main.post(new Runnable() {
                        @Override
                        public void run() {
                            setLoading(false);
                            inlineError(error.getMessage() == null
                                    ? "Could not resolve this link."
                                    : error.getMessage());
                        }
                    });
                }
            }
        }, "lamptik-resolve").start();
    }

    private void setLoading(boolean loading) {
        spinner.setVisibility(loading ? View.VISIBLE : View.GONE);
        fetchButton.setEnabled(!loading);
        fetchButton.setAlpha(loading ? 0.6f : 1f);
        fetchButton.setText(loading ? context.getString(R.string.fetching) : context.getString(R.string.fetch));
        if (loading) {
            status.setTextColor(Ui.TEXT_2);
            status.setText("Verifying stream…");
            resultCard.setVisibility(View.GONE);
        }
    }

    private void inlineError(String message) {
        status.setTextColor(Ui.ERR);
        status.setText(message);
        resultCard.setVisibility(View.GONE);
        spinner.setVisibility(View.GONE);
        setLoading(false);
    }

    private void resetStatus() {
        status.setTextColor(Ui.TEXT_3);
        status.setText("Server-side · nothing stored");
    }

    /* ------------------------------------------------------------ results */

    private void renderResult(final MediaItem item) {
        status.setTextColor(Ui.OK);
        status.setText("Stream ready · saved by the Android download manager");

        resultCard.removeAllViews();
        resultCard.setVisibility(View.VISIBLE);

        FrameLayout thumbFrame = new FrameLayout(context);
        int thumbHeight = Ui.dp(context, 190f);
        resultCard.addView(thumbFrame, Ui.lp(LayoutParams.MATCH_PARENT, thumbHeight));

        final ImageView thumb = new ImageView(context);
        thumb.setScaleType(ImageView.ScaleType.CENTER_CROP);
        thumb.setBackgroundColor(Ui.SURFACE_2);
        thumbFrame.addView(thumb, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        TextView duration = Ui.text(context, Ui.formatDuration(item.durationSeconds), 11f, Ui.TEXT, Ui.W_SEMIBOLD);
        duration.setBackground(Ui.round(context, 0xB3000000, 8f));
        duration.setPadding(Ui.dp(context, 7f), Ui.dp(context, 3f), Ui.dp(context, 7f), Ui.dp(context, 3f));
        FrameLayout.LayoutParams durLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.END);
        durLp.setMargins(0, 0, Ui.dp(context, 10f), Ui.dp(context, 10f));
        thumbFrame.addView(duration, durLp);

        LinearLayout body = new LinearLayout(context);
        body.setOrientation(LinearLayout.VERTICAL);
        int p = Ui.dp(context, 16f);
        body.setPadding(p, p, p, p);
        resultCard.addView(body);

        if (!TextUtils.isEmpty(item.thumbnail)) {
            final int target = Ui.dp(context, 420f);
            new Thread(new Runnable() {
                @Override
                public void run() {
                    final Bitmap bitmap = ApiClient.thumbnail(item.thumbnail, target);
                    if (bitmap == null) return;
                    main.post(new Runnable() {
                        @Override
                        public void run() {
                            thumb.setImageBitmap(bitmap);
                        }
                    });
                }
            }, "lamptik-thumb").start();
        }

        LinearLayout badgeRow = new LinearLayout(context);
        badgeRow.setOrientation(LinearLayout.HORIZONTAL);
        badgeRow.setGravity(Gravity.CENTER_VERTICAL);
        badgeRow.addView(Ui.pill(context, item.badgeLabel(), Ui.ACCENT_INK));
        if (!TextUtils.isEmpty(item.codec)) {
            TextView codec = Ui.pill(context, item.codec.toUpperCase(), Ui.TEXT_2);
            LinearLayout.LayoutParams codecLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            codecLp.leftMargin = Ui.dp(context, 6f);
            badgeRow.addView(codec, codecLp);
        }
        body.addView(badgeRow);

        TextView title = Ui.text(context, item.title, 16f, Ui.TEXT, Ui.W_SEMIBOLD);
        LinearLayout.LayoutParams titleLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = Ui.dp(context, 10f);
        body.addView(title, titleLp);

        if (!TextUtils.isEmpty(item.author)) {
            TextView author = Ui.text(context, "@" + item.author, 12f, Ui.TEXT_2, Ui.W_REGULAR);
            LinearLayout.LayoutParams authorLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            authorLp.topMargin = Ui.dp(context, 4f);
            body.addView(author, authorLp);
        }

        TextView hd = Ui.primaryButton(context, label(context.getString(R.string.download_hd), item.hdBytes));
        LinearLayout.LayoutParams hdLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        hdLp.topMargin = Ui.dp(context, 14f);
        body.addView(hd, hdLp);
        hd.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                start(item, "video", item.hdUrl, "HD MP4");
            }
        });

        if (item.hasSd()) {
            TextView sd = Ui.secondaryButton(context, label(context.getString(R.string.download_sd), item.sdBytes));
            LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            lp.topMargin = Ui.dp(context, 8f);
            body.addView(sd, lp);
            sd.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    start(item, "video", item.sdUrl, "SD MP4");
                }
            });
        }

        if (item.hasMp3()) {
            TextView mp3 = Ui.secondaryButton(context, context.getString(R.string.download_mp3));
            LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            lp.topMargin = Ui.dp(context, 8f);
            body.addView(mp3, lp);
            mp3.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View v) {
                    start(item, "audio", item.mp3Url, "MP3");
                }
            });
        }

        TextView hint = Ui.text(context,
                "Downloads keep running in the background. Find them under Downloads.",
                12f, Ui.TEXT_3, Ui.W_REGULAR);
        LinearLayout.LayoutParams hintLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = Ui.dp(context, 12f);
        body.addView(hint, hintLp);
    }

    private String label(String base, long bytes) {
        String size = Ui.formatBytes(bytes);
        return size.isEmpty() ? base : base + " · " + size;
    }

    /* ----------------------------------------------------------- download */

    /**
     * Hands the resolved URL to Android's DownloadManager immediately — no
     * countdown, no gate — then follows the transfer with a progress card
     * driven by the manager's own byte counters.
     */
    private void start(final MediaItem item, final String kind, final String url, final String label) {
        if (TextUtils.isEmpty(url)) {
            host.toast("That format is unavailable for this video.");
            return;
        }
        long id = enqueue(item, kind, url, label);
        if (id < 0) return;
        showProgressCard(item, kind, url, label, id);
    }

    /** @return the DownloadManager id, or -1 when the request was refused. */
    private long enqueue(MediaItem item, String kind, String url, String label) {
        try {
            DownloadManager manager =
                    (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                if (!openInBrowser(url)) host.toast("Android download manager is unavailable.");
                return -1L;
            }
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(item.title);
            request.setDescription("LAMP TIK · " + label);
            request.setMimeType("audio".equals(kind) ? "audio/mpeg" : "video/mp4");
            // Browser UA + platform Referer: signed CDNs (TikTok edges,
            // Loader.to/savenow.to) reject requests that look like a bare API
            // client but stream a normal Chrome request perfectly. The same
            // headers let the server's 302 hand-off to the CDN succeed too.
            request.addRequestHeader("User-Agent", ApiClient.BROWSER_UA);
            request.addRequestHeader("Referer", refererFor(url));
            request.addRequestHeader("Accept", "*/*");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            boolean wifiOnly = Prefs.wifiOnly(context);
            request.setAllowedOverMetered(!wifiOnly);
            request.setAllowedOverRoaming(!wifiOnly);
            try {
                request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS, item.safeFileName(kind));
            } catch (Exception ignored) {
                // No public Downloads access (rare): DownloadManager still
                // downloads to its own cache and exposes the content URI.
            }
            long id = manager.enqueue(request);
            host.onDownloadQueued();
            return id;
        } catch (Exception error) {
            // DownloadManager refused the request (bad URI, storage scope,
            // unsupported scheme). Hand the exact URL to a browser instead of
            // dead-ending — the link itself is valid.
            if (!openInBrowser(url)) host.toast("Could not start the download.");
            return -1L;
        }
    }

    private void showProgressCard(final MediaItem item, final String kind, final String url,
                                  final String label, final long id) {
        if (downloadCard != null && downloadCard.getParent() != null) {
            resultCard.removeView(downloadCard);
        }
        stopPolling();

        activeId = id;
        terminalHandled = false;
        activeItem = item;
        activeKind = kind;
        activeUrl = url;
        activeLabel = label;

        downloadCard = new LinearLayout(context);
        downloadCard.setOrientation(LinearLayout.VERTICAL);
        downloadCard.setBackground(Ui.roundStroke(context, 0x1422D3EE, 16f, 0x5522D3EE));
        int p = Ui.dp(context, 14f);
        downloadCard.setPadding(p, p, p, p);

        LinearLayout header = new LinearLayout(context);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        downloadCard.addView(header);

        TextView title = Ui.text(context, label + " download", 14f, Ui.TEXT, Ui.W_SEMIBOLD);
        header.addView(title, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));

        downloadPercent = Ui.text(context, "…", 13f, Ui.ACCENT_INK, Ui.W_SEMIBOLD);
        header.addView(downloadPercent);

        downloadBar = new ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal);
        downloadBar.setMax(100);
        downloadBar.setProgress(0);
        downloadBar.setProgressTintList(ColorStateList.valueOf(Ui.ACCENT));
        downloadBar.setProgressBackgroundTintList(ColorStateList.valueOf(Ui.SURFACE_3));
        LinearLayout.LayoutParams barLp = Ui.lp(LayoutParams.MATCH_PARENT, Ui.dp(context, 6f));
        barLp.topMargin = Ui.dp(context, 10f);
        downloadCard.addView(downloadBar, barLp);

        downloadState = Ui.text(context, "Queued in Android's download manager…", 12f, Ui.TEXT_2, Ui.W_REGULAR);
        LinearLayout.LayoutParams stateLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        stateLp.topMargin = Ui.dp(context, 8f);
        downloadCard.addView(downloadState, stateLp);

        LinearLayout actions = new LinearLayout(context);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams actionsLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        actionsLp.topMargin = Ui.dp(context, 10f);
        downloadCard.addView(actions, actionsLp);

        cancelAction = Ui.secondaryButton(context, context.getString(R.string.cancel));
        actions.addView(cancelAction, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));
        cancelAction.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                cancelDownload();
            }
        });

        resultCard.addView(downloadCard);
        startPolling();
    }

    private void startPolling() {
        stopPolling();
        final Runnable tick = new Runnable() {
            @Override
            public void run() {
                if (activeId < 0 || downloadState == null) return;
                Progress state = progressOf(activeId);
                if (state == null) {
                    downloadState.setText("This download was removed from Android's list.");
                    downloadPercent.setText("");
                    finishPolling();
                    return;
                }
                switch (state.status) {
                    case DownloadManager.STATUS_SUCCESSFUL:
                        downloadBar.setIndeterminate(false);
                        downloadBar.setProgress(100);
                        downloadPercent.setText("100%");
                        downloadState.setTextColor(Ui.OK);
                        downloadState.setText("Saved to your Downloads folder · "
                                + Ui.formatBytes(state.total));
                        if (!terminalHandled) {
                            terminalHandled = true;
                            showCompletedActions();
                        }
                        finishPolling();
                        return;
                    case DownloadManager.STATUS_FAILED:
                        downloadBar.setIndeterminate(false);
                        downloadPercent.setText("");
                        downloadState.setTextColor(Ui.ERR);
                        downloadState.setText("Download failed"
                                + (state.reason == DownloadManager.ERROR_INSUFFICIENT_SPACE
                                ? " — not enough free space." : " — tap Retry."));
                        if (!terminalHandled) {
                            terminalHandled = true;
                            showRetryAction();
                        }
                        finishPolling();
                        return;
                    case DownloadManager.STATUS_PAUSED:
                        downloadState.setText("Paused by Android — it resumes when the network returns.");
                        break;
                    default:
                        if (state.total > 0) {
                            int percent = (int) Math.min(100, state.bytes * 100 / state.total);
                            downloadBar.setIndeterminate(false);
                            downloadBar.setProgress(percent);
                            downloadPercent.setText(percent + "%");
                            downloadState.setTextColor(Ui.TEXT_2);
                            downloadState.setText(Ui.formatBytes(state.bytes) + " of "
                                    + Ui.formatBytes(state.total));
                        } else {
                            downloadBar.setIndeterminate(true);
                            downloadPercent.setText("…");
                            downloadState.setText("Starting the transfer…");
                        }
                        break;
                }
                main.postDelayed(this, POLL_MS);
            }
        };
        poller = tick;
        main.postDelayed(tick, 350L);
    }

    private void stopPolling() {
        if (poller != null) {
            main.removeCallbacks(poller);
            poller = null;
        }
    }

    private void finishPolling() {
        stopPolling();
        activeId = -1L;
        if (cancelAction != null) cancelAction.setVisibility(View.GONE);
    }

    private void showCompletedActions() {
        if (downloadCard == null) return;
        LinearLayout actions = new LinearLayout(context);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 10f);
        downloadCard.addView(actions, lp);

        TextView open = Ui.primaryButton(context, "Open in Downloads");
        actions.addView(open, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));
        open.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                host.openDownloads();
            }
        });
    }

    private void showRetryAction() {
        if (downloadCard == null) return;
        LinearLayout actions = new LinearLayout(context);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 10f);
        downloadCard.addView(actions, lp);

        TextView retry = Ui.secondaryButton(context, "Retry");
        actions.addView(retry, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));
        retry.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                if (activeItem == null) return;
                start(activeItem, activeKind, activeUrl, activeLabel);
            }
        });
    }

    private void cancelDownload() {
        try {
            DownloadManager manager =
                    (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager != null && activeId >= 0) manager.remove(activeId);
        } catch (Exception ignored) {
            // Android already dropped the record.
        }
        finishPolling();
        terminalHandled = true;
        if (downloadState != null) {
            downloadState.setTextColor(Ui.TEXT_2);
            downloadState.setText("Cancelled — nothing was saved.");
        }
        host.toast("Download cancelled.");
        host.onDownloadQueued();
    }

    /** One read of the manager's counters for this download. */
    private Progress progressOf(long id) {
        DownloadManager manager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return null;
        Cursor cursor = null;
        try {
            cursor = manager.query(new DownloadManager.Query().setFilterById(id));
            if (cursor == null || !cursor.moveToFirst()) return null;
            Progress progress = new Progress();
            progress.status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            progress.bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            progress.total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            progress.reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
            return progress;
        } catch (Exception ignored) {
            return null;
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    private static final class Progress {
        int status;
        long bytes;
        long total;
        int reason;
    }

    /** Platform-matching Referer for the upstream CDN. */
    private String refererFor(String url) {
        String lower = url == null ? "" : url.toLowerCase();
        if (lower.contains("savenow.to") || lower.contains("loader.to") || lower.contains("oceansaver.in")) {
            return "https://loader.to/";
        }
        if (lower.contains("tikwm.com")) return "https://www.tikwm.com/";
        if (lower.contains("instagram")) return "https://www.instagram.com/";
        if (lower.contains("facebook") || lower.contains("fbcdn")) return "https://www.facebook.com/";
        if (lower.contains("googlevideo") || lower.contains("youtube")) return "https://www.youtube.com/";
        return "https://www.tiktok.com/";
    }

    /** Last-resort fallback: open the resolved URL in the device browser. */
    private boolean openInBrowser(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    /* ------------------------------------------------------------ lifecycle */

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        // Returning to Home mid-download resumes the progress card.
        if (activeId >= 0 && poller == null && downloadState != null) startPolling();
    }

    @Override
    protected void onDetachedFromWindow() {
        stopPolling();
        super.onDetachedFromWindow();
    }

    static String extractUrl(String raw) {
        if (raw == null) return null;
        Matcher matcher = URL_PATTERN.matcher(raw);
        if (matcher.find()) {
            String found = matcher.group();
            // Trim trailing punctuation that share sheets love to append.
            while (found.length() > 8 && ").,;\"'>]".indexOf(found.charAt(found.length() - 1)) >= 0) {
                found = found.substring(0, found.length() - 1);
            }
            return found;
        }
        String trimmed = raw.trim();
        if (trimmed.matches("(?i)(www\\.)?(tiktok|instagram|facebook|youtube|youtu)\\.(com|be)/.*")) {
            return "https://" + trimmed;
        }
        if (trimmed.matches("(?i)(vt|vm)\\.tiktok\\.com/.*")) {
            return "https://" + trimmed;
        }
        return null;
    }
}
