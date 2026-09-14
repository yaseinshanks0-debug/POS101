package com.quickpos.app.util

import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

object Fmt {
    private val money = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }

    fun money(v: Double): String = money.format(v)

    fun sdg(v: Double): String = "${money(v)} ج.س"

    fun usd(v: Double): String = "$ ${money(v)}"

    fun pct(v: Double): String = "${money.format(v)}٪"

    fun date(ms: Long): String = SimpleDateFormat("yyyy/MM/dd", Locale.ENGLISH).format(Date(ms))

    fun dateTime(ms: Long): String = SimpleDateFormat("yyyy/MM/dd HH:mm", Locale.ENGLISH).format(Date(ms))

    fun dateTimeLong(ms: Long): String = SimpleDateFormat("dd MMM yyyy — HH:mm", Locale.ENGLISH).format(Date(ms))

    private const val DAY_MS = 86_400_000L

    fun startOfDay(ms: Long): Long {
        val c = Calendar.getInstance()
        c.timeInMillis = ms
        c.set(Calendar.HOUR_OF_DAY, 0)
        c.set(Calendar.MINUTE, 0)
        c.set(Calendar.SECOND, 0)
        c.set(Calendar.MILLISECOND, 0)
        return c.timeInMillis
    }

    fun endOfDay(ms: Long): Long = startOfDay(ms) + DAY_MS - 1

    fun daysAgo(days: Long): Long {
        val c = Calendar.getInstance()
        c.timeInMillis = System.currentTimeMillis()
        c.add(Calendar.DAY_OF_YEAR, -days.toInt())
        return c.timeInMillis
    }

    fun isToday(ms: Long): Boolean = startOfDay(ms) == startOfDay(System.currentTimeMillis())
}