package com.mhub.app.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.mhub.app.R

@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
    error: String? = null,
    imeAction: androidx.compose.ui.text.input.ImeAction = androidx.compose.ui.text.input.ImeAction.Next,
    singleLine: Boolean = true,
) {
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    Column(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            singleLine = singleLine,
            isError = error != null,
            visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(
                keyboardType = if (isPassword) KeyboardType.Password else keyboardType,
                imeAction = imeAction,
            ),
            trailingIcon = {
                if (isPassword) {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        val icon = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility
                        val cd = stringResource(if (passwordVisible) R.string.password_hide else R.string.password_show)
                        Icon(icon, contentDescription = cd)
                    }
                }
            },
            supportingText = error?.let { { Text(it, color = MaterialTheme.colorScheme.error) } },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(4.dp))
    }
}
