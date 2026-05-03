package com.mhub.app.ui.parity

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp
import com.mhub.app.BuildConfig
import kotlinx.coroutines.delay

private const val WEB_PARITY_TAG = "WebParityReplica"
private const val WEB_REPLICA_USER_AGENT_TOKEN = "MhubAndroidWebReplica/1.0"
private const val CURRENT_USER_PLACEHOLDER = "__CURRENT_USER__"
private const val MAX_AUTO_RECOVERY_RELOADS = 2

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebParityWebReplicaScreen(
    pageKey: String,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val (normalizedPageKey, debugRouteOverridePath) = remember(pageKey) {
        splitDebugPageKey(pageKey)
    }
    val route = remember(normalizedPageKey) { WebRouteCatalog.byKey(normalizedPageKey) }
    val baseUrl = remember { normalizeWebBaseUrl(BuildConfig.WEB_REFERENCE_BASE_URL) }
    val routePath = remember(route, debugRouteOverridePath) {
        val candidatePath = debugRouteOverridePath ?: route?.canonicalPath ?: "/"
        resolveRoutePath(candidatePath)
    }
    val targetUrl = remember(baseUrl, routePath) { joinUrl(baseUrl, routePath) }
    val showReplicaChrome = false
    val autoLoginEnabled = remember(route) { route?.let(::shouldAutoLoginForRoute) == true }
    val initialUrl = remember(targetUrl) { targetUrl }

    var webViewRef by remember(pageKey) { mutableStateOf<WebView?>(null) }
    var isLoading by remember(pageKey) { mutableStateOf(true) }
    var initialPageReady by remember(pageKey) { mutableStateOf(false) }
    var autoLoginTriggered by remember(pageKey) { mutableStateOf(false) }
    var recoveryReloadCount by remember(pageKey) { mutableStateOf(0) }
    var loadingSlowHint by remember(pageKey) { mutableStateOf(false) }

    fun requestRecoveryReload(reason: String) {
        if (recoveryReloadCount >= MAX_AUTO_RECOVERY_RELOADS) return
        val view = webViewRef ?: return
        recoveryReloadCount += 1
        initialPageReady = false
        isLoading = true
        Log.w(
            WEB_PARITY_TAG,
            "recovery-reload route=$pageKey reason=$reason attempt=$recoveryReloadCount",
        )
        view.postDelayed({
            runCatching {
                view.stopLoading()
                view.loadUrl(initialUrl)
            }
        }, 1200)
    }

    // Vite/HMR reconnects can keep WebView progress below 95 for long stretches.
    // Trigger one recovery reload and then show a slow-loading hint without blanking the UI.
    LaunchedEffect(pageKey) {
        isLoading = true
        initialPageReady = false
        recoveryReloadCount = 0
        loadingSlowHint = false
        delay(9000)
        if (!initialPageReady) {
            requestRecoveryReload("startup_timeout")
            delay(7000)
            if (!initialPageReady) {
                loadingSlowHint = true
            }
        }
    }

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
                        settings.builtInZoomControls = false
                        settings.displayZoomControls = false
                        settings.setSupportZoom(false)
                        settings.cacheMode = WebSettings.LOAD_DEFAULT
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                        val currentUa = settings.userAgentString.orEmpty()
                        if (!currentUa.contains(WEB_REPLICA_USER_AGENT_TOKEN, ignoreCase = true)) {
                            settings.userAgentString = "$currentUa $WEB_REPLICA_USER_AGENT_TOKEN".trim()
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onProgressChanged(view: WebView?, progress: Int) {
                                if (!initialPageReady) {
                                    isLoading = progress < 95
                                }
                            }
                        }
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView?,
                                request: WebResourceRequest?,
                            ): Boolean = false

                            override fun onReceivedError(
                                view: WebView,
                                request: WebResourceRequest,
                                error: WebResourceError,
                            ) {
                                super.onReceivedError(view, request, error)
                                if (!request.isForMainFrame) return
                                Log.w(
                                    WEB_PARITY_TAG,
                                    "main-frame-error route=$pageKey code=${error.errorCode} desc=${error.description}",
                                )
                                requestRecoveryReload("main_frame_error_${error.errorCode}")
                            }

                            override fun onReceivedHttpError(
                                view: WebView,
                                request: WebResourceRequest,
                                errorResponse: WebResourceResponse,
                            ) {
                                super.onReceivedHttpError(view, request, errorResponse)
                                if (!request.isForMainFrame) return
                                if (errorResponse.statusCode >= 500) {
                                    Log.w(
                                        WEB_PARITY_TAG,
                                        "main-frame-http-error route=$pageKey status=${errorResponse.statusCode}",
                                    )
                                    requestRecoveryReload("main_frame_http_${errorResponse.statusCode}")
                                }
                            }

                            override fun onPageFinished(view: WebView, url: String?) {
                                initialPageReady = true
                                isLoading = false
                                loadingSlowHint = false
                                view.evaluateJavascript(buildWebReplicaSurfaceScript(routePath)) { result ->
                                    Log.v(
                                        WEB_PARITY_TAG,
                                        "surface-patch route=$pageKey url=${url.orEmpty()} result=$result",
                                    )
                                }
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
                        initialPageReady = false
                        isLoading = true
                        webView.loadUrl(initialUrl)
                    }
                },
            )

            if (isLoading) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CircularProgressIndicator()
                    if (loadingSlowHint) {
                        Text(
                            text = "Still loading live data…",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                        Text(
                            text = "Keeping connection active and retrying.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
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
        .replace(":id", "1")
        .replace(":postId", "1")
        .replace(":userId", CURRENT_USER_PLACEHOLDER)
        .replace(":token", "sample-token")
        .replace(":code", "INVITE123")
        .replace(":slug", "mobiles")
}

private fun splitDebugPageKey(rawPageKey: String): Pair<String, String?> {
    val marker = "~route~"
    val markerIndex = rawPageKey.indexOf(marker)
    if (markerIndex <= 0) return rawPageKey to null
    val key = rawPageKey.substring(0, markerIndex)
    val encodedPath = rawPageKey.substring(markerIndex + marker.length)
    if (encodedPath.isBlank()) return key to null
    val decodedPath = runCatching { Uri.decode(encodedPath) }.getOrNull().orEmpty().trim()
    if (decodedPath.isBlank()) return key to null
    return key to decodedPath
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

private fun buildWebReplicaSurfaceScript(targetPath: String): String {
    val safeTargetPath = escapeForJs(targetPath)
    return """
        (function () {
          var targetPath = '$safeTargetPath' || '/category-hub';
          try {
            window.__MHUB_ANDROID_WEB_REPLICA__ = true;
            document.documentElement.setAttribute('data-android-web-replica', '1');
            document.documentElement.setAttribute('data-native-platform', '1');
            if (document.body) {
              document.body.setAttribute('data-android-web-replica', '1');
              document.body.setAttribute('data-native-platform', '1');
            }
          } catch (_) {}
          try {
            var cap = window.Capacitor || {};
            if (typeof cap.isNativePlatform !== 'function') {
              cap.isNativePlatform = function () { return true; };
            }
            if (typeof cap.getPlatform !== 'function') {
              cap.getPlatform = function () { return 'android'; };
            }
            window.Capacitor = cap;
          } catch (_) {}
          try {
            localStorage.setItem('mhub_layout_preview_mode', 'mobile');
            localStorage.setItem('mhub_layout_preview_user', '1');
            sessionStorage.setItem('mhub_layout_preview_session', '1');
            localStorage.removeItem('mhub_parity_offline_auth');
            sessionStorage.removeItem('mhub_parity_offline_auth');
            var categoryGroup = '';
            try {
              var query = '';
              if (targetPath.indexOf('?') >= 0) {
                query = targetPath.split('?').slice(1).join('?');
              }
              var params = new URLSearchParams(query || '');
              categoryGroup = String(
                params.get('category_group') ||
                params.get('categoryGroup') ||
                params.get('group') ||
                ''
              ).trim().toLowerCase();
              if (categoryGroup) {
                if (categoryGroup.indexOf('electronic') === 0 || categoryGroup.indexOf('mobile') === 0) {
                  categoryGroup = 'electronics';
                } else if (categoryGroup.indexOf('fashion') === 0) {
                  categoryGroup = 'fashion';
                } else if (categoryGroup.indexOf('vehicle') === 0 || categoryGroup.indexOf('auto') === 0) {
                  categoryGroup = 'vehicles';
                } else if (categoryGroup === 'other') {
                  categoryGroup = 'others';
                }
                localStorage.setItem('mhub:active-app', categoryGroup);
                localStorage.removeItem('mhub:category-mode');
                localStorage.removeItem('mhub:subcategory-mode');
              }
            } catch (_) {}
            if (!localStorage.getItem('mhub-theme')) {
              localStorage.setItem('mhub-theme', 'light');
              localStorage.setItem('darkMode', 'false');
            }
            var skipPayload = JSON.stringify({ skipped: true, timestamp: Date.now() });
            localStorage.setItem('mhub_location_skipped', skipPayload);
            sessionStorage.setItem('mhub_location_skipped', skipPayload);
            localStorage.setItem('android_parity_target_path', targetPath);
            document.documentElement.setAttribute('data-layout-preview', 'mobile');
            if (document.body) {
              document.body.setAttribute('data-layout-preview', 'mobile');
            }
          } catch (_) {}
          try {
            var style = document.getElementById('mhub-android-replica-style');
            if (!style) {
              style = document.createElement('style');
              style.id = 'mhub-android-replica-style';
              style.textContent = 'html,body{max-width:100%;overflow-x:hidden !important;}html[data-native-platform] body::before{display:none !important;}html[data-native-platform] #root{width:100% !important;max-width:none !important;margin-inline:0 !important;border:0 !important;box-shadow:none !important;transform:none !important;}.location-accuracy-badge-wrap,.location-accuracy-badge,.location-accuracy-badge-close{display:none !important;}';
              document.head.appendChild(style);
            }
          } catch (_) {}
          return 'surface_patch_ok';
        })();
    """.trimIndent()
}

private fun buildAutoLoginScript(targetPath: String): String {
    val identifier = escapeForJs(BuildConfig.PARITY_TEST_IDENTIFIER)
    val password = escapeForJs(BuildConfig.PARITY_TEST_PASSWORD)
    val safePath = escapeForJs(targetPath)
    val userPathPlaceholder = escapeForJs(CURRENT_USER_PLACEHOLDER)
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
          const resolveTargetPath = (userId) => {
            const template = '$safePath';
            const placeholder = '$userPathPlaceholder';
            if (!template.includes(placeholder)) return template;
            const localId = String(userId || localStorage.getItem('userId') || localStorage.getItem('user_id') || '1');
            return template.replace(placeholder, encodeURIComponent(localId));
          };
          const clearLocalSession = () => {
            try {
              localStorage.removeItem('authSession');
              localStorage.removeItem('user');
              localStorage.removeItem('userId');
              localStorage.removeItem('user_id');
            } catch (_) {}
          };
          const persistSessionFromUser = (user) => {
            try {
              localStorage.setItem('authSession', 'true');
              if (user && typeof user === 'object') {
                localStorage.setItem('user', JSON.stringify(user));
              }
              const rawId =
                (user && (user.id ?? user.user_id)) ??
                localStorage.getItem('userId') ??
                localStorage.getItem('user_id');
              if (rawId !== null && rawId !== undefined && String(rawId).trim()) {
                const id = String(rawId).trim();
                localStorage.setItem('userId', id);
                localStorage.setItem('user_id', id);
                return id;
              }
            } catch (_) {}
            return '';
          };
          const probeServerSession = async () => {
            try {
              const sessionResponse = await fetchWithTimeout('/api/auth/session', { credentials: 'include' }, 6500);
              if (sessionResponse.ok) {
                let sessionPayload = null;
                try {
                  sessionPayload = await sessionResponse.json();
                } catch (_) {}
                if (sessionPayload?.authenticated || sessionPayload?.hasRefreshCookie) {
                  const idFromSession = persistSessionFromUser(
                    sessionPayload?.user || sessionPayload?.profile || null
                  );
                  return { ok: true, userId: idFromSession };
                }
              }
            } catch (_) {}

            try {
              const meResponse = await fetchWithTimeout('/api/auth/me', { credentials: 'include' }, 6500);
              if (!meResponse.ok) return { ok: false, userId: '' };
              let meUser = null;
              try {
                meUser = await meResponse.json();
              } catch (_) {}
              const idFromMe = persistSessionFromUser(meUser);
              return { ok: true, userId: idFromMe };
            } catch (_) {
              return { ok: false, userId: '' };
            }
          };
          const markSessionAndRedirect = async () => {
            const probe = await probeServerSession();
            if (!probe.ok) {
              clearLocalSession();
              return false;
            }
            window.location.assign(resolveTargetPath(probe.userId));
            return true;
          };

          let watchdog = null;
          try {
            done('started');
            watchdog = setTimeout(() => {
              try {
                if (localStorage.getItem('authSession') === 'true') return;
                done('watchdog_timeout');
              } catch (_) {}
            }, 14000);
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

            try {
              await fetchWithTimeout('/api/auth/csrf-token', { credentials: 'include' }, 6500);
            } catch (_) {}
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

            let loginResponse = null;
            try {
              loginResponse = await fetchWithTimeout('/api/auth/login', {
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
            } catch (error) {
              formLogin();
              for (let attempt = 0; attempt < 5; attempt += 1) {
                await sleep(1200);
                if (await markSessionAndRedirect()) return done('form_login_success_after_network_timeout', { attempt });
              }
              return done('network_timeout_login_failed', String(error));
            }

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
              return done('http_login_failed', { status: loginResponse.status, body: String(loginBody || '').slice(0, 280) });
            }
            if (await markSessionAndRedirect()) return done('api_login_success');
            formLogin();
            for (let attempt = 0; attempt < 8; attempt += 1) {
              await sleep(1200);
              if (await markSessionAndRedirect()) return done('form_login_success_after_api_login', { attempt });
            }
            return done('no_session_after_login');
          } catch (error) {
            console.log('ANDROID_PARITY_LOGIN_ERROR', String(error || 'unknown'));
            return done('script_error', String(error));
          } finally {
            if (watchdog) {
              clearTimeout(watchdog);
            }
          }
        })();
    """.trimIndent()
}
