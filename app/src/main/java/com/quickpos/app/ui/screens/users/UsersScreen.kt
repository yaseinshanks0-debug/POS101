package com.quickpos.app.ui.screens.users

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.local.entities.User
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.AppConfirmDialog
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.util.Auth
import kotlinx.coroutines.launch

@Composable
fun UsersScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val users by app.users.usersFlow().collectAsState(initial = emptyList())

    var showAdd by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<User?>(null) }
    var message by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = { ScreenBar("إدارة المستخدمين", onBack = { nav.popBackStack() }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "مستخدم جديد", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (users.isEmpty()) {
            EmptyState("لا يوجد مستخدمون — أضف أول مستخدم", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(users) { u ->
                    AppCard {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "${u.fullName.ifBlank { u.username }} (${u.username})",
                                    style = MaterialTheme.typography.titleSmall,
                                )
                                StatusPill(
                                    text = roleName(u.role),
                                    color = if (u.role == "admin") MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.secondary,
                                )
                            }
                            if (u.username != "admin") {
                                IconButton(onClick = { pendingDelete = u }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    pendingDelete?.let { u ->
        AppConfirmDialog(
            title = "حذف المستخدم",
            text = "هل تريد حذف «${u.fullName.ifBlank { u.username }}» نهائياً؟",
            onDismiss = { pendingDelete = null },
            onConfirm = {
                pendingDelete = null
                scope.launch {
                    runCatching { app.users.deleteUser(u) }
                        .onSuccess { message = "تم حذف المستخدم" }
                        .onFailure { message = it.message }
                }
            },
        )
    }

    if (showAdd) {
        AddUserDialog(
            onDismiss = { showAdd = false },
            onSave = { username, password, fullName, role ->
                scope.launch {
                    runCatching {
                        app.users.addUser(
                            User(
                                username = username,
                                passwordHash = Auth.hash(password),
                                fullName = fullName,
                                role = role,
                            ),
                        )
                    }.onSuccess {
                        showAdd = false
                        message = "تمت إضافة المستخدم"
                    }.onFailure { message = it.message }
                }
            },
        )
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }
}

private fun roleName(role: String): String = when (role) {
    "admin" -> "مدير"
    "manager" -> "مدير مبيعات"
    else -> "كاشير"
}

@Composable
private fun AddUserDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String, String) -> Unit,
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("cashier") }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("مستخدم جديد", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("اسم المستخدم") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("كلمة المرور") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("الاسم الكامل (اختياري)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RoleChip(label = "كاشير", selected = role == "cashier") { role = "cashier" }
                    RoleChip(label = "مدير مبيعات", selected = role == "manager") { role = "manager" }
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        enabled = username.isNotBlank() && password.isNotBlank(),
                        onClick = { onSave(username.trim(), password, fullName.trim(), role) },
                        modifier = Modifier.weight(1f),
                    ) { Text("إضافة") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}

@Composable
private fun RoleChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
    )
}