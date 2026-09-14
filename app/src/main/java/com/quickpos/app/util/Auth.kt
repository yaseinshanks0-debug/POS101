package com.quickpos.app.util

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

object Auth {
    fun hash(password: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(password.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(bytes)
    }

    fun verify(password: String, hash: String): Boolean = hash(password) == hash
}
