package io.ionic.starter;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin for native vibration on Android.
 *
 * Uses the Android Vibrator system service directly, which works
 * reliably both in foreground and background (as long as the app
 * has a Foreground Service running).
 *
 * Supports:
 * - Pattern vibration: array of timings [vibrate_ms, pause_ms, ...]
 * - Single pulse: vibrate for a fixed duration
 * - Stop: cancel any ongoing vibration
 */
@CapacitorPlugin(name = "Vibration")
public class VibrationPlugin extends Plugin {

    private Vibrator vibrator;
    private static final String TAG = "VibrationPlugin";

    /**
     * Get the Vibrator service instance with null safety.
     * Returns null if the context or vibrator service is unavailable.
     */
    private Vibrator getVibrator() {
        if (vibrator != null) {
            return vibrator;
        }

        Context ctx = getContext();
        if (ctx == null) {
            android.util.Log.e(TAG, "getContext() returned null");
            return null;
        }

        android.util.Log.d(TAG, "Getting Vibrator service...");
        android.util.Log.d(TAG, "Android SDK version: " + Build.VERSION.SDK_INT);
        android.util.Log.d(TAG, "VERSION_CODES.S = " + Build.VERSION_CODES.S);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                android.util.Log.d(TAG, "Using VibratorManager (Android 12+)");
                VibratorManager vm = (VibratorManager)
                    ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vibrator = vm.getDefaultVibrator();
                    android.util.Log.d(TAG, "Got Vibrator from VibratorManager");
                } else {
                    android.util.Log.e(TAG, "VibratorManager is null");
                }
            } else {
                android.util.Log.d(TAG, "Using legacy Vibrator service");
                vibrator = (Vibrator)
                    ctx.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null) {
                    android.util.Log.d(TAG, "Got Vibrator from legacy service");
                } else {
                    android.util.Log.e(TAG, "Legacy Vibrator service is null");
                }
            }
        } catch (Exception e) {
            android.util.Log.e(TAG, "Failed to get Vibrator service", e);
            return null;
        }

        return vibrator;
    }

    /**
     * Vibrate with a custom pattern.
     * The array contains timings in ms: [vibrate, pause, vibrate, ...].
     * The first value is always vibration duration (no initial pause).
     *
     * Runs on the main thread to avoid threading issues with the Vibrator API.
     */
    @PluginMethod
    public void vibrate(PluginCall call) {
        android.util.Log.d(TAG, "vibrate() method called");

        Vibrator v = getVibrator();
        if (v == null) {
            android.util.Log.e(TAG, "Vibrator is null, rejecting call");
            call.reject("Device does not support vibration - Vibrator service unavailable");
            return;
        }

        if (!v.hasVibrator()) {
            android.util.Log.e(TAG, "Device does not have vibration hardware");
            call.reject("Device does not support vibration hardware");
            return;
        }

        JSArray patternArray = call.getArray("pattern");
        if (patternArray == null || patternArray.length() == 0) {
            android.util.Log.e(TAG, "Pattern array is null or empty");
            call.reject("Missing 'pattern' array");
            return;
        }

        android.util.Log.d(TAG, "Pattern array length: " + patternArray.length());

        try {
            long[] timings = new long[patternArray.length()];
            for (int i = 0; i < patternArray.length(); i++) {
                timings[i] = patternArray.getLong(i);
                android.util.Log.d(TAG, "Pattern[" + i + "] = " + timings[i] + "ms");
            }

            // Run vibration on the main thread to prevent threading issues
            final Vibrator vibratorInstance = v;
            final long[] finalTimings = timings;
            Runnable vibrationRunnable = new Runnable() {
                @Override
                public void run() {
                    try {
                        android.util.Log.d(TAG, "Executing vibration on main thread...");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            android.util.Log.d(TAG, "Using VibrationEffect.createWaveform (Android 8+)");
                            // createWaveform with repeat=-1: vibrate the pattern once
                            vibratorInstance.vibrate(
                                VibrationEffect.createWaveform(finalTimings, -1)
                            );
                        } else {
                            android.util.Log.d(TAG, "Using legacy vibrate method");
                            vibratorInstance.vibrate(finalTimings, -1);
                        }
                        android.util.Log.d(TAG, "Vibration started successfully");
                    } catch (Exception e) {
                        android.util.Log.e(TAG, "Vibration execution failed", e);
                    }
                }
            };

            // Execute on main thread
            if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
                android.util.Log.d(TAG, "Already on main thread, executing directly");
                vibrationRunnable.run();
            } else {
                android.util.Log.d(TAG, "Not on main thread, posting to main thread");
                new android.os.Handler(android.os.Looper.getMainLooper()).post(vibrationRunnable);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            android.util.Log.e(TAG, "vibrate() failed with exception", e);
            call.reject("Vibration failed: " + e.getMessage());
        }
    }

    /**
     * Vibrate once with a fixed duration in milliseconds.
     * Runs on the main thread to avoid threading issues.
     */
    @PluginMethod
    public void vibrateOnce(PluginCall call) {
        android.util.Log.d(TAG, "vibrateOnce() method called");

        Vibrator v = getVibrator();
        if (v == null) {
            android.util.Log.e(TAG, "Vibrator is null, rejecting call");
            call.reject("Device does not support vibration - Vibrator service unavailable");
            return;
        }

        if (!v.hasVibrator()) {
            android.util.Log.e(TAG, "Device does not have vibration hardware");
            call.reject("Device does not support vibration hardware");
            return;
        }

        int duration = call.getInt("duration", 300);
        android.util.Log.d(TAG, "vibrateOnce duration: " + duration + "ms");

        try {
            final Vibrator vibratorInstance = v;
            final int finalDuration = duration;
            Runnable vibrationRunnable = new Runnable() {
                @Override
                public void run() {
                    try {
                        android.util.Log.d(TAG, "Executing vibrateOnce on main thread...");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            android.util.Log.d(TAG, "Using VibrationEffect.createOneShot (Android 8+)");
                            vibratorInstance.vibrate(
                                VibrationEffect.createOneShot(
                                    finalDuration,
                                    VibrationEffect.DEFAULT_AMPLITUDE
                                )
                            );
                        } else {
                            android.util.Log.d(TAG, "Using legacy vibrate method");
                            vibratorInstance.vibrate(finalDuration);
                        }
                        android.util.Log.d(TAG, "vibrateOnce started successfully");
                    } catch (Exception e) {
                        android.util.Log.e(TAG, "vibrateOnce execution failed", e);
                    }
                }
            };

            // Execute on main thread
            if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
                android.util.Log.d(TAG, "Already on main thread, executing directly");
                vibrationRunnable.run();
            } else {
                android.util.Log.d(TAG, "Not on main thread, posting to main thread");
                new android.os.Handler(android.os.Looper.getMainLooper()).post(vibrationRunnable);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            android.util.Log.e(TAG, "vibrateOnce() failed with exception", e);
            call.reject("Vibration failed: " + e.getMessage());
        }
    }

    /**
     * Stop any ongoing vibration.
     * Runs on the main thread for consistency.
     */
    @PluginMethod
    public void stopVibration(PluginCall call) {
        android.util.Log.d(TAG, "stopVibration() method called");

        Vibrator v = getVibrator();
        if (v != null) {
            try {
                final Vibrator vibratorInstance = v;
                Runnable stopRunnable = new Runnable() {
                    @Override
                    public void run() {
                        try {
                            android.util.Log.d(TAG, "Executing stopVibration on main thread...");
                            vibratorInstance.cancel();
                            android.util.Log.d(TAG, "stopVibration completed successfully");
                        } catch (Exception e) {
                            android.util.Log.e(TAG, "Stop vibration failed", e);
                        }
                    }
                };

                // Execute on main thread
                if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) {
                    android.util.Log.d(TAG, "Already on main thread, executing directly");
                    stopRunnable.run();
                } else {
                    android.util.Log.d(TAG, "Not on main thread, posting to main thread");
                    new android.os.Handler(android.os.Looper.getMainLooper()).post(stopRunnable);
                }
            } catch (Exception e) {
                android.util.Log.e(TAG, "Error stopping vibration", e);
            }
        } else {
            android.util.Log.w(TAG, "Vibrator is null, cannot stop vibration");
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
