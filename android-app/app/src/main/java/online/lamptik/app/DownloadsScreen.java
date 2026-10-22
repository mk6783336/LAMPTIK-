package online.lamptik.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * Native "My Downloads" screen.
 *
 * Source of truth is Android's own DownloadManager, so the list stays correct
 * across app restarts, force-stops and downloads started from the share sheet.
 * Play/Share act on the manager's content:// URI with a one-shot read grant —
 * no FileProvider, no copied files.
 */
final class DownloadsScreen extends LinearLayout {

    private final Context context;
    private final ListView list;
    private final LinearLayout empty;
    private final Adapter adapter = new Adapter();
    private final List<Entry> entries = new ArrayList<>();

    DownloadsScreen(Context context) {
        super(context);
        this.context = context;
        setOrientation(VERTICAL);
        setBackgroundColor(Ui.BG);

        LinearLayout header = new LinearLayout(context);
        header.setOrientation(HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        int pad = Ui.dp(context, 16f);
        header.setPadding(pad, Ui.dp(context, 12f), pad, Ui.dp(context, 4f));

        LinearLayout titles = new LinearLayout(context);
        titles.setOrientation(VERTICAL);
        titles.addView(Ui.text(context, "My Downloads", 24f, Ui.TEXT, Ui.W_DISPLAY));
        TextView sub = Ui.text(context, "Saved on this device by Android", 12f, Ui.TEXT_2, Ui.W_REGULAR);
        LinearLayout.LayoutParams subLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        subLp.topMargin = Ui.dp(context, 2f);
        titles.addView(sub, subLp);
        header.addView(titles, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));

        LinearLayout refreshBox = new LinearLayout(context);
        refreshBox.setOrientation(HORIZONTAL);
        refreshBox.setGravity(Gravity.CENTER_VERTICAL);
        refreshBox.setBackground(Ui.ripple(Ui.roundStroke(context, Ui.SURFACE_2, 12f, Ui.LINE), 0x22FFFFFF));
        refreshBox.setPadding(Ui.dp(context, 10f), Ui.dp(context, 9f), Ui.dp(context, 10f), Ui.dp(context, 9f));
        refreshBox.addView(Ui.icon(context, R.drawable.ic_refresh, Ui.TEXT_2, 16f));
        refreshBox.setOnClickListener(new OnClickListener() {
            @Override
            public void onClick(View v) {
                refresh();
            }
        });
        header.addView(refreshBox);
        addView(header, Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        empty = new LinearLayout(context);
        empty.setOrientation(VERTICAL);
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(pad, Ui.dp(context, 20f), pad, pad);
        ImageView art = new ImageView(context);
        android.graphics.Bitmap artBitmap = Ui.art(context, "art/empty_downloads.png");
        if (artBitmap != null) {
            art.setImageBitmap(artBitmap);
            art.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        } else {
            art.setImageResource(R.drawable.empty_state);
        }
        art.setAdjustViewBounds(true);
        empty.addView(art, Ui.lp(LayoutParams.MATCH_PARENT, Ui.dp(context, 190f)));
        empty.addView(Ui.text(context, context.getString(R.string.empty_title), 16f, Ui.TEXT, Ui.W_SEMIBOLD));
        TextView body = Ui.text(context, context.getString(R.string.empty_body), 13f, Ui.TEXT_2, Ui.W_REGULAR);
        body.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams bodyLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        bodyLp.topMargin = Ui.dp(context, 6f);
        empty.addView(body, bodyLp);

        list = new ListView(context);
        list.setDivider(null);
        list.setDividerHeight(0);
        list.setPadding(pad, 0, pad, Ui.dp(context, 16f));
        list.setClipToPadding(false);
        list.setSelector(android.R.color.transparent);
        list.setAdapter(adapter);

        addView(list, Ui.lp(LayoutParams.MATCH_PARENT, 0, 1f));
        addView(empty, Ui.lp(LayoutParams.MATCH_PARENT, 0, 1f));
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        refresh();
    }

    /** Re-query the system download manager. */
    void refresh() {
        entries.clear();
        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager != null) {
            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterByStatus(
                    DownloadManager.STATUS_SUCCESSFUL
                            | DownloadManager.STATUS_RUNNING
                            | DownloadManager.STATUS_PENDING
                            | DownloadManager.STATUS_PAUSED
                            | DownloadManager.STATUS_FAILED);
            Cursor cursor = null;
            try {
                cursor = manager.query(query);
                if (cursor != null) {
                    int idCol = cursor.getColumnIndex(DownloadManager.COLUMN_ID);
                    int titleCol = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
                    int statusCol = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                    int soFarCol = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                    int totalCol = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                    int mimeCol = cursor.getColumnIndex("mimetype");
                    int dateCol = cursor.getColumnIndex(DownloadManager.COLUMN_LAST_MODIFIED_TIMESTAMP);
                    while (cursor.moveToNext()) {
                        Entry entry = new Entry();
                        entry.id = cursor.getLong(idCol);
                        entry.title = cursor.getString(titleCol);
                        entry.status = cursor.getInt(statusCol);
                        entry.bytes = cursor.getLong(soFarCol);
                        entry.total = cursor.getLong(totalCol);
                        entry.mime = mimeCol >= 0 ? cursor.getString(mimeCol) : null;
                        entry.timestamp = dateCol >= 0 ? cursor.getLong(dateCol) : 0L;
                        if (TextUtils.isEmpty(entry.mime)) entry.mime = "video/mp4";
                        entries.add(entry);
                    }
                }
            } catch (Exception ignored) {
                // A denied or empty query simply shows the empty state.
            } finally {
                if (cursor != null) cursor.close();
            }
        }

        boolean hasItems = !entries.isEmpty();
        list.setVisibility(hasItems ? VISIBLE : GONE);
        empty.setVisibility(hasItems ? GONE : VISIBLE);
        adapter.notifyDataSetChanged();
    }

    private static final class Entry {
        long id;
        String title;
        String mime;
        int status;
        long bytes;
        long total;
        long timestamp;
    }

    private final class Adapter extends BaseAdapter {
        @Override
        public int getCount() {
            return entries.size();
        }

        @Override
        public Object getItem(int position) {
            return entries.get(position);
        }

        @Override
        public long getItemId(int position) {
            return entries.get(position).id;
        }

        @Override
        public View getView(int position, View recycled, ViewGroup parent) {
            final Entry entry = entries.get(position);

            LinearLayout row;
            if (recycled instanceof LinearLayout) {
                row = (LinearLayout) recycled;
            } else {
                row = new LinearLayout(context);
                row.setOrientation(VERTICAL);
                row.setBackground(Ui.roundStroke(context, Ui.SURFACE, 16f, Ui.LINE));
                int p = Ui.dp(context, 14f);
                row.setPadding(p, p, p, p);
            }
            row.removeAllViews();

            LinearLayout top = new LinearLayout(context);
            top.setOrientation(HORIZONTAL);
            top.setGravity(Gravity.CENTER_VERTICAL);

            LinearLayout text = new LinearLayout(context);
            text.setOrientation(VERTICAL);
            TextView name = Ui.text(context, entry.title == null ? "Video" : entry.title, 14f, Ui.TEXT, Ui.W_SEMIBOLD);
            name.setSingleLine(true);
            name.setEllipsize(TextUtils.TruncateAt.END);
            text.addView(name);

            String state = statusLabel(entry);
            TextView meta = Ui.text(context, state, 12f, statusColor(entry.status), Ui.W_REGULAR);
            LinearLayout.LayoutParams metaLp = Ui.lp(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            metaLp.topMargin = Ui.dp(context, 3f);
            text.addView(meta, metaLp);

            top.addView(text, Ui.lp(0, LayoutParams.WRAP_CONTENT, 1f));
            top.addView(Ui.pill(context, entry.mime.startsWith("audio") ? "MP3" : "MP4",
                    entry.mime.startsWith("audio") ? Ui.AMBER : Ui.ACCENT_INK));
            row.addView(top);

            if (entry.status == DownloadManager.STATUS_SUCCESSFUL) {
                LinearLayout actions = new LinearLayout(context);
                actions.setOrientation(HORIZONTAL);
                LinearLayout.LayoutParams actionsLp = Ui.lp(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
                actionsLp.topMargin = Ui.dp(context, 10f);
                row.addView(actions, actionsLp);

                TextView play = Ui.secondaryButton(context, "▶  Play");
                actions.addView(play, Ui.lp(0, Ui.dp(context, 44f), 1f));
                play.setOnClickListener(new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        openEntry(entry);
                    }
                });

                TextView share = Ui.secondaryButton(context, "Share");
                LinearLayout.LayoutParams shareLp = Ui.lp(0, Ui.dp(context, 44f), 1f);
                shareLp.leftMargin = Ui.dp(context, 8f);
                actions.addView(share, shareLp);
                share.setOnClickListener(new OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        shareEntry(entry);
                    }
                });
            }

            LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                    LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            rowLp.bottomMargin = Ui.dp(context, 10f);
            row.setLayoutParams(rowLp);
            return row;
        }

        private String statusLabel(Entry entry) {
            switch (entry.status) {
                case DownloadManager.STATUS_SUCCESSFUL:
                    return Ui.formatBytes(entry.total > 0 ? entry.total : entry.bytes) + " · saved";
                case DownloadManager.STATUS_RUNNING:
                    int percent = entry.total > 0
                            ? (int) (entry.bytes * 100 / entry.total)
                            : 0;
                    return "Downloading… " + percent + "%";
                case DownloadManager.STATUS_PAUSED:
                    return "Paused";
                case DownloadManager.STATUS_FAILED:
                    return "Failed — try again";
                default:
                    return "Queued";
            }
        }

        private int statusColor(int status) {
            switch (status) {
                case DownloadManager.STATUS_SUCCESSFUL:
                    return Ui.OK;
                case DownloadManager.STATUS_FAILED:
                    return Ui.ERR;
                case DownloadManager.STATUS_PAUSED:
                    return Ui.WARN;
                default:
                    return Ui.TEXT_2;
            }
        }
    }

    private Uri uriFor(Entry entry) {
        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return null;
        try {
            return manager.getUriForDownloadedFile(entry.id);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void openEntry(Entry entry) {
        Uri uri = uriFor(entry);
        if (uri == null) {
            notifyUser("That file is no longer on this device.");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, entry.mime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception error) {
            notifyUser("No app can open this file on your device.");
        }
    }

    private void shareEntry(Entry entry) {
        Uri uri = uriFor(entry);
        if (uri == null) {
            notifyUser("That file is no longer on this device.");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(entry.mime);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(Intent.createChooser(intent, "Share download"));
        } catch (Exception error) {
            notifyUser("Sharing failed on this device.");
        }
    }

    private void notifyUser(String message) {
        if (context instanceof MainActivity) ((MainActivity) context).toast(message);
    }
}
