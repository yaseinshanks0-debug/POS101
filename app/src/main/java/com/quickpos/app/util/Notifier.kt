package com.quickpos.app.util

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.quickpos.app.MainActivity
import com.quickpos.app.R
import com.quickpos.app.data.local.daos.ProductWithCategory

/** إشعارات محلية تعمل دون اتصال تماماً. */
object Notifier {
    private const val CHANNEL_LOW_STOCK = "low_stock"
    private const val NOTIF_ID_LOW_STOCK = 1001

    fun ensureLowStockChannel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_LOW_STOCK,
            "تنبيهات المخزون المنخفض",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply { description = "يُبلّغ عند وصول منتجات إلى حد التنبيه" }
        nm.createNotificationChannel(channel)
    }

    fun notificationsAllowed(context: Context): Boolean =
        Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED

    /** رسالة تنبيه واحدة بأسماء المنتجات التي وصلت حد الطلب. */
    fun showLowStock(context: Context, items: List<ProductWithCategory>) {
        if (items.isEmpty()) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (!notificationsAllowed(context)) return
        ensureLowStockChannel(context)

        val names = items.take(3).joinToString("، ") { "${it.name} (${it.stock})" }
        val more = if (items.size > 3) " و${items.size - 3} أخرى" else ""

        val contentIntent = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_LOW_STOCK)
            .setSmallIcon(R.drawable.ic_stat_low_stock)
            .setContentTitle("انخفاض المخزون")
            .setContentText("منتجات وصلت حد التنبيه: $names$more")
            .setStyle(NotificationCompat.BigTextStyle().bigText("منتجات وصلت حد التنبيه: $names$more"))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .build()

        nm.notify(NOTIF_ID_LOW_STOCK, notification)
    }
}