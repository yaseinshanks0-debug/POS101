package com.quickpos.app.ui.screens.settings

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FileOpen
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Money
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.navigation.NavHostController
import com.quickpos.app.QuickPosApp
import com.quickpos.app.data.repository.SettingsRepository
import com.quickpos.app.ui.components.AppAlertDialog
import com.quickpos.app.ui.components.AppCard
import com.quickpos.app.ui.components.DetailRow
import com.quickpos.app.ui.components.MoneyField
import com.quickpos.app.ui.components.ScreenBar
import com.quickpos.app.ui.components.SectionCard
import com.quickpos.app.ui.components.StatusPill
import com.quickpos.app.ui.navigation.Routes
import com.quickpos.app.util.AuthState
import com.quickpos.app.util.Fmt
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(nav: NavHostController) {
    val app = QuickPosApp.from(LocalContext.current)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val rate by app.currency.currentRateFlow().collectAsState(initial = 0.0)
    val history by app.currency.observeRateHistory().collectAsState(initial = emptyList())

    var businessName by remember { mutableStateOf("") }
    var rateInput by remember { mutableStateOf(if (rate > 0) rate.toString() else "") }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        businessName = app.settings.businessName()
    }

    LaunchedEffect(rate) {
        if (rate > 0 && rateInput.isBlank()) {
            rateInput = rate.toString()
        }
    }

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                busy = true
                runCatching {
                    val tmp = File(context.cacheDir, "import_backup.json")
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        tmp.outputStream().use { output -> input.copyTo(output) }
                    } ?: throw IllegalStateException("تعذر فتح الملف")
                    app.backup.importFromFile(tmp).getOrThrow()
                }.onSuccess { message = it }
                    .onFailure { message = it.message ?: "فشل الاستيراد" }
                busy = false
            }
        }
    }

    Scaffold(
        topBar = { ScreenBar("الإعدادات", onBack = { nav.popBackStack() }) },
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                SectionCard(title = "العملة (ربط الأسعار بالدولار)") {
                    Text(
                        "أسعار المنتجات محفوظة بالدولار، وعند تعديل سعر الصرف يتحول كل سعر البيع والربح تلقائياً بالجنيه.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("السعر الحالي", style = MaterialTheme.typography.bodyMedium)
                        StatusPill(
                            text = if (rate > 0) Fmt.sdg(rate) else "غير محدد",
                            color = if (rate > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    MoneyField(
                        value = rateInput,
                        onValueChange = { rateInput = it },
                        label = "سعر صرف الدولار (جنيه سوداني)",
                        suffix = "ج.س",
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                app.currency.setRate(rateInput.toDoubleOrNull() ?: 0.0)
                                message = "تم تحديث السعر — كل الأسعار تعدّلت تلقائياً"
                            }
                        },
                        enabled = (rateInput.toDoubleOrNull() ?: 0.0) > 0 && !busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("تحديث سعر الدولار") }
                    if (history.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        Text("سجل الأسعار:", style = MaterialTheme.typography.labelLarge)
                        history.take(5).forEach { r ->
                            DetailRow(
                                label = Fmt.dateTime(r.date),
                                value = Fmt.sdg(r.rateSdg),
                            )
                        }
                    }
                }
            }

            item {
                SectionCard(title = "البيانات الأساسية") {
                    OutlinedTextField(
                        value = businessName,
                        onValueChange = { businessName = it },
                        label = { Text("اسم المتجر") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            scope.launch { app.settings.put(SettingsRepository.KEY_BUSINESS_NAME, businessName.trim()) }
                            message = "تم الحفظ"
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("حفظ") }
                }
            }

            item {
                SectionCard(title = "النسخ الاحتياطي المحلي") {
                    Text(
                        "صدّر ملف نسخة احتياطية JSON واحفظه في أي مكان، ثم استورده أي وقت.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    runCatching { app.backup.exportToFile() }
                                        .onSuccess { (file, msg) ->
                                            message = msg
                                            try {
                                                val uri = FileProvider.getUriForFile(
                                                    context, "${context.packageName}.fileprovider", file,
                                                )
                                                val intent = Intent(Intent.ACTION_SEND).apply {
                                                    type = "application/json"
                                                    putExtra(Intent.EXTRA_STREAM, uri)
                                                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                                }
                                                context.startActivity(Intent.createChooser(intent, "احفظ النسخة الاحتياطية"))
                                            } catch (_: Exception) {
                                                message = "تم إنشاء الملف: ${file.absolutePath}"
                                            }
                                        }
                                        .onFailure { message = it.message ?: "فشل التصدير" }
                                    busy = false
                                }
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Download, contentDescription = null)
                            Text("تصدير ملف", modifier = Modifier.padding(start = 6.dp))
                        }
                        OutlinedButton(
                            onClick = { importLauncher.launch("*/*") },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.FileOpen, contentDescription = null)
                            Text("استيراد ملف", modifier = Modifier.padding(start = 6.dp))
                        }
                    }
                }
            }

            item {
                SectionCard(title = "الإدارة والتسجيل") {
                    val currentUser by AuthState.currentUser.collectAsState()
                    Text(
                        "المستخدم الحالي: ${currentUser?.fullName?.ifBlank { currentUser?.username } ?: "—"} (${currentUser?.role ?: ""})",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { nav.navigate(Routes.CUSTOMERS) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Filled.Money, contentDescription = null)
                        Text("العملاء والديون", modifier = Modifier.padding(start = 6.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { nav.navigate(Routes.SUPPLIERS) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Filled.LocalShipping, contentDescription = null)
                        Text("الموردون والاستلام", modifier = Modifier.padding(start = 6.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { nav.navigate(Routes.USERS) },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Filled.Groups, contentDescription = null)
                        Text("إدارة المستخدمين", modifier = Modifier.padding(start = 6.dp))
                    }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { AuthState.logout() },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                        Text("تسجيل الخروج", modifier = Modifier.padding(start = 6.dp))
                    }
                }
            }

            item {
                AppCard {
                    Text(
                        "QuickPOS v1.0 — نظام نقطة بيع بأسعار موحدة بالدولار، فواتير متعددة متزامنة، مسح باركود بالكاميرا، تقارير ربح وخسارة، وتوصيات عروض + كوبونات بضوابط زمن وعدد استخدام.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }

    message?.let {
        AppAlertDialog(title = "إشعار", text = it, onDismiss = { message = null })
    }
}