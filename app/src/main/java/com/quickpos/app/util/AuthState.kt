package com.quickpos.app.util

import com.quickpos.app.data.local.entities.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * جلسة المستخدم الحالية — تُحفظ عبر التطبيق.
 */
object AuthState {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    /** آخر مستخدم سجّل الدخول (للتعرف عند كل تشغيل) */
    private val _lastUserId = MutableStateFlow<Long?>(null)
    val lastUserId: StateFlow<Long?> = _lastUserId.asStateFlow()

    val isLoggedIn: Boolean get() = _currentUser.value != null

    fun login(user: User) {
        _currentUser.value = user
        _lastUserId.value = user.id
    }

    fun logout() {
        _currentUser.value = null
    }
}
