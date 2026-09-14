package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "coupons")
data class Coupon(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val code: String,
    val type: String, // PERCENT | FIXED
    val value: Double,
    val maxUses: Int,
    val usedCount: Int = 0,
    val startAt: Long,
    val endAt: Long,
    val active: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)