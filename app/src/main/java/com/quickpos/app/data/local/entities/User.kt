package com.quickpos.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val username: String,
    val passwordHash: String,
    val fullName: String = "",
    val role: String = "cashier", // admin | cashier | manager
    val active: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)
