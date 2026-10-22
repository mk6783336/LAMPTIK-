package online.lamptik.app;

import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
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
 * The main native screen: URL card → resolve → result card → DownloadManager.
 *
 * No WebView anywhere in this screen. Every element is a real Android view,
 * and the byte transfer is handed to the system DownloadManager so it keeps
 * running with a notification when the app is backgrounded.
 */
final class DownloaderScreen extends ScrollView {

    interface Host {
        void toast(String message);

        void onDownloadQueued();
    }

    private static final Pattern URL_PATTERN = Pattern.compile("https?://[^\\s\"'<>]+");

    private final Context context;
    private final Host host;
    private final Handler main = new Handler(Looper.getMainLooper());

    private final EditText input;
    private final TextView status;
    private final ProgressBar progress;
    private final LinearLayout resultCard;
    private final TextView fetchButton;
    private final LinearLayout chipRow;

    private static final String[] CHIP_LABELS = {"All", "TikTok", "Reels", "Facebook", "YouTube"};
    private static final String[] CHIP_HINTS = {
            "Paste TikTok, Reels, FB or YouTube link…",
            "Paste a TikTok link…",
            "Paste an Instagram Reels link…",
            "Paste a Facebook video link…",
            "Paste a YouTube or Shorts link…"
    };
    private int selectedChip = 0;

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
            TextView chip = Ui.text(context, CHIP_LABELS[i], 13f, Ui.TEXT_2, Ui.W_MEDIUM);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(Ui.dp(context, 14f), Ui.dp(context, 7f), Ui.dp(context, 14f), Ui.dp(context, 7f));
            chip.setBackground(Ui.ripple(Ui.roundStroke(context, Ui.SURFACE_2, 999f, Ui.LINE), 0x22FFFFFF));
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

        progress = new ProgressBar(context);
        progress.setIndeterminate(true);
        progress.setVisibility(View.GONE);
        LinearLayout.LayoutParams progressLp = Ui.lp(Ui.dp(context, 16f), Ui.dp(context, 16f));
        progressLp.rightMargin = Ui.dp(context, 8f);
        statusRow.addView(progress, progressLp);

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
    }

    private LinearLayout buildStepsCard() {
        LinearLayout card = Ui.card(context);
        LinearLayout.LayoutParams lp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        lp.topMargin = Ui.dp(context, 16f);
        card.setLayoutParams(lp);

        TextView eyebrow = Ui.text(context, "How it works", 13f, Ui.TEXT_2, Ui.W_SEMIBOLD);
        card.addView(eyebrow);

        String[][] steps = {
                {"01", "Paste a link", "Copy from TikTok, Reels, Facebook or YouTube and tap Paste."},
                {"02", "Fetch the stream", "We verify the real H.264 file before showing a button."},
                {"03", "Save natively", "The system downloader writes it to your Downloads folder."}
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

    /* ------------------------------------------------------------ actions */

    private void selectChip(int index) {
        selectedChip = index;
        for (int i = 0; i < chipRow.getChildCount(); i++) {
            TextView chip = (TextView) chipRow.getChildAt(i);
            boolean active = i == index;
            chip.setTextColor(active ? Ui.ACCENT_INK : Ui.TEXT_2);
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
                host.toast("No video link found on the clipboard.");
                return;
            }
            input.setText(url);
            input.setSelection(url.length());
            fetch(url);
        } catch (Exception error) {
            host.toast("Could not read the clipboard.");
        }
    }

    /** Hand-off from the Android share sheet or a deep link. */
    void submitShared(String shared) {
        String url = extractUrl(shared);
        if (url == null) {
            input.setText(shared);
            host.toast("Paste a video link to fetch.");
            return;
        }
        input.setText(url);
        input.setSelection(url.length());
        fetch(url);
    }

    void focusInput() {
        input.requestFocus();
    }

    private void onFetchClicked() {
        String raw = input.getText() == null ? "" : input.getText().toString().trim();
        if (raw.isEmpty()) {
            host.toast("Paste a video link first.");
            return;
        }
        String url = extractUrl(raw);
        if (url == null) {
            host.toast("That doesn't look like a video link.");
            return;
        }
        input.setText(url);
        fetch(url);
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
                            showError(error.getMessage() == null
                                    ? "Could not resolve this link."
                                    : error.getMessage());
                        }
                    });
                }
            }
        }, "lamptik-resolve").start();
    }

    private void setLoading(boolean loading) {
        progress.setVisibility(loading ? View.VISIBLE : View.GONE);
        fetchButton.setEnabled(!loading);
        fetchButton.setAlpha(loading ? 0.6f : 1f);
        fetchButton.setText(loading ? context.getString(R.string.fetching) : context.getString(R.string.fetch));
        if (loading) {
            status.setTextColor(Ui.TEXT_2);
            status.setText("Verifying stream…");
            resultCard.setVisibility(View.GONE);
        }
    }

    private void showError(String message) {
        status.setTextColor(Ui.ERR);
        status.setText(message);
        resultCard.setVisibility(View.GONE);
        host.toast(message);
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
                enqueue(item, "video", item.hdUrl, "HD MP4");
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
                    enqueue(item, "video", item.sdUrl, "SD MP4");
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
                    enqueue(item, "audio", item.mp3Url, "MP3");
                }
            });
        }

        TextView hint = Ui.text(context,
                "Downloads keep running in the background. Find them under My Downloads.",
                12f, Ui.TEXT_3, Ui.W_REGULAR);
        LinearLayout.LayoutParams hintLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = Ui.dp(context, 12f);
        body.addView(hint, hintLp);
    }

    private String label(String base, long bytes) {
        String size = Ui.formatBytes(bytes);
        return size.isEmpty() ? base : base + " · " + size;
    }

    /** Hand the bytes to Android's DownloadManager (notification + resume). */
    private void enqueue(MediaItem item, String kind, String url, String label) {
        if (TextUtils.isEmpty(url)) {
            host.toast("That format is unavailable for this video.");
            return;
        }
        try {
            DownloadManager manager =
                    (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                host.toast("Android download manager is unavailable.");
                return;
            }
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(item.title);
            request.setDescription("LAMP TIK · " + label);
            request.setMimeType("audio".equals(kind) ? "audio/mpeg" : "video/mp4");
            request.addRequestHeader("User-Agent", ApiClient.USER_AGENT);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            try {
                request.setDestinationInExternalPublicDir(
                        Environment.DIRECTORY_DOWNLOADS, item.safeFileName(kind));
            } catch (Exception ignored) {
                // No public Downloads access (rare): DownloadManager still
                // downloads to its own cache and exposes the content URI.
            }
            manager.enqueue(request);
            host.toast(label + " download started — check your notifications.");
            host.onDownloadQueued();
        } catch (Exception error) {
            host.toast("Could not start the download.");
        }
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
