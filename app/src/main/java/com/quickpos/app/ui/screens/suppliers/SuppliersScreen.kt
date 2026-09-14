package com.quickpos.app.ui.screens.suppliers

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.local.entities.Supplier
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.AppConfirmDialog
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.navigation.Routes
import kotlinx.coroutines.launch

@Composable
fun SuppliersScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val suppliers by app.purchases.suppliersFlow().collectAsState(initial = emptyList())

    var editing by remember { mutableStateOf<Supplier?>(null) }
    var pendingDelete by remember { mutableStateOf<Supplier?>(null) }
    var showAdd by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = { ScreenBar("الموردون", onBack = { nav.popBackStack() }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "مورد جديد", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            OutlinedButton(
                onClick = { nav.navigate(Routes.RECEIVE_GOODS) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
            ) {
                Icon(Icons.Filled.Inventory, contentDescription = null)
                Text("استلام بضاعة جديدة", modifier = Modifier.padding(start = 6.dp))
            }

            if (suppliers.isEmpty()) {
                EmptyState("لا يوجد موردون — اضغط + لإضافة مورد، أو استلم بضاعة مباشرة")
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(suppliers) { s ->
                        AppCard {
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(s.name, style = MaterialTheme.typography.titleSmall)
                                    if (s.phone.isNotBlank()) {
                                        Text(
                                            "الهاتف: ${s.phone}",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                                IconButton(onClick = { editing = s }) {
                                    Icon(Icons.Filled.Edit, contentDescription = "تعديل")
                                }
                                IconButton(onClick = { pendingDelete = s }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    pendingDelete?.let { s ->
        AppConfirmDialog(
            title = "حذف المورد",
            text = "هل تريد حذف المورد «${s.name}» نهائياً؟",
            onDismiss = { pendingDelete = null },
            onConfirm = {
                pendingDelete = null
                scope.launch {
                    runCatching { app.purchases.deleteSupplier(s) }
                        .onSuccess { message = "تم حذف المورد" }
                        .onFailure { message = it.message }
                }
            },
        )
    }

    if (showAdd || editing != null) {
        SupplierDialog(
            supplier = editing,
            onDismiss = { showAdd = false; editing = null },
            onSave = { s ->
                scope.launch {
                    runCatching {
                        if (s.id == 0L) app.purchases.addSupplier(s) else app.purchases.updateSupplier(s)
                    }.onSuccess {
                        showAdd = false; editing = null
                    }.onFailure { message = it.message }
                }
            },
        )
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }
}

@Composable
private fun SupplierDialog(
    supplier: Supplier?,
    onDismiss: () -> Unit,
    onSave: (Supplier) -> Unit,
) {
    var name by remember { mutableStateOf(supplier?.name ?: "") }
    var phone by remember { mutableStateOf(supplier?.phone ?: "") }
    var notes by remember { mutableStateOf(supplier?.notes ?: "") }

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
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(if (supplier == null) "مورد جديد" else "تعديل المورد", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("اسم المورد *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("الهاتف") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("ملاحظات") },
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        enabled = name.isNotBlank(),
                        onClick = {
                            onSave(
                                Supplier(
                                    id = supplier?.id ?: 0,
                                    name = name.trim(),
                                    phone = phone.trim(),
                                    notes = notes.trim(),
                                ),
                            )
                        },
                        modifier = Modifier.weight(1f),
                    ) { Text("حفظ") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}