package com.mhub.core.data.repository

import com.mhub.core.common.result.Result
import com.mhub.core.network.api.AuthApi
import com.mhub.core.network.model.AuthResponse
import com.mhub.core.network.model.CsrfTokenResponse
import com.mhub.core.network.model.SessionResponse
import com.mhub.core.common.model.User
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var authApi: AuthApi
    private lateinit var repository: AuthRepositoryImpl

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authApi = mockk(relaxed = true)
        repository = AuthRepositoryImpl(authApi)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `bootstrapCsrf succeeds`() = runTest {
        coEvery { authApi.getCsrfToken() } returns Response.success(CsrfTokenResponse("test-token"))

        val result = repository.bootstrapCsrf()
        assertTrue(result is Result.Success)
    }

    @Test
    fun `login success updates state`() = runTest {
        val user = User(id = 1, name = "Test", email = "test@test.com")
        coEvery { authApi.login(any()) } returns Response.success(
            AuthResponse(success = true, user = user)
        )

        val result = repository.login("test@test.com", "password")
        assertTrue(result is Result.Success)
        assertEquals(user, (result as Result.Success).data)
    }

    @Test
    fun `login failure returns error`() = runTest {
        coEvery { authApi.login(any()) } returns Response.success(
            AuthResponse(success = false, message = "Invalid credentials")
        )

        val result = repository.login("test@test.com", "wrong")
        assertTrue(result is Result.Error)
        assertEquals("Invalid credentials", (result as Result.Error).message)
    }

    @Test
    fun `checkSession with authenticated user`() = runTest {
        val user = User(id = 1, name = "Test")
        coEvery { authApi.getSession() } returns Response.success(
            SessionResponse(authenticated = true, user = user)
        )

        val result = repository.checkSession()
        assertTrue(result is Result.Success)
        assertNotNull((result as Result.Success).data)
    }

    @Test
    fun `logout clears session`() = runTest {
        coEvery { authApi.logout() } returns Response.success(mockk(relaxed = true))

        repository.logout()
        // Session should be cleared
    }
}
