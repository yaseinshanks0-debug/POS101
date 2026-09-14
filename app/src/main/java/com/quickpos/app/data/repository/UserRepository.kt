package com.quickpos.app.data.repository

import com.quickpos.app.data.local.daos.UserDao
import com.quickpos.app.data.local.entities.User
import com.quickpos.app.util.Auth
import kotlinx.coroutines.flow.Flow

class UserRepository(private val userDao: UserDao) {

    fun usersFlow(): Flow<List<User>> = userDao.observeAll()

    suspend fun login(username: String, password: String): User? {
        val user = userDao.findByUsername(username.trim())
        if (user == null || !user.active) return null
        return if (Auth.verify(password, user.passwordHash)) user else null
    }

    suspend fun findByUsername(username: String): User? = userDao.findByUsername(username)

    suspend fun findById(id: Long): User? = userDao.byId(id)

    suspend fun addUser(user: User): User {
        require(user.username.isNotBlank()) { "اسم المستخدم مطلوب" }
        require(user.username.length >= 3) { "اسم المستخدم قصير جداً (3 أحرف على الأقل)" }
        require(user.passwordHash.isNotBlank()) { "كلمة المرور مطلوبة" }
        require(userDao.findByUsername(user.username) == null) { "اسم المستخدم موجود مسبقاً" }
        val id = userDao.insert(user)
        return user.copy(id = id)
    }

    suspend fun updateUser(user: User) = userDao.update(user)

    suspend fun deleteUser(user: User) {
        if (user.role == "admin" && userDao.countAdmins() <= 1) {
            throw IllegalStateException("لا يمكن حذف آخر مدير")
        }
        userDao.delete(user)
    }

    suspend fun countAdmins(): Int = userDao.countAdmins()
}
