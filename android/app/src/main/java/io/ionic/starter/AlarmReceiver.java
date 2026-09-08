package io.ionic.starter;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

/**
 * Receiver that handles periodic battery check alarms.
 *
 * This receiver is triggered by AlarmManager every 15 minutes (or when
 * setExactAndAllowWhileIdle fires during Doze mode). Its responsibilities:
 *
 * 1. Acquire a wake lock to ensure CPU stays alive during check
 * 2. Send a broadcast to the Capacitor app to perform the actual battery check
 * 3. Reschedule the next alarm (critical for setExactAndAllowWhileIdle which is one-shot)
 * 4. Release the wake lock after processing
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "BatteryAlarmReceiver";
    private static final String CHANNEL_ID = "battery_alerts";
    private static final int ALARM_REQUEST_CODE = 9999;
    private static final long CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
    private static final long WAKE_LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Battery check alarm fired");

        // Acquire wake lock to keep CPU alive during battery check
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "battery-control:alarm-receiver-wakelock"
            );
            wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
        }

        try {
            // Notify the Capacitor app that a battery check is needed
            Intent checkIntent = new Intent("io.ionic.starter.BATTERY_CHECK");
            context.sendBroadcast(checkIntent);

            // Store the check timestamp
            SharedPreferences prefs = context.getSharedPreferences("battery_control_prefs", Context.MODE_PRIVATE);
            prefs.edit()
                    .putLong("last_battery_check", System.currentTimeMillis())
                    .putBoolean("boot_completed", false)
                    .apply();

            // Reschedule the next alarm (setExactAndAllowWhileIdle is one-shot)
            scheduleNextAlarm(context);

            Log.d(TAG, "Battery check completed, next alarm scheduled");
        } catch (Exception e) {
            Log.e(TAG, "Error during battery check", e);
        } finally {
            // Release wake lock
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }

    private void scheduleNextAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent alarmIntent = new Intent(context, AlarmReceiver.class);
        alarmIntent.setAction("BATTERY_CHECK");
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        long triggerTime = System.currentTimeMillis() + CHECK_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
            );
        } else {
            alarmManager.setRepeating(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    CHECK_INTERVAL_MS,
                    pendingIntent
            );
        }
    }
}
