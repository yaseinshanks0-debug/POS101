package com.quickpos.app.ui.screens.customers

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.quickpos.app.data.local.entities.Customer
import com.quickpos.app.data.local.entities.Invoice
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.ui.components.paymentMethodLabel
import com.quickpos.app.ui.navigation.Routes
import com.quickpos.app.util.Fmt
import kotlinx.coroutines.launch

@Composable
fun CustomerDetailScreen(nav: NavHostController, customerId: Long) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    var customer by remember { mutableStateOf<Customer?>(null) }
    var invoices by remember { mutableStateOf<List<Invoice>>(emptyList()) }
    val settlements by app.pos.settlementsFlow(customerId).collectAsState(initial = emptyList())

    var refresh by remember { mutableIntStateOf(0) }
    var showSettle by remember { mutableStateOf(false) }
    var showCharge by remember { mutableStateOf(false) }
    var showCorrect by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(customerId, refresh) {
        val c = app.pos.getCustomer(customerId)
        customer = c
        invoices = c?.let { app.pos.customerInvoices(it) } ?: emptyList()
    }

    val c = customer
    Scaffold(
        topBar = { ScreenBar("تفاصيل العميل", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (c == null) {
            EmptyState("العميل غير موجود", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    AppCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(c.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
                            StatusPill(
                                text = "دَين: ${Fmt.sdg(c.totalDebt)}",
                                color = if (c.totalDebt > 0) MaterialTheme.colorScheme.error
                                else MaterialTheme.colorScheme.primary,
                            )
                        }
                        if (c.phone.isNotBlank()) {
                            Spacer(Modifier.height(4.dp))
                            Text("الهاتف: ${c.phone}", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            enabled = c.totalDebt > 0,
                            onClick = { showSettle = true },
                            modifier = Modifier.weight(1f),
                        ) { Text("تسديد") }
                        OutlinedButton(
                            onClick = { showCharge = true },
                            modifier = Modifier.weight(1f),
                        ) { Text("+ دَين") }
                        OutlinedButton(
                            enabled = c.totalDebt > 0,
                            onClick = { showCorrect = true },
                            modifier = Modifier.weight(1f),
                        ) { Text("تصحيح") }
                    }
                }
                item {
                    Text(
                        "فواتير العميل (${invoices.size})",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                if (invoices.isEmpty()) {
                    item { Text("لا توجد فواتير لهذا العميل", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(invoices) { inv ->
                    AppCard(modifier = Modifier.clickable { nav.navigate(Routes.invoiceDetail(inv.id)) }) {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    if (inv.kind == "DEBT") "إيصال تسديد #${inv.number}" else "فاتورة #${inv.number}",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = if (inv.kind == "DEBT") MaterialTheme.colorScheme.tertiary
                                    else MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    "${Fmt.dateTime(inv.createdAt)} — ${paymentMethodLabel(inv.paymentMethod)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            StatusPill(text = Fmt.sdg(inv.totalLocal), color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                item {
                    Text(
                        "سجل حركات الدَين (${settlements.size})",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                if (settlements.isEmpty()) {
                    item { Text("لا توجد حركات حتى الآن", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
                items(settlements) { s ->
                    AppCard {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    settlementTypeLabel(s.type),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = when (s.type) {
                                        "ADJUST_UP" -> MaterialTheme.colorScheme.error
                                        "ADJUST_DOWN" -> MaterialTheme.colorScheme.tertiary
                                        else -> MaterialTheme.colorScheme.primary
                                    },
                                )
                                Text(
                                    "${Fmt.dateTime(s.date)} — ${paymentMethodLabel(s.method)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                if (s.note.isNotBlank()) {
                                    Text(s.note, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Text(Fmt.sdg(s.amountLocal), style = MaterialTheme.typography.titleSmall)
                        }
                    }
                }
            }
        }
    }

    c?.let { customer ->
        if (showSettle) {
            DebtPaymentDialog(
                title = "تسديد دَين — ${customer.name}",
                amountLabel = "المبلغ المسدد (جنيه)",
                onDismiss = { showSettle = false },
                onConfirm = { amount, method, note ->
                    scope.launch {
                        try {
                            app.pos.settleDebt(customer.id, amount, method, note)
                            message = "تم تسديد ${Fmt.sdg(amount)} وسُجّل في إيصال وفواتير العميل"
                        } catch (e: Exception) {
                            message = e.message ?: "فشل التسديد"
                        }
                        showSettle = false
                        refresh++
                    }
                },
            )
        }
        if (showCharge) {
            DebtPaymentDialog(
                title = "إضافة دَين — ${customer.name}",
                amountLabel = "المبلغ المضاف (جنيه)",
                showMethod = false,
                onDismiss = { showCharge = false },
                onConfirm = { amount, _, note ->
                    scope.launch {
                        try {
                            app.pos.addCustomerCharge(customer.id, amount, note)
                            message = "تمت إضافة دَين ${Fmt.sdg(amount)}"
                        } catch (e: Exception) {
                            message = e.message ?: "فشلت الإضافة"
                        }
                        showCharge = false
                        refresh++
                    }
                },
            )
        }
        if (showCorrect) {
            DebtPaymentDialog(
                title = "تصحيح دَين — ${customer.name}",
                amountLabel = "المبلغ المراد تخفيضه (جنيه)",
                showMethod = false,
                onDismiss = { showCorrect = false },
                onConfirm = { amount, _, note ->
                    scope.launch {
                        try {
                            app.pos.correctCustomerDebt(customer.id, amount, note)
                            message = "تم تصحيح الدَين بمبلغ ${Fmt.sdg(amount)}"
                        } catch (e: Exception) {
                            message = e.message ?: "فشل التصحيح"
                        }
                        showCorrect = false
                        refresh++
                    }
                },
            )
        }
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }
}

private fun settlementTypeLabel(type: String): String = when (type) {
    "ADJUST_UP" -> "إضافة دَين"
    "ADJUST_DOWN" -> "تصحيح (تخفيض)"
    else -> "تسديد"
}

@Composable
private fun DebtPaymentDialog(
    title: String,
    amountLabel: String,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, method: String, note: String) -> Unit,
    showMethod: Boolean = true,
) {
    var amount by remember { mutableStateOf("") }
    var method by remember { mutableStateOf("CASH") }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(title, style = MaterialTheme.typography.titleLarge)
                MoneyField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = amountLabel,
                    enabled = !busy,
                )
                if (showMethod) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = method == "CASH", onClick = { method = "CASH" }, label = { Text("كاش") }, modifier = Modifier.weight(1f), enabled = !busy)
                        FilterChip(selected = method == "TRANSFER", onClick = { method = "TRANSFER" }, label = { Text("تحويل") }, modifier = Modifier.weight(1f), enabled = !busy)
                    }
                }
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("ملاحظة (اختياري)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !busy,
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    val amt = amount.toDoubleOrNull() ?: 0.0
                    Button(
                        enabled = amt.toInt() > 0 && !busy,
                        onClick = {
                            busy = true
                            onConfirm(amt, method, note.trim())
                        },
                        modifier = Modifier.weight(1f),
                    ) { Text("حفظ") }
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("إلغاء") }
                }
            }
        }
    }
}