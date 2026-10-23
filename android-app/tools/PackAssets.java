import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * Packs an Android APK without depending on the `zip` binary.
 *
 * aapt2 on Windows writes asset entry names with the OS separator
 * (`assets/fonts\Inter-Bold.ttf`), which AssetManager cannot open at runtime.
 * This packer copies the aapt2 output and re-adds every asset from
 * `app/src/main/assets` with a canonical forward-slash name, plus
 * `classes.dex`.
 *
 * CRITICAL — Android 11–15 package-parser hard requirements:
 *   • `resources.arsc` MUST be STORED (0% compression). A deflated arsc makes
 *     the package installer reject the APK outright with "App not installed."
 *     This packer therefore PRESERVES each source entry's compression method
 *     instead of re-creating every entry with the ZipOutputStream DEFLATED
 *     default, which silently recompressed `resources.arsc` in v3.1–v3.4 and
 *     broke installs on Android 11+.
 *   • fonts/bitmaps stay STORED so AssetManager can mmap them directly.
 * `zipalign -p -f 4` in the build script then 4-byte/page-aligns the stored
 * entries — and it MUST run BEFORE `apksigner sign`, never after.
 *
 * Usage: java PackAssets <base.apk> <out.apk> <assetsDir> <classes.dex>
 */
public final class PackAssets {

    private static final String[] STORED_SUFFIXES = {".ttf", ".otf", ".png", ".webp", ".mp3"};

    /** The one entry Android's parser refuses to accept compressed. */
    private static final String ARSC = "resources.arsc";

    public static void main(String[] args) throws IOException {
        if (args.length < 4) {
            System.err.println("usage: PackAssets <base.apk> <out.apk> <assetsDir> <classes.dex>");
            System.exit(2);
        }
        Path base = Paths.get(args[0]);
        Path out = Paths.get(args[1]);
        Path assetsDir = Paths.get(args[2]);
        Path dex = Paths.get(args[3]);

        // name -> source file, in a stable order (fonts, art, then everything else).
        Map<String, Path> additions = new LinkedHashMap<>();
        if (Files.isDirectory(assetsDir)) {
            List<Path> files = new ArrayList<>();
            try (Stream<Path> walk = Files.walk(assetsDir)) {
                walk.filter(Files::isRegularFile).forEach(files::add);
            }
            files.sort((a, b) -> assetsDir.relativize(a).toString()
                    .compareToIgnoreCase(assetsDir.relativize(b).toString()));
            for (Path file : files) {
                String name = "assets/" + assetsDir.relativize(file).toString().replace('\\', '/');
                additions.put(name, file);
            }
        }
        additions.put("classes.dex", dex);

        int storedPreserved = 0;
        try (ZipFile in = new ZipFile(base.toFile());
             ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(out))) {
            zip.setLevel(9);
            Enumeration<? extends ZipEntry> entries = in.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                if (!entry.isDirectory() && additions.containsKey(entry.getName())) {
                    continue; // re-added below with the canonical name
                }
                if (entry.isDirectory()) {
                    zip.putNextEntry(new ZipEntry(entry.getName()));
                    zip.closeEntry();
                    continue;
                }

                boolean keepStored = entry.getMethod() == ZipEntry.STORED
                        // Belt and braces: if any toolchain ever emits the arsc
                        // deflated, force it back to STORED anyway.
                        || ARSC.equals(entry.getName());
                byte[] content = readAll(in, entry);

                ZipEntry outEntry = new ZipEntry(entry.getName());
                outEntry.setTime(entry.getTime());
                if (keepStored) {
                    // For a STORED entry getInputStream() yields the raw
                    // uncompressed content, so sizes and CRC stay valid.
                    CRC32 crc = new CRC32();
                    crc.update(content);
                    outEntry.setMethod(ZipEntry.STORED);
                    outEntry.setSize(content.length);
                    outEntry.setCompressedSize(content.length);
                    outEntry.setCrc(crc.getValue());
                    storedPreserved += 1;
                }
                zip.putNextEntry(outEntry);
                zip.write(content);
                zip.closeEntry();
            }

            for (Map.Entry<String, Path> addition : additions.entrySet()) {
                byte[] bytes = Files.readAllBytes(addition.getValue());
                ZipEntry entry = new ZipEntry(addition.getKey());
                entry.setTime(0L);
                if (stored(addition.getKey())) {
                    CRC32 crc = new CRC32();
                    crc.update(bytes);
                    entry.setMethod(ZipEntry.STORED);
                    entry.setSize(bytes.length);
                    entry.setCompressedSize(bytes.length);
                    entry.setCrc(crc.getValue());
                } else {
                    entry.setMethod(ZipEntry.DEFLATED);
                }
                zip.putNextEntry(entry);
                zip.write(bytes);
                zip.closeEntry();
            }
        }

        System.out.println("packed " + additions.size() + " entries (" + storedPreserved
                + " stored preserved) -> " + out + " (" + Files.size(out) + " bytes)");
    }

    /**
     * Fully materialize one source entry. STORED entries may report size 0 in
     * rare toolchains, so never trust `entry.getSize()` for a copy — buffer
     * the content and measure it.
     */
    private static byte[] readAll(ZipFile file, ZipEntry entry) throws IOException {
        try (InputStream stream = file.getInputStream(entry)) {
            var buffer = new java.io.ByteArrayOutputStream(Math.max(64, (int) Math.min(entry.getSize(), Integer.MAX_VALUE)));
            copy(stream, buffer);
            return buffer.toByteArray();
        }
    }

    private static boolean stored(String name) {
        for (String suffix : STORED_SUFFIXES) {
            if (name.endsWith(suffix)) return true;
        }
        return false;
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = in.read(buffer)) > 0) {
            out.write(buffer, 0, read);
        }
    }
}
