package io.ionic.starter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import java.util.ArrayList;
import java.util.Calendar;

/**
 * Receiver that handles device boot to restore battery monitoring alarms.
 *
 * When the device restarts, all scheduled alarms are cleared by the OS.
 * This receiver:
 * 1. Restarts the foreground service for background monitoring
 * 2. Reschedules the periodic battery check alarm
 * 3. Notifies the Capacitor app via a broadcast that boot completed
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BatteryBootReceiver";
    private static final String CHANNEL_ID = "battery_alerts";
    private static final String CHANNEL_NAME = "Battery Alerts";
    private static final int ALARM_REQUEST_CODE = 9999;
    private static final long CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "Boot completed received, action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {

            // Create notification channel (required for Android 8+)
            createNotificationChannel(context);

            // Schedule periodic battery check alarm
            schedulePeriodicBatteryCheck(context);

            // Start foreground service
            startForegroundService(context);

            // Notify Capacitor app (it will pick up on next launch)
            notifyBootCompleted(context);

            Log.d(TAG, "Battery monitoring restored after boot");
        }
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alertas de nivel de batería");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{2000, 500, 1000});

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void schedulePeriodicBatteryCheck(Context context) {
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

        // Schedule repeating alarm every 15 minutes
        long triggerTime = System.currentTimeMillis() + CHECK_INTERVAL_MS;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Use setExactAndAllowWhileIdle to fire during Doze mode
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

        Log.d(TAG, "Periodic battery check alarm scheduled");
    }

    private void startForegroundService(Context context) {
        try {
            Intent serviceIntent = new Intent(context,
                io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService.class);

            // Build notification bundle with the mandatory data expected by AndroidForegroundService
            Bundle notificationBundle = new Bundle();
            notificationBundle.putString("body", "Monitoreando nivel de batería");
            notificationBundle.putInt("icon", context.getResources().getIdentifier(
                "ic_launcher_round", "drawable", context.getPackageName()));
            notificationBundle.putInt("id", 1);
            notificationBundle.putString("title", "Battery Control activo");
            notificationBundle.putBoolean("silent", false);
            notificationBundle.putInt("serviceType", 1); // DATA_SYNC

            // Empty buttons array to prevent NPE when the service iterates the list
            ArrayList<Bundle> emptyButtons = new ArrayList<>();
            notificationBundle.putParcelableArrayList("buttons", emptyButtons);

            serviceIntent.putExtra("notification", notificationBundle);
            serviceIntent.putExtra("channelId", "battery_alerts");

            // Do NOT set action "START" — let it fall into the startForeground() branch

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "Foreground service started after boot");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service after boot", e);
        }
    }

    private void notifyBootCompleted(Context context) {
        // Store boot completed flag for Capacitor app to read
        SharedPreferences prefs = context.getSharedPreferences("battery_control_prefs", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("boot_completed", true).apply();

        // Send broadcast that Capacitor app can listen to
        Intent bootIntent = new Intent("io.ionic.starter.BOOT_COMPLETED");
        context.sendBroadcast(bootIntent);
    }
}
