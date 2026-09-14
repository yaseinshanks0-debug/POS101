package com.quickpos.app.ui.screens.suppliers

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.quickpos.app.data.local.entities.Product
import com.quickpos.app.data.local.entities.Supplier
import com.quickpos.app.data.repository.ReceiveLine
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.ProductThumb
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.util.Fmt
import kotlinx.coroutines.launch

private class LineState(val product: Product) {
    var qty by androidx.compose.runtime.mutableIntStateOf(1)
    var cost by androidx.compose.runtime.mutableStateOf(product.costUsd)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveGoodsScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()
    val suppliers by app.purchases.suppliersFlow().collectAsState(initial = emptyList())

    var selectedSupplier by remember { mutableStateOf<Supplier?>(null) }
    var supplierExpanded by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Product>>(emptyList()) }
    var lines by remember { mutableStateOf<List<LineState>>(emptyList()) }
    var notes by remember { mutableStateOf("") }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var showAddSupplier by remember { mutableStateOf(false) }

    LaunchedEffect(query) {
        results = if (query.isBlank()) emptyList() else app.catalog.searchOnce(query).take(15)
    }

    val totalUsd = lines.sumOf { it.cost * it.qty }

    Scaffold(
        topBar = { ScreenBar("استلام بضاعة", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                ExposedDropdownMenuBox(
                    expanded = supplierExpanded,
                    onExpandedChange = { supplierExpanded = it },
                ) {
                    OutlinedTextField(
                        value = selectedSupplier?.name ?: "اختر المورد",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("المورد *") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(supplierExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    )
                    ExposedDropdownMenu(expanded = supplierExpanded, onDismissRequest = { supplierExpanded = false }) {
                        suppliers.forEach { s ->
                            DropdownMenuItem(
                                text = { Text(s.name) },
                                onClick = {
                                    selectedSupplier = s
                                    supplierExpanded = false
                                },
                            )
                        }
                        if (suppliers.isEmpty()) {
                            DropdownMenuItem(text = { Text("لا مورد — أضف مورداً أولاً") }, onClick = {})
                        }
                    }
                }
                TextButton(
                    onClick = { showAddSupplier = true },
                    modifier = Modifier.padding(top = 4.dp),
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("مورد جديد", modifier = Modifier.padding(start = 4.dp))
                }
            }

            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("إضافة منتج (بحث بالاسم أو الباركود)") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (query.isNotBlank()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        results.forEach { p ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                ProductThumb(path = p.imagePath, size = 36)
                                Column(modifier = Modifier.weight(1f).padding(start = 8.dp)) {
                                    Text(p.name, style = MaterialTheme.typography.bodyMedium)
                                    Text(
                                        "متوفر: ${p.stock} — تكلفة: ${Fmt.usd(p.costUsd)}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                IconButton(onClick = {
                                    query = ""
                                    results = emptyList()
                                    lines = lines + LineState(p)
                                }) {
                                    Icon(Icons.Filled.Add, contentDescription = "إضافة", tint = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                        if (results.isEmpty()) EmptyState("لا توجد نتائج")
                    }
                }
            }

            if (lines.isNotEmpty()) {
                item {
                    Text(
                        "الأصناف المضافـة (${lines.size})",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                items(lines) { line ->
                    AppCard {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text(line.product.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                IconButton(onClick = { lines = lines.filter { it != line } }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = line.qty.toString(),
                                    onValueChange = { line.qty = it.toIntOrNull() ?: 0 },
                                    label = { Text("كمية") },
                                    modifier = Modifier.weight(1f),
                                )
                                OutlinedTextField(
                                    value = line.cost.toString(),
                                    onValueChange = { line.cost = it.toDoubleOrNull() ?: 0.0 },
                                    label = { Text("تكلفة ($)") },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("ملاحظات") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            item {
                AppCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("إجمالي التكلفة", style = MaterialTheme.typography.titleMedium)
                        StatusPill(text = Fmt.usd(totalUsd), color = MaterialTheme.colorScheme.primary)
                    }
                    Spacer(Modifier.height(10.dp))
                    Button(
                        onClick = {
                            busy = true
                            scope.launch {
                                runCatching {
                                    app.purchases.receiveGoods(
                                        supplier = selectedSupplier,
                                        items = lines.map { ReceiveLine(it.product, it.qty, it.cost) },
                                        notes = notes,
                                    )
                                }.onSuccess {
                                    nav.popBackStack()
                                }.onFailure {
                                    message = it.message ?: "فشل الحفظ"
                                    busy = false
                                }
                            }
                        },
                        enabled = !busy && lines.isNotEmpty() && selectedSupplier != null,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(if (busy) "جارٍ الحفظ..." else "حفظ فاتورة الاستلام") }
                    if (selectedSupplier == null) {
                        Text(
                            "اختر المورد أولاً",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }

    if (showAddSupplier) {
        AddSupplierDialog(
            onDismiss = { showAddSupplier = false },
            onSave = { name, phone, notes ->
                scope.launch {
                    runCatching {
                        val id = app.purchases.addSupplier(Supplier(name = name, phone = phone, notes = notes))
                        Supplier(id = id, name = name, phone = phone, notes = notes)
                    }.onSuccess { s ->
                        selectedSupplier = s
                        showAddSupplier = false
                    }.onFailure { message = it.message }
                }
            },
        )
    }
}

@Composable
private fun AddSupplierDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

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
                Text("مورد جديد", style = MaterialTheme.typography.titleLarge)
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
                        onClick = { onSave(name.trim(), phone.trim(), notes.trim()) },
                        modifier = Modifier.weight(1f),
                    ) { Text("حفظ") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}