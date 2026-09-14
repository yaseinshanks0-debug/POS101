package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.SettingsDao
import com.quickpos.app.data.local.entities.SettingEntity
import kotlinx.coroutines.flow.Flow

class SettingsRepository(private val settingsDao: SettingsDao) {

    suspend fun get(key: String): String? = settingsDao.get(key)

    suspend fun getString(key: String, default: String): String = settingsDao.get(key) ?: default

    suspend fun getDouble(key: String, default: Double): Double =
        settingsDao.get(key)?.toDoubleOrNull() ?: default

    suspend fun getBoolean(key: String, default: Boolean): Boolean =
        settingsDao.get(key)?.let { it == "true" } ?: default

    suspend fun put(key: String, value: String) = settingsDao.put(SettingEntity(key, value))

    suspend fun putDouble(key: String, value: Double) = settingsDao.put(SettingEntity(key, value.toString()))

    suspend fun putBoolean(key: String, value: Boolean) = settingsDao.put(SettingEntity(key, value.toString()))

    suspend fun businessName(): String = getString(KEY_BUSINESS_NAME, "متجري")

    fun observeAll(): Flow<List<SettingEntity>> = settingsDao.observeAll()

    companion object {
        const val KEY_BUSINESS_NAME = "business_name"
        const val KEY_LAST_USER_ID = "last_user_id"
    }
}