package com.quickpos.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.quickpos.app.ui.navigation.AppRoot
import com.quickpos.app.ui.theme.QuickPosTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            QuickPosTheme {
                AppRoot()
            }
        }
    }
}