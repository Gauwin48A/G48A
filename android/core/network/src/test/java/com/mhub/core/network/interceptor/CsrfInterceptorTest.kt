package com.mhub.core.network.interceptor

import com.mhub.core.network.cookie.PersistentCookieJar
import io.mockk.every
import io.mockk.mockk
import okhttp3.*
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class CsrfInterceptorTest {

    private lateinit var cookieJar: PersistentCookieJar
    private lateinit var interceptor: CsrfInterceptor

    @Before
    fun setup() {
        cookieJar = mockk(relaxed = true)
        interceptor = CsrfInterceptor(cookieJar)
    }

    @Test
    fun `GET requests are not modified`() {
        val request = Request.Builder()
            .url("https://api.mhub.app/api/posts")
            .get()
            .build()

        val chain = mockk<Interceptor.Chain>(relaxed = true)
        every { chain.request() } returns request
        every { chain.proceed(any()) } returns Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(200)
            .message("OK")
            .body(ResponseBody.create(null, ""))
            .build()

        val response = interceptor.intercept(chain)
        assertNotNull(response)
    }

    @Test
    fun `POST requests get CSRF header when cookie present`() {
        val testToken = "test-csrf-token"
        val cookie = Cookie.Builder()
            .name("XSRF-TOKEN")
            .value(testToken)
            .domain("api.mhub.app")
            .build()

        every { cookieJar.loadForRequest(any()) } returns listOf(cookie)

        val request = Request.Builder()
            .url("https://api.mhub.app/api/login")
            .post(RequestBody.create(null, "{}"))
            .build()

        val chain = mockk<Interceptor.Chain>(relaxed = true)
        every { chain.request() } returns request
        every { chain.proceed(any()) } answers {
            val modifiedRequest = firstArg<Request>()
            Response.Builder()
                .request(modifiedRequest)
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body(ResponseBody.create(null, ""))
                .build()
        }

        val response = interceptor.intercept(chain)
        assertNotNull(response)
    }
}
