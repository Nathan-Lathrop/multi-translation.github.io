import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    const confirmPasswordGroup = document.getElementById(
        "confirmPasswordGroup"
    );

    const submitButton = document.getElementById("submitButton");
    const toggleAuthButton = document.getElementById("toggleAuthButton");
    const forgotPasswordButton = document.getElementById(
        "forgotPasswordButton"
    );

    const formTitle = document.getElementById("formTitle");
    const formDescription = document.getElementById("formDescription");
    const authMessage = document.getElementById("authMessage");
    const accountToggle = document.getElementById("accountToggle");

    let isCreatingAccount = false;

    // Display a message to the user.
    function showMessage(message, type = "") {
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    // Change between sign-in and account creation modes.
    function updateFormMode() {
        if (isCreatingAccount) {
            formTitle.textContent = "Create Account";

            formDescription.textContent =
                "Create an account to save and access your translation history.";

            submitButton.textContent = "Create Account";

            confirmPasswordGroup.hidden = false;
            confirmPasswordInput.required = true;
            confirmPasswordInput.disabled = false;
            confirmPasswordInput.value = "";

            passwordInput.autocomplete = "new-password";

            accountToggle.innerHTML = `
                Already have an account?
                <button type="button" id="toggleAuthButton" class="text-button">
                    Sign In
                </button>
            `;
        } else {
            formTitle.textContent = "Sign In";

            formDescription.textContent =
                "Sign in to access your account and saved translation history.";

            submitButton.textContent = "Sign In";

            confirmPasswordGroup.hidden = true;
            confirmPasswordInput.required = false;
            confirmPasswordInput.disabled = true;
            confirmPasswordInput.value = "";

            passwordInput.autocomplete = "current-password";

            accountToggle.innerHTML = `
                Don't have an account?
                <button type="button" id="toggleAuthButton" class="text-button">
                    Create an Account
                </button>
            `;
        }

        // Reconnect the button after updating its HTML.
        document.getElementById("toggleAuthButton").addEventListener(
            "click",
            toggleAuthMode
        );

        showMessage("");
    }

    function toggleAuthMode() {
        isCreatingAccount = !isCreatingAccount;
        updateFormMode();
    }

    // Initial button event.
    toggleAuthButton.addEventListener("click", toggleAuthMode);

    // Check whether the user is already signed in.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.href = "index.html";
        }
    });

    // Handle sign-in or account creation.
    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        submitButton.disabled = true;
        showMessage("Please wait...");

        try {
            if (isCreatingAccount) {
                const confirmPassword = confirmPasswordInput.value;

                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                }

                if (password.length < 6) {
                    throw new Error(
                        "Your password must contain at least 6 characters."
                    );
                }

                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                showMessage(
                    "Account created successfully. Redirecting...",
                    "success"
                );
            } else {
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

                showMessage(
                    "Sign-in successful. Redirecting...",
                    "success"
                );
            }

            // The authentication state listener will redirect the user.
        } catch (error) {
            console.error("Authentication error:", error);

            let message = "Authentication failed. Please try again.";

            switch (error.code) {
                case "auth/invalid-email":
                    message = "Please enter a valid email address.";
                    break;

                case "auth/user-not-found":
                case "auth/wrong-password":
                case "auth/invalid-credential":
                    message = "Incorrect email or password.";
                    break;

                case "auth/email-already-in-use":
                    message = "An account with this email already exists.";
                    break;

                case "auth/weak-password":
                    message = "Please choose a stronger password.";
                    break;

                case "auth/network-request-failed":
                    message = "Network error. Check your internet connection.";
                    break;

                default:
                    message = error.message || message;
            }

            showMessage(message, "error");
        } finally {
            submitButton.disabled = false;
        }
    });

    // Handle password reset.
    forgotPasswordButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();

        if (!email) {
            showMessage(
                "Enter your email address first to reset your password.",
                "error"
            );
            emailInput.focus();
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);

            showMessage(
                "If an account exists for this email, a password reset email will be sent.",
                "success"
            );
        } catch (error) {
            console.error("Password reset error:", error);

            showMessage(
                "Unable to send the password reset email. Please check the address and try again.",
                "error"
            );
        }
    });
});
