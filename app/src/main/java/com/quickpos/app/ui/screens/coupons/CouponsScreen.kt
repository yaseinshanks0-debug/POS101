package com.quickpos.app.ui.screens.coupons

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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import com.quickpos.app.data.local.entities.Coupon
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.AppConfirmDialog
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.IntField
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.util.Fmt
import kotlinx.coroutines.launch
import java.util.concurrent.ThreadLocalRandom

@Composable
fun CouponsScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val coupons by app.pos.couponsFlow().collectAsState(initial = emptyList())

    var showAdd by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<Coupon?>(null) }

    Scaffold(
        topBar = { ScreenBar("أكواد الخصم", onBack = { nav.popBackStack() }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "كوبون جديد", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        if (coupons.isEmpty()) {
            EmptyState("لا توجد أكواد خصم — اضغط + لإنشاء كوبون بزمن محدد وعدد استخدامات", Modifier.padding(padding))
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(coupons) { c ->
                    AppCard {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    c.code,
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.weight(1f),
                                )
                                StatusPill(
                                    text = when (c.type) {
                                        "PERCENT" -> "خصم ${Fmt.pct(c.value)}"
                                        else -> "خصم ${Fmt.sdg(c.value)}"
                                    },
                                    color = MaterialTheme.colorScheme.tertiary,
                                )
                                Switch(
                                    checked = c.active,
                                    onCheckedChange = { checked ->
                                        scope.launch { app.pos.updateCoupon(c.copy(active = checked)) }
                                    },
                                )
                                IconButton(onClick = { pendingDelete = c }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                            Text(
                                "استخدام: ${c.usedCount}/${c.maxUses}",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (c.usedCount >= c.maxUses) MaterialTheme.colorScheme.error
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "متاح من ${Fmt.date(c.startAt)} إلى ${Fmt.date(c.endAt)}",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }

    pendingDelete?.let { c ->
        AppConfirmDialog(
            title = "حذف الكوبون",
            text = "هل تريد حذف كوبون «${c.code}» نهائياً؟",
            onDismiss = { pendingDelete = null },
            onConfirm = {
                pendingDelete = null
                scope.launch { app.pos.deleteCoupon(c) }
            },
        )
    }

    if (showAdd) {
        AddCouponDialog(
            onDismiss = { showAdd = false },
            onSave = { coupon ->
                scope.launch { app.pos.addCoupon(coupon) }
                showAdd = false
            },
        )
    }
}

@Composable
private fun AddCouponDialog(
    onDismiss: () -> Unit,
    onSave: (Coupon) -> Unit,
) {
    var code by remember { mutableStateOf(randomCode()) }
    var isPercent by remember { mutableStateOf(true) }
    var value by remember { mutableStateOf("10") }
    var maxUses by remember { mutableStateOf("20") }
    var daysValid by remember { mutableStateOf("3") }

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
                Text("كوبون خصم جديد", style = MaterialTheme.typography.titleLarge)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it.uppercase() },
                        label = { Text("الكود") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { code = randomCode() }) {
                        Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = isPercent, onClick = { isPercent = true }, label = { Text("نسبة %") }, modifier = Modifier.weight(1f))
                    FilterChip(selected = !isPercent, onClick = { isPercent = false }, label = { Text("مبلغ ثابت") }, modifier = Modifier.weight(1f))
                }
                MoneyField(
                    value = value,
                    onValueChange = { value = it },
                    label = if (isPercent) "قيمة الخصم (%)" else "قيمة الخصم (بالجنيه)",
                    suffix = if (isPercent) "%" else "ج.س",
                )
                IntField(value = maxUses, onValueChange = { maxUses = it }, label = "عدد مرات الاستخدام المسموح")
                IntField(value = daysValid, onValueChange = { daysValid = it }, label = "يُفعّل لمدة (أيام) من الآن")
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        enabled = code.isNotBlank() && (value.toDoubleOrNull() ?: 0.0) > 0 &&
                            (maxUses.toIntOrNull() ?: 0) > 0 && (daysValid.toIntOrNull() ?: 0) > 0,
                        onClick = {
                            val now = System.currentTimeMillis()
                            onSave(
                                Coupon(
                                    code = code.trim().uppercase(),
                                    type = if (isPercent) "PERCENT" else "FIXED",
                                    value = value.toDoubleOrNull() ?: 0.0,
                                    maxUses = maxUses.toIntOrNull() ?: 1,
                                    startAt = now,
                                    endAt = now + (daysValid.toIntOrNull() ?: 1) * 86_400_000L,
                                ),
                            )
                        },
                        modifier = Modifier.weight(1f),
                    ) { Text("إنشاء") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}

private fun randomCode(): String {
    val chars = ('A'..'Z') + ('0'..'9')
    val rnd = ThreadLocalRandom.current()
    return (1..8).map { chars[rnd.nextInt(chars.size)] }.joinToString("")
}