package io.ionic.starter;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Capacitor plugin to copy files from content:// URIs to the app's cache directory.
 * This is needed because the Filesystem plugin cannot directly read content:// URIs.
 *
 * Declares READ_MEDIA_AUDIO (Android 13+) and READ_EXTERNAL_STORAGE (Android 6-12)
 * so the permission dialog can be triggered if needed.  In normal usage through
 * the file picker (ACTION_GET_CONTENT) the system already grants temporary URI
 * access, so the permission dialog is rarely shown.
 */
@CapacitorPlugin(
    name = "ContentCopy",
    permissions = {
        @Permission(
            alias = "audioMedia",
            strings = {
                Manifest.permission.READ_MEDIA_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE
            }
        )
    }
)
public class ContentCopyPlugin extends Plugin {

    /**
     * Check whether the app has the required storage/audio permission.
     * If not, request it.  Call this BEFORE opening the file picker so that
     * the permission is already granted when the user selects a file.
     *
     * Returns { granted: true } if permission is (or was just) granted,
     * or rejects if the user denied it.
     */
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context is null");
            return;
        }

        if (hasStoragePermission(ctx)) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        // Permission not yet granted — request it.
        // The callback (permissionCheckCallback) will resolve/reject the saved call.
        requestPermissionForAlias("audioMedia", call, "permissionCheckCallback");
    }

    /**
     * Callback for the permission request triggered by {@link #checkPermissions}.
     */
    @PermissionCallback
    private void permissionCheckCallback(PluginCall call) {
        if (call == null) {
            return;
        }

        Context ctx = getContext();
        JSObject result = new JSObject();
        if (ctx != null && hasStoragePermission(ctx)) {
            result.put("granted", true);
            call.resolve(result);
        } else {
            call.reject("Storage/audio permission denied");
        }
    }

    /**
     * Copy a file from a content:// URI to the app's cache directory.
     * Returns the relative path in the cache directory.
     */
    @PluginMethod
    public void copyToCache(PluginCall call) {
        String sourceUri = call.getString("uri");
        String subdirectory = call.getString("subdirectory", "imported_sounds");

        if (sourceUri == null || sourceUri.isEmpty()) {
            call.reject("Missing 'uri' parameter");
            return;
        }

        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Context is null");
            return;
        }

        // On Android 6+ we may need a runtime permission to read from the URI.
        // In the normal file-picker flow the OS already grants temporary access,
        // but if the plugin is called with an external URI we ask explicitly.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !hasStoragePermission(ctx)) {
            // Save the call so the callback can resume it after the permission dialog.
            requestPermissionForAlias("audioMedia", call, "permissionCallback");
            return;
        }

        performCopy(call, ctx, sourceUri, subdirectory);
    }

    /**
     * Callback invoked after the system permission dialog is dismissed.
     * If the user granted the permission we retry the copy; otherwise we reject.
     */
    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (call == null) {
            return;
        }

        Context ctx = getContext();
        if (ctx == null || !hasStoragePermission(ctx)) {
            call.reject("Storage/audio permission is required to read this file");
            return;
        }

        String sourceUri = call.getString("uri");
        String subdirectory = call.getString("subdirectory", "imported_sounds");
        performCopy(call, ctx, sourceUri, subdirectory);
    }

    // -------------------------------------------------------------------------
    // Core copy logic
    // -------------------------------------------------------------------------

    private void performCopy(PluginCall call, Context ctx, String sourceUri, String subdirectory) {
        try {
            Uri uri = Uri.parse(sourceUri);

            // Get the original filename from the content provider
            String fileName = getFileName(ctx, uri);
            if (fileName == null) {
                fileName = "imported_audio_" + System.currentTimeMillis() + ".mp3";
            }

            // Generate a unique filename to avoid collisions
            String uniqueName = System.currentTimeMillis() + "_" + fileName;
            File cacheDir = new File(ctx.getCacheDir(), subdirectory);
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }
            File targetFile = new File(cacheDir, uniqueName);

            // Copy the file using ContentResolver
            InputStream inputStream = ctx.getContentResolver().openInputStream(uri);
            if (inputStream == null) {
                call.reject("Could not open input stream for URI: " + sourceUri);
                return;
            }

            OutputStream outputStream = new FileOutputStream(targetFile);
            byte[] buffer = new byte[4096];
            int bytesRead;
            long totalBytes = 0;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }

            inputStream.close();
            outputStream.close();

            // Return both relative and absolute paths
            String relativePath = subdirectory + "/" + uniqueName;
            String absolutePath = targetFile.getAbsolutePath();
            JSObject result = new JSObject();
            result.put("path", relativePath);
            result.put("absolutePath", absolutePath);
            result.put("fileName", fileName);
            result.put("size", totalBytes);

            call.resolve(result);

        } catch (SecurityException e) {
            call.reject("Permission denied to read URI: " + sourceUri);
        } catch (Exception e) {
            call.reject("Error copying file: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Check whether the app already holds the appropriate storage permission.
     * On Android 13+ (API 33) this checks READ_MEDIA_AUDIO;
     * on older versions it checks READ_EXTERNAL_STORAGE.
     */
    private boolean hasStoragePermission(Context ctx) {
        String permission;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permission = Manifest.permission.READ_MEDIA_AUDIO;
        } else {
            permission = Manifest.permission.READ_EXTERNAL_STORAGE;
        }
        return ContextCompat.checkSelfPermission(ctx, permission) == PackageManager.PERMISSION_GRANTED;
    }

    /**
     * Get the display name (filename) from a content:// URI.
     */
    private String getFileName(Context ctx, Uri uri) {
        String fileName = null;

        if ("content".equals(uri.getScheme())) {
            Cursor cursor = ctx.getContentResolver().query(uri, null, null, null, null);
            if (cursor != null) {
                try {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0 && cursor.moveToFirst()) {
                        fileName = cursor.getString(nameIndex);
                    }
                } finally {
                    cursor.close();
                }
            }
        }

        if (fileName == null) {
            fileName = uri.getPath();
            if (fileName != null) {
                int cut = fileName.lastIndexOf('/');
                if (cut != -1) {
                    fileName = fileName.substring(cut + 1);
                }
            }
        }

        return fileName;
    }
}
