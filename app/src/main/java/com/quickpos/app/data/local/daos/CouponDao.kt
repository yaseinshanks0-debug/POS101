package com.quickpos.app.data.local.daos

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.quickpos.app.data.local.entities.Coupon
import kotlinx.coroutines.flow.Flow

@Dao
interface CouponDao {
    @Insert
    suspend fun insert(coupon: Coupon): Long

    @Insert
    suspend fun insertAll(coupons: List<Coupon>)

    @Update
    suspend fun update(coupon: Coupon)

    @Delete
    suspend fun delete(coupon: Coupon)

    @Query("SELECT * FROM coupons ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<Coupon>>

    @Query("SELECT * FROM coupons WHERE UPPER(code) = UPPER(:code) LIMIT 1")
    suspend fun findByCode(code: String): Coupon?

    @Query("UPDATE coupons SET usedCount = usedCount + 1 WHERE id = :id")
    suspend fun incrementUsed(id: Long)

    @Query("DELETE FROM coupons")
    suspend fun deleteAll()
}