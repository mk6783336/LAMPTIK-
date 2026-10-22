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
 * Fonts and bitmap art are STORED (uncompressed) so AssetManager can mmap
 * them directly instead of inflating a multi-hundred-KB TTF on the UI
 * thread; `zipalign -p 4` then page-aligns them in the build script.
 *
 * Usage: java PackAssets <base.apk> <out.apk> <assetsDir> <classes.dex>
 */
public final class PackAssets {

    private static final String[] STORED_SUFFIXES = {".ttf", ".otf", ".png", ".webp", ".mp3"};

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

        try (ZipFile in = new ZipFile(base.toFile());
             ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(out))) {
            zip.setLevel(9);
            Enumeration<? extends ZipEntry> entries = in.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                if (!entry.isDirectory() && additions.containsKey(entry.getName())) {
                    continue; // re-added below with the canonical name
                }
                zip.putNextEntry(new ZipEntry(entry.getName()));
                if (!entry.isDirectory()) {
                    try (InputStream stream = in.getInputStream(entry)) {
                        copy(stream, zip);
                    }
                }
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

        System.out.println("packed " + additions.size() + " entries -> " + out
                + " (" + Files.size(out) + " bytes)");
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
