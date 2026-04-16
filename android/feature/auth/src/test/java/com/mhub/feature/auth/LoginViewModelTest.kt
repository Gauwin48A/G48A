package com.mhub.feature.auth

import com.mhub.core.common.model.User
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var authRepository: AuthRepository
    private lateinit var viewModel: LoginViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        authRepository = mockk(relaxed = true)
        coEvery { authRepository.isAuthenticated } returns flowOf(false)
        coEvery { authRepository.currentUser } returns flowOf(null)
        viewModel = LoginViewModel(authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is empty`() {
        val state = viewModel.uiState.value
        assertEquals("", state.identifier)
        assertEquals("", state.password)
        assertFalse(state.isLoading)
        assertFalse(state.isSuccess)
        assertNull(state.errorMessage)
    }

    @Test
    fun `login with blank identifier shows error`() {
        viewModel.updatePassword("password123")
        viewModel.login()

        val state = viewModel.uiState.value
        assertNotNull(state.identifierError)
        assertFalse(state.isLoading)
    }

    @Test
    fun `login with short password shows error`() {
        viewModel.updateIdentifier("test@example.com")
        viewModel.updatePassword("123")
        viewModel.login()

        val state = viewModel.uiState.value
        assertNotNull(state.passwordError)
    }

    @Test
    fun `successful login sets isSuccess`() = runTest {
        val user = User(id = 1, name = "Test User", email = "test@example.com")
        coEvery { authRepository.login(any(), any()) } returns Result.Success(user)

        viewModel.updateIdentifier("test@example.com")
        viewModel.updatePassword("password123")
        viewModel.login()

        val state = viewModel.uiState.value
        assertTrue(state.isSuccess)
        assertFalse(state.isLoading)
    }

    @Test
    fun `failed login shows error message`() = runTest {
        coEvery { authRepository.login(any(), any()) } returns Result.Error(
            Exception("Invalid credentials"), "Invalid credentials"
        )

        viewModel.updateIdentifier("test@example.com")
        viewModel.updatePassword("wrongpassword")
        viewModel.login()

        val state = viewModel.uiState.value
        assertFalse(state.isSuccess)
        assertEquals("Invalid credentials", state.errorMessage)
    }
}
