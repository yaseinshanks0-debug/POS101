package com.quickpos.app.ui.components

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.quickpos.app.data.repository.PosRepository
import com.quickpos.app.data.repository.Cart
import java.io.File
import kotlinx.coroutines.launch

@Composable
fun TransferSection(
    pos: PosRepository,
    cart: Cart,
    onMessage: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var currentCapture by remember { mutableStateOf<File?>(null) }

    val pickImage = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                try {
                    val input = context.contentResolver.openInputStream(uri)
                    val file = File(context.cacheDir, "camera/receipt_${System.currentTimeMillis()}.jpg")
                    file.parentFile?.mkdirs()
                    file.outputStream().use { output ->
                        input?.use { input.copyTo(output) }
                    }
                    input?.close()
                    pos.setTransferReceiptPath(file.absolutePath)
                    onMessage("تم حفظ صورة الإشعار")
                } catch (e: Exception) {
                    onMessage("فشل حفظ الصورة: ${e.message}")
                }
            }
        }
    }

    val takePicture = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success: Boolean ->
        if (success) {
            scope.launch {
                pos.setTransferReceiptPath(currentCapture?.absolutePath)
                onMessage("تم التقاط صورة الإشعار")
            }
        }
        currentCapture = null
    }

    Column(modifier = modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = cart.transferRef,
            onValueChange = pos::setTransferRef,
            label = { Text("مرجع/رقم التحويل") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ClickablePhoto(
                path = cart.transferReceiptPath,
                modifier = Modifier.size(72.dp)
            )
            Text(
                if (cart.transferReceiptPath != null) "صورة إشعار التحويل — اضغط لعرضها"
                else "لم تُرفق صورة إشعار بعد",
                style = MaterialTheme.typography.labelMedium,
                color = if (cart.transferReceiptPath != null) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(onClick = {
                val dir = File(context.cacheDir, "camera")
                dir.mkdirs()
                val file = File(dir, "shot_${System.currentTimeMillis()}.jpg")
                currentCapture = file
                val uri = FileProvider.getUriForFile(context, context.packageName + ".fileprovider", file)
                takePicture.launch(uri)
            }) {
                Icon(Icons.Filled.AddAPhoto, contentDescription = null)
                Text("كاميرا", modifier = Modifier.padding(start = 4.dp))
            }
            OutlinedButton(onClick = { pickImage.launch("image/*") }) {
                Text("معرض")
            }
        }
        if (cart.transferReceiptPath != null) {
            TextButton(onClick = { pos.setTransferReceiptPath(null) }) {
                Text("إزالة الصورة", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}
