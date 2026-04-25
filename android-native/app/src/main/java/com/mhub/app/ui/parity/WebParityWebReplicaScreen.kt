package com.mhub.app.ui.parity

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.viewinterop.AndroidView
import com.mhub.app.BuildConfig

private const val WEB_PARITY_TAG = "WebParityReplica"

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebParityWebReplicaScreen(
    pageKey: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val route = remember(pageKey) { WebRouteCatalog.byKey(pageKey) }
    val baseUrl = remember { normalizeWebBaseUrl(BuildConfig.WEB_REFERENCE_BASE_URL) }
    val routePath = remember(route) {
        route?.canonicalPath?.let(::resolveRoutePath) ?: "/"
    }
    val targetUrl = remember(baseUrl, routePath) { joinUrl(baseUrl, routePath) }
    val showReplicaChrome = false
    val autoLoginEnabled = remember(route) { route?.let(::shouldAutoLoginForRoute) == true }
    val initialUrl = remember(targetUrl) { targetUrl }

    var webViewRef by remember(pageKey) { mutableStateOf<WebView?>(null) }
    var isLoading by remember(pageKey) { mutableStateOf(true) }
    var autoLoginTriggered by remember(pageKey) { mutableStateOf(false) }

    DisposableEffect(pageKey) {
        onDispose {
            webViewRef?.stopLoading()
            webViewRef?.destroy()
            webViewRef = null
        }
    }

    Scaffold(
        topBar = {
            if (showReplicaChrome) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = route?.title ?: "Web replica",
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = route?.canonicalPath ?: pageKey,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(
                            onClick = {
                                val webView = webViewRef
                                if (webView?.canGoBack() == true) {
                                    webView.goBack()
                                } else {
                                    onBack()
                                }
                            },
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                        }
                    },
                    actions = {
                        IconButton(onClick = { webViewRef?.reload() }) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                        }
                        IconButton(
                            onClick = {
                                runCatching {
                                    context.startActivity(
                                        Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)),
                                    )
                                }
                            },
                        ) {
                            Icon(Icons.Filled.OpenInBrowser, contentDescription = "Open in browser")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
                )
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            if (route == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Unknown route: $pageKey")
                }
                return@Scaffold
            }

            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { viewContext ->
                    WebView(viewContext).apply {
                        webViewRef = this
                        val cookieManager = CookieManager.getInstance()
                        cookieManager.setAcceptCookie(true)
                        cookieManager.setAcceptThirdPartyCookies(this, true)

                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.databaseEnabled = true
                        settings.loadsImagesAutomatically = true
                        settings.useWideViewPort = true
                        settings.loadWithOverviewMode = true
                        settings.cacheMode = WebSettings.LOAD_DEFAULT
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

                        webChromeClient = object : WebChromeClient() {
                            override fun onProgressChanged(view: WebView?, progress: Int) {
                                isLoading = progress < 95
                            }
                        }
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?,
                            ): Boolean = false

                            override fun onPageFinished(view: WebView, url: String?) {
                                isLoading = false
                                if (
                                    autoLoginEnabled &&
                                    !autoLoginTriggered
                                ) {
                                    autoLoginTriggered = true
                                    view.evaluateJavascript(buildAutoLoginScript(routePath)) { result ->
                                        Log.d(
                                            WEB_PARITY_TAG,
                                            "auto-login route=$pageKey url=${url.orEmpty()} result=$result",
                                        )
                                    }
                                    view.postDelayed({
                                        view.evaluateJavascript("localStorage.getItem('android_parity_login_status')") { status ->
                                            Log.d(
                                                WEB_PARITY_TAG,
                                                "auto-login-status[15s] route=$pageKey url=${url.orEmpty()} status=$status",
                                            )
                                        }
                                    }, 15000)
                                    view.postDelayed({
                                        view.evaluateJavascript("localStorage.getItem('android_parity_login_status')") { status ->
                                            Log.d(
                                                WEB_PARITY_TAG,
                                                "auto-login-status[25s] route=$pageKey url=${url.orEmpty()} status=$status",
                                            )
                                        }
                                    }, 25000)
                                }
                            }
                        }
                        loadUrl(initialUrl)
                    }
                },
                update = { webView ->
                    webViewRef = webView
                    if (webView.url.isNullOrBlank()) {
                        webView.loadUrl(initialUrl)
                    }
                },
            )

            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                )
            }
        }
    }
}

private fun normalizeWebBaseUrl(raw: String): String {
    val fallback = "http://10.0.2.2:8081"
    val base = raw.trim().ifBlank { fallback }
    val normalizedHost = base
        .replace("://localhost", "://10.0.2.2")
        .replace("://127.0.0.1", "://10.0.2.2")
    return normalizedHost.removeSuffix("/")
}

private fun joinUrl(base: String, path: String): String {
    val normalizedPath = if (path.startsWith("/")) path else "/$path"
    return "$base$normalizedPath"
}

private fun resolveRoutePath(path: String): String {
    if (path == "*" || path.isBlank()) return "/404-not-found"
    return path
        .replace(":id", "demo")
        .replace(":postId", "demo")
        .replace(":userId", "demo")
        .replace(":token", "demo")
        .replace(":code", "demo")
        .replace(":slug", "demo")
}

private fun shouldAutoLoginForRoute(route: WebRouteReference): Boolean {
    if (route.key == "login" || route.key == "signup" || route.key == "forgot_password" || route.key == "reset_password") {
        return false
    }
    return BuildConfig.DEBUG &&
        BuildConfig.PARITY_AUTO_LOGIN_ENABLED &&
        BuildConfig.PARITY_TEST_IDENTIFIER.isNotBlank() &&
        BuildConfig.PARITY_TEST_PASSWORD.isNotBlank()
}

private fun escapeForJs(value: String): String {
    return value
        .replace("\\", "\\\\")
        .replace("'", "\\'")
}

private fun buildAutoLoginScript(targetPath: String): String {
    val identifier = escapeForJs(BuildConfig.PARITY_TEST_IDENTIFIER)
    val password = escapeForJs(BuildConfig.PARITY_TEST_PASSWORD)
    val safePath = escapeForJs(targetPath)
    val deviceFingerprint = escapeForJs("androidparity5554a1b2c3d4e5f6")

    return """
        (async function() {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const fetchWithTimeout = async (input, init, timeoutMs = 8000) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
              return await fetch(input, { ...(init || {}), signal: controller.signal });
            } finally {
              clearTimeout(timer);
            }
          };
          const done = (status, detail) => {
            const payload = { status, detail: detail || null, at: Date.now() };
            try {
              localStorage.setItem('android_parity_login_status', JSON.stringify(payload));
            } catch (_) {}
            return JSON.stringify(payload);
          };
          const setInputValue = (element, value) => {
            if (!element) return;
            element.focus();
            const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
            const setter = descriptor && descriptor.set;
            if (setter) {
              setter.call(element, '');
              element.dispatchEvent(new Event('input', { bubbles: true }));
              setter.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.blur();
          };
          const formLogin = () => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const idInput = inputs.find((input) => {
              const name = String(input.name || '').toLowerCase();
              const placeholder = String(input.placeholder || '').toLowerCase();
              const type = String(input.type || '').toLowerCase();
              if (type === 'password') return false;
              return (
                name.includes('identifier') ||
                name.includes('email') ||
                name.includes('phone') ||
                name.includes('mobile') ||
                placeholder.includes('email') ||
                placeholder.includes('phone') ||
                placeholder.includes('mobile') ||
                type === 'email' ||
                type === 'tel'
              );
            }) || inputs.find((input) => String(input.type || '').toLowerCase() !== 'password');
            const passwordInput = inputs.find((input) => {
              const type = String(input.type || '').toLowerCase();
              const name = String(input.name || '').toLowerCase();
              return type === 'password' || name.includes('password');
            });
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
            const signInButton = buttons.find((button) => {
              const text = String(button.textContent || button.value || '').toLowerCase();
              return (
                text.includes('sign in') ||
                text.includes('signin') ||
                text.includes('login') ||
                text.includes('continue')
              );
            });
            if (!idInput || !passwordInput || !signInButton) {
              return false;
            }
            setInputValue(idInput, '$identifier');
            setInputValue(passwordInput, '$password');
            signInButton.click();
            return true;
          };
          const markSessionAndRedirect = async () => {
            let meResponse = null;
            try {
              meResponse = await fetchWithTimeout('/api/auth/me', { credentials: 'include' }, 6500);
            } catch {
              return false;
            }
            if (!meResponse.ok) return false;
            localStorage.setItem('authSession', 'true');
            try {
              const user = await meResponse.json();
              localStorage.setItem('user', JSON.stringify(user));
              if (user && (user.id || user.user_id)) {
                const id = String(user.id || user.user_id);
                localStorage.setItem('userId', id);
                localStorage.setItem('user_id', id);
              }
            } catch (_) {}
            window.location.assign('$safePath');
            return true;
          };

          try {
            done('started');
            if (await markSessionAndRedirect()) return done('already_authenticated');
            const readCookie = (name) => {
              const key = encodeURIComponent(name) + '=';
              const parts = document.cookie ? document.cookie.split('; ') : [];
              for (const part of parts) {
                if (part.startsWith(key)) {
                  return decodeURIComponent(part.slice(key.length));
                }
              }
              return '';
            };

            await fetchWithTimeout('/api/auth/csrf-token', { credentials: 'include' }, 6500);
            const xsrf = readCookie('XSRF-TOKEN');
            const headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'X-MHub-Timestamp': String(Date.now()),
              'X-MHub-Nonce': 'android-webview-' + Date.now()
            };
            if (xsrf) {
              headers['X-XSRF-TOKEN'] = xsrf;
            }

            const loginResponse = await fetchWithTimeout('/api/auth/login', {
              method: 'POST',
              credentials: 'include',
              headers,
              body: JSON.stringify({
                identifier: '$identifier',
                password: '$password',
                deviceFingerprint: '$deviceFingerprint',
                platform: 'android-webview',
                screenResolution: window.innerWidth + 'x' + window.innerHeight
              })
            }, 9000);

            if (!loginResponse.ok) {
              let loginBody = '';
              try {
                loginBody = await loginResponse.text();
              } catch (_) {}
              console.log('ANDROID_PARITY_LOGIN_FAILED', loginResponse.status);
              formLogin();
              for (let attempt = 0; attempt < 8; attempt += 1) {
                await sleep(1200);
                if (await markSessionAndRedirect()) return done('form_login_success_after_http_fail', { attempt });
              }
              return done('login_http_fail', { status: loginResponse.status, body: String(loginBody || '').slice(0, 280) });
            }
            if (await markSessionAndRedirect()) return done('api_login_success');
            formLogin();
            for (let attempt = 0; attempt < 8; attempt += 1) {
              await sleep(1200);
              if (await markSessionAndRedirect()) return done('form_login_success_after_api_login', { attempt });
            }
            return done('no_session_after_login');
          } catch (error) {
            console.log('ANDROID_PARITY_LOGIN_ERROR', String(error));
            return done('error', String(error));
          }
        })();
    """.trimIndent()
}
