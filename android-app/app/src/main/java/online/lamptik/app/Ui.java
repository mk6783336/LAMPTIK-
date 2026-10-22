package online.lamptik.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.content.res.ColorStateList;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * The native design system.
 *
 * Framework-only on purpose: the APK ships zero support libraries, so these
 * helpers are the whole "component library" — type scale, rounded surfaces,
 * the three button variants (primary gradient, secondary glass, ghost), pills
 * and the shared spacing rhythm.
 */
final class Ui {

    /* Palette — mirrors the web tokens so the app and site read as one brand. */
    static final int BG = 0xFF050608;
    static final int SURFACE = 0xFF0C0D14;
    static final int SURFACE_2 = 0xFF101219;
    static final int SURFACE_3 = 0xFF161925;
    static final int LINE = 0x1FFFFFFF;
    static final int LINE_STRONG = 0x33FFFFFF;
    static final int TEXT = 0xFFF6F7FB;
    static final int TEXT_2 = 0xFFA4ADBE;
    static final int TEXT_3 = 0xFF6D7585;
    static final int ACCENT = 0xFF22D3EE;
    static final int ACCENT_INK = 0xFF67E8F9;
    static final int OK = 0xFF34D399;
    static final int WARN = 0xFFFBBF24;
    static final int ERR = 0xFFFB7185;
    static final int AMBER = 0xFFFCD34D;

    static final int W_REGULAR = 0;
    static final int W_MEDIUM = 1;
    static final int W_SEMIBOLD = 2;
    static final int W_BOLD = 3;
    static final int W_DISPLAY = 4;

    private static Typeface regular, medium, semibold, bold, display;

    private Ui() {
    }

    /* ------------------------------------------------------------- metrics */

    static int dp(Context context, float value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, value, context.getResources().getDisplayMetrics()));
    }

    static float sp(Context context, float value) {
        return TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_SP, value, context.getResources().getDisplayMetrics());
    }

    static LinearLayout.LayoutParams lp(int width, int height) {
        return new LinearLayout.LayoutParams(width, height);
    }

    static LinearLayout.LayoutParams lp(int width, int height, float weight) {
        return new LinearLayout.LayoutParams(width, height, weight);
    }

    /* -------------------------------------------------------------- fonts */

    static synchronized Typeface font(Context context, int weight) {
        if (regular == null) {
            regular = Typeface.createFromAsset(context.getAssets(), "fonts/Inter-Regular.ttf");
            medium = Typeface.createFromAsset(context.getAssets(), "fonts/Inter-Medium.ttf");
            semibold = Typeface.createFromAsset(context.getAssets(), "fonts/Inter-SemiBold.ttf");
            bold = Typeface.createFromAsset(context.getAssets(), "fonts/Inter-Bold.ttf");
            display = Typeface.createFromAsset(context.getAssets(), "fonts/InterDisplay-Bold.ttf");
        }
        switch (weight) {
            case W_MEDIUM:
                return medium;
            case W_SEMIBOLD:
                return semibold;
            case W_BOLD:
                return bold;
            case W_DISPLAY:
                return display;
            default:
                return regular;
        }
    }

    /* --------------------------------------------------------------- text */

    static TextView text(Context context, CharSequence value, float sizeSp, int color, int weight) {
        TextView view = new TextView(context);
        view.setText(value);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp);
        view.setTextColor(color);
        view.setTypeface(font(context, weight));
        view.setIncludeFontPadding(false);
        view.setLineSpacing(sp(context, 3f), 1f);
        return view;
    }

    /* ------------------------------------------------------------ surfaces */

    static GradientDrawable round(Context context, int color, float radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        drawable.setColor(color);
        drawable.setCornerRadius(dp(context, radiusDp));
        return drawable;
    }

    static GradientDrawable roundStroke(Context context, int color, float radiusDp, int strokeColor) {
        GradientDrawable drawable = round(context, color, radiusDp);
        drawable.setStroke(Math.max(1, dp(context, 1f)), strokeColor);
        return drawable;
    }

    static GradientDrawable ctaBackground(Context context) {
        GradientDrawable drawable = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{0xFF22D3EE, 0xFF2F6BFF, 0xFF4F46E5});
        drawable.setCornerRadius(dp(context, 12f));
        return drawable;
    }

    /** Ripple wrapper so every tappable surface answers the touch. */
    static Drawable ripple(Drawable content, int rippleColor) {
        return new RippleDrawable(ColorStateList.valueOf(rippleColor), content, null);
    }

    /* ------------------------------------------------------------ widgets */

    /** Standard card: 16dp radius, hairline border, 16dp inner padding. */
    static LinearLayout card(Context context) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(roundStroke(context, SURFACE, 16f, LINE));
        int p = dp(context, 16f);
        card.setPadding(p, p, p, p);
        return card;
    }

    /** 12dp radius inset surface (inputs, inner rows). */
    static LinearLayout inset(Context context) {
        LinearLayout box = new LinearLayout(context);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setBackground(roundStroke(context, SURFACE_2, 12f, LINE));
        int p = dp(context, 14f);
        box.setPadding(p, p, p, p);
        return box;
    }

    static TextView primaryButton(Context context, CharSequence label) {
        TextView button = text(context, label, 15f, Color.WHITE, W_SEMIBOLD);
        button.setGravity(Gravity.CENTER);
        button.setBackground(ripple(ctaBackground(context), 0x33FFFFFF));
        button.setPadding(dp(context, 18f), dp(context, 15f), dp(context, 18f), dp(context, 15f));
        button.setClickable(true);
        button.setFocusable(true);
        return button;
    }

    static TextView secondaryButton(Context context, CharSequence label) {
        TextView button = text(context, label, 14f, TEXT, W_MEDIUM);
        button.setGravity(Gravity.CENTER);
        button.setBackground(ripple(roundStroke(context, SURFACE_2, 12f, LINE_STRONG), 0x22FFFFFF));
        button.setPadding(dp(context, 16f), dp(context, 13f), dp(context, 16f), dp(context, 13f));
        button.setClickable(true);
        button.setFocusable(true);
        return button;
    }

    static TextView ghostButton(Context context, CharSequence label) {
        TextView button = text(context, label, 14f, TEXT_2, W_MEDIUM);
        button.setGravity(Gravity.CENTER);
        button.setBackground(ripple(round(context, Color.TRANSPARENT, 12f), 0x1AFFFFFF));
        button.setPadding(dp(context, 12f), dp(context, 10f), dp(context, 12f), dp(context, 10f));
        button.setClickable(true);
        button.setFocusable(true);
        return button;
    }

    static TextView pill(Context context, CharSequence label, int color) {
        TextView pill = text(context, label, 11f, color, W_SEMIBOLD);
        pill.setGravity(Gravity.CENTER);
        int solid = (color & 0x00FFFFFF) | 0x1A000000;
        GradientDrawable bg = roundStroke(context, solid, 999f, (color & 0x00FFFFFF) | 0x55000000);
        pill.setBackground(bg);
        pill.setPadding(dp(context, 10f), dp(context, 5f), dp(context, 10f), dp(context, 5f));
        return pill;
    }

    static ImageView icon(Context context, int drawableRes, int tint, float sizeDp) {
        ImageView view = new ImageView(context);
        view.setImageResource(drawableRes);
        view.setColorFilter(tint);
        view.setLayoutParams(lp(dp(context, sizeDp), dp(context, sizeDp)));
        view.setScaleType(ImageView.ScaleType.FIT_CENTER);
        return view;
    }

    /**
     * Bitmap-backed art bundled in the APK (hero banners, empty states).
     *
     * The APK ships these as uncompressed assets so AssetManager can mmap
     * them; a missing file simply returns null so the caller can fall back to
     * a vector drawable instead of crashing.
     */
    static android.graphics.Bitmap art(Context context, String path) {
        java.io.InputStream stream = null;
        try {
            stream = context.getAssets().open(path);
            return android.graphics.BitmapFactory.decodeStream(stream);
        } catch (Exception ignored) {
            return null;
        } finally {
            if (stream != null) {
                try {
                    stream.close();
                } catch (Exception ignored) {
                    // Nothing to do.
                }
            }
        }
    }

    /** Rounded, crop-filled art view sized in dp; falls back to a drawable. */
    static ImageView artView(Context context, String path, int fallbackRes, float heightDp, float radiusDp) {
        ImageView view = new ImageView(context);
        android.graphics.Bitmap bitmap = art(context, path);
        if (bitmap != null) {
            view.setImageBitmap(bitmap);
        } else if (fallbackRes != 0) {
            view.setImageResource(fallbackRes);
        }
        view.setScaleType(ImageView.ScaleType.CENTER_CROP);
        view.setBackground(round(context, SURFACE_2, radiusDp));
        view.setClipToOutline(true);
        view.setLayoutParams(lp(LinearLayout.LayoutParams.MATCH_PARENT, dp(context, heightDp)));
        return view;
    }

    static TextView spacer(Context context, float heightDp) {
        TextView view = new TextView(context);
        view.setLayoutParams(lp(1, dp(context, heightDp)));
        return view;
    }

    static View divider(Context context) {
        View view = new View(context);
        view.setBackgroundColor(LINE);
        view.setLayoutParams(lp(LinearLayout.LayoutParams.MATCH_PARENT, Math.max(1, dp(context, 1f))));
        return view;
    }

    static String formatBytes(long bytes) {
        if (bytes <= 0) return "";
        if (bytes < 1024) return bytes + " B";
        double kb = bytes / 1024.0;
        if (kb < 1024) return String.format("%.0f KB", kb);
        double mb = kb / 1024.0;
        if (mb < 1024) return String.format("%.1f MB", mb);
        return String.format("%.2f GB", mb / 1024.0);
    }

    static String formatDuration(int seconds) {
        if (seconds <= 0) return "";
        int m = seconds / 60;
        int s = seconds % 60;
        return String.format("%d:%02d", m, s);
    }
}
