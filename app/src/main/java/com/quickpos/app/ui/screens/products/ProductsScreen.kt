package com.quickpos.app.ui.screens.products

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
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
import com.quickpos.app.data.local.daos.ProductWithCategory
import com.quickpos.app.data.local.entities.Category
import com.quickpos.app.data.local.entities.Product
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.AppConfirmDialog
import com.quickpos.app.ui.components.EmptyState
import com.quickpos.app.ui.components.IntField
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.ProductThumb
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.util.Fmt
import java.io.File
import kotlinx.coroutines.launch

@Composable
fun ProductsScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val scope = rememberCoroutineScope()

    val rate by app.currency.currentRateFlow().collectAsState(initial = 0.0)
    val products by app.catalog.observeProducts().collectAsState(initial = emptyList())
    val categories by app.catalog.observeCategories().collectAsState(initial = emptyList())

    var query by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<Product?>(null) }
    var showAdd by remember { mutableStateOf(false) }
    var showCategories by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var pendingDelete by remember { mutableStateOf<ProductWithCategory?>(null) }

    val filtered = if (query.isBlank()) products else products.filter {
        it.name.contains(query, ignoreCase = true) || it.barcode.contains(query, ignoreCase = true)
    }

    Scaffold(
        topBar = { ScreenBar("إدارة المنتجات", onBack = { nav.popBackStack() }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "إضافة منتج", tint = MaterialTheme.colorScheme.onPrimary)
            }
        },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("بحث بالاسم أو الباركود") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            )
            OutlinedButton(
                onClick = { showCategories = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
            ) { Text("إدارة الأصناف") }

            if (filtered.isEmpty()) {
                EmptyState("لا توجد منتجات — اضغط زر + للإضافة")
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .weight(1f),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(filtered, key = { it.id }) { p ->
                        AppCard {
                            Row(Modifier.fillMaxWidth()) {
                                ProductThumb(path = p.imagePath, size = 52, modifier = Modifier.padding(end = 10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(p.name, style = MaterialTheme.typography.titleSmall)
                                    Text(
                                        "باركود: ${p.barcode.ifBlank { "—" }}  •  صنف: ${p.categoryName ?: "بدون"}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                    Text(
                                        "سعر: ${Fmt.sdg(p.priceUsd * rate)} (${Fmt.usd(p.priceUsd)})  •  تكلفة: ${Fmt.usd(p.costUsd)}",
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                    Text(
                                        "المخزون: ${p.stock}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = if (p.stock <= p.lowStockThreshold) MaterialTheme.colorScheme.error
                                        else MaterialTheme.colorScheme.secondary,
                                    )
                                }
                                IconButton(onClick = { editing = p.toProduct() }) {
                                    Icon(Icons.Filled.Edit, contentDescription = "تعديل")
                                }
                                IconButton(onClick = { pendingDelete = p }) {
                                    Icon(Icons.Filled.Delete, contentDescription = "حذف", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAdd || editing != null) {
        ProductDialog(
            product = editing,
            categories = categories,
            onDismiss = {
                showAdd = false
                editing = null
            },
            onSave = { product, isNew ->
                scope.launch {
                    runCatching {
                        if (isNew) app.catalog.addProduct(product) else app.catalog.updateProduct(product)
                    }.onSuccess {
                        showAdd = false
                        editing = null
                    }.onFailure {
                        error = it.message
                    }
                }
            },
        )
    }

    if (showCategories) {
        CategoriesDialog(
            categories = categories,
            onDismiss = { showCategories = false },
            onAdd = { name -> scope.launch { runCatching { app.catalog.addCategory(name) }.onFailure { error = it.message } } },
        )
    }

    pendingDelete?.let { p ->
        AppConfirmDialog(
            title = "حذف المنتج",
            text = "هل تريد حذف «${p.name}» نهائياً؟",
            onDismiss = { pendingDelete = null },
            onConfirm = {
                pendingDelete = null
                scope.launch {
                    runCatching { app.catalog.deleteProduct(p.toProduct()) }
                        .onFailure { error = it.message }
                }
            },
        )
    }

    error?.let {
        AppAlertDialog(title = "خطأ", text = it, onDismiss = { error = null })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ProductDialog(
    product: Product?,
    categories: List<Category>,
    onDismiss: () -> Unit,
    onSave: (Product, Boolean) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var name by remember { mutableStateOf(product?.name ?: "") }
    var barcode by remember { mutableStateOf(product?.barcode ?: "") }
    var priceUsd by remember { mutableStateOf(product?.priceUsd?.toString() ?: "") }
    var costUsd by remember { mutableStateOf(product?.costUsd?.toString() ?: "") }
    var stock by remember { mutableStateOf(product?.stock?.toString() ?: "0") }
    var threshold by remember { mutableStateOf(product?.lowStockThreshold?.toString() ?: "5") }
    var categoryId by remember { mutableStateOf(product?.categoryId) }
    var imagePath by remember { mutableStateOf(product?.imagePath) }
    var expanded by remember { mutableStateOf(false) }

    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                try {
                    val input = context.contentResolver.openInputStream(uri)
                    val file = File(context.cacheDir, "product_${System.currentTimeMillis()}.jpg")
                    file.outputStream().use { out -> input?.use { it.copyTo(out) } }
                    input?.close()
                    imagePath = file.absolutePath
                } catch (_: Exception) {
                }
            }
        }
    }

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
                Text(
                    if (product == null) "منتج جديد" else "تعديل المنتج",
                    style = MaterialTheme.typography.titleLarge,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ProductThumb(path = imagePath, size = 72)
                    Column(Modifier.weight(1f)) {
                        OutlinedButton(
                            onClick = { pickImage.launch("image/*") },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text(if (imagePath == null) "اختيار صورة المنتج" else "تغيير الصورة") }
                        if (imagePath != null) {
                            TextButton(onClick = { imagePath = null }) {
                                Text("إزالة الصورة", color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("اسم المنتج *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                OutlinedTextField(
                    value = barcode,
                    onValueChange = { barcode = it },
                    label = { Text("الباركود / الرقم التسلسلي") },
                    supportingText = { Text("اتركه فارغاً لتوليد رقم تسلسلي تلقائياً يُمسح بالكاميرا") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = it },
                ) {
                    OutlinedTextField(
                        value = categories.firstOrNull { it.id == categoryId }?.name ?: "بدون صنف",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("الصنف") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        DropdownMenuItem(
                            text = { Text("بدون صنف") },
                            onClick = {
                                categoryId = null
                                expanded = false
                            },
                        )
                        categories.forEach { c ->
                            DropdownMenuItem(
                                text = { Text(c.name) },
                                onClick = {
                                    categoryId = c.id
                                    expanded = false
                                },
                            )
                        }
                    }
                }

                MoneyField(value = priceUsd, onValueChange = { priceUsd = it }, label = "سعر البيع (بالدولار) *", suffix = "\$")
                MoneyField(value = costUsd, onValueChange = { costUsd = it }, label = "التكلفة (بالدولار)", suffix = "\$")
                IntField(value = stock, onValueChange = { stock = it }, label = "الكمية بالمخزون")
                IntField(value = threshold, onValueChange = { threshold = it }, label = "حد تنبيه المخزون المنخفض")

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = {
                            val newProduct = Product(
                                id = product?.id ?: 0,
                                name = name.trim(),
                                barcode = barcode.trim(),
                                categoryId = categoryId,
                                priceUsd = priceUsd.toDoubleOrNull() ?: 0.0,
                                costUsd = costUsd.toDoubleOrNull() ?: 0.0,
                                stock = stock.toIntOrNull() ?: 0,
                                lowStockThreshold = threshold.toIntOrNull() ?: 0,
                                imagePath = imagePath,
                            )
                            onSave(newProduct, product == null)
                        },
                        modifier = Modifier.weight(1f),
                    ) { Text("حفظ") }
                    TextButton(onClick = onDismiss) { Text("إلغاء") }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoriesDialog(
    categories: List<Category>,
    onDismiss: () -> Unit,
    onAdd: (String) -> Unit,
) {
    var newName by remember { mutableStateOf("") }
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text("إدارة الأصناف", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it },
                        label = { Text("اسم الصنف الجديد") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(
                        onClick = {
                            if (newName.isNotBlank()) onAdd(newName.trim())
                            newName = ""
                        },
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = "إضافة", tint = MaterialTheme.colorScheme.primary)
                    }
                }
                Spacer(Modifier.height(8.dp))
                categories.forEach { c ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp),
                        )
                        Text(c.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    }
                }
                if (categories.isEmpty()) {
                    EmptyState("لا توجد أصناف بعد")
                }
                Button(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) { Text("إغلاق") }
            }
        }
    }
}