package com.quickpos.app.ui.screens.expenses

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.local.entities.Expense
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.AppConfirmDialog
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.util.Fmt
import kotlinx.coroutines.launch

@Composable
fun ExpensesScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val expenses by app.expenseRepo.observeAll().collectAsState(initial = emptyList())

    var showAdd by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Expense?>(null) }
    var message by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = { ScreenBar("المصروفات", onBack = { nav.popBackStack() }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "إضافة مصروف", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (expenses.isEmpty()) {
            EmptyState("لا توجد مصروفات — اضغط زر + للإضافة", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(expenses) { e ->
                    AppCard {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(e.title, style = MaterialTheme.typography.titleSmall)
                                Text(
                                    "${Fmt.date(e.date)}  •  ${e.category}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            StatusPill(text = Fmt.sdg(e.amountLocal), color = MaterialTheme.colorScheme.error)
                            IconButton(onClick = { pendingDelete = e }) {
                                Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("الإجمالي", style = MaterialTheme.typography.titleMedium)
                        StatusPill(
                            text = Fmt.sdg(expenses.sumOf { it.amountLocal }),
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
        }
    }

    pendingDelete?.let { e ->
        AppConfirmDialog(
            title = "حذف المصروف",
            text = "هل تريد حذف «${e.title}» (${Fmt.sdg(e.amountLocal)})؟",
            onDismiss = { pendingDelete = null },
            onConfirm = {
                pendingDelete = null
                scope.launch {
                    runCatching { app.expenseRepo.delete(e) }
                        .onFailure { message = it.message }
                }
            },
        )
    }

    if (showAdd) {
        AddExpenseDialog(
            onDismiss = { showAdd = false },
            onSave = { title, category, amount, note ->
                scope.launch {
                    app.expenseRepo.add(Expense(title = title, category = category, amountLocal = amount, note = note))
                }
                showAdd = false
            },
        )
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }
}

@Composable
private fun AddExpenseDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, Double, String) -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("عام") }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }

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
                Text("مصروف جديد", style = MaterialTheme.typography.titleLarge)
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("الوصف *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("الفئة (مثال: إيجار، مشتريات، رواتب)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                MoneyField(value = amount, onValueChange = { amount = it }, label = "المبلغ (بالجنيه) *", suffix = "ج.س")
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("ملاحظة") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        enabled = title.isNotBlank() && (amount.toDoubleOrNull() ?: 0.0) > 0,
                        onClick = {
                            onSave(title.trim(), category.trim().ifBlank { "عام" }, amount.toDoubleOrNull() ?: 0.0, note.trim())
                        },
                        modifier = Modifier.weight(1f),
                    ) { Text("حفظ") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}