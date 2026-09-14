package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.ExchangeRateDao
import com.quickpos.app.data.local.daos.SettingsDao
import com.quickpos.app.data.local.entities.ExchangeRateRecord
import com.quickpos.app.data.local.entities.SettingEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * يتحكم في سعر صرف الدولار مقابل الجنيه السوداني (SDG).
 * جميع أسعار المنتجات مخزنة بالدولار كمرجع ثابت، والسعر المحلي محسوب تلقائياً
 * من سعر الصرف الحالي — أي تعديل للسعر يطبّق على كل المنتجات والمبيعات فوراً.
 */
class CurrencyRepository(
    private val settingsDao: SettingsDao,
    private val rateDao: ExchangeRateDao
) {
    suspend fun currentRate(): Double =
        settingsDao.get(KEY_RATE)?.toDoubleOrNull() ?: DEFAULT_RATE

    fun currentRateFlow(): Flow<Double> =
        settingsDao.observeAll().map { list ->
            list.firstOrNull { it.key == KEY_RATE }?.value?.toDoubleOrNull() ?: DEFAULT_RATE
        }

    fun observeRateHistory(): Flow<List<ExchangeRateRecord>> = rateDao.observeAll()

    suspend fun setRate(rate: Double, note: String = "") {
        if (rate <= 0) return
        settingsDao.put(SettingEntity(KEY_RATE, rate.toString()))
        rateDao.insert(ExchangeRateRecord(rateSdg = rate, note = note))
    }

    fun toLocal(usd: Double, rate: Double): Double = round2(usd * rate)

    fun round2(value: Double): Double = Math.round(value * 100.0) / 100.0

    companion object {
        const val KEY_RATE = "usd_rate"
        const val DEFAULT_RATE = 0.0
    }
}