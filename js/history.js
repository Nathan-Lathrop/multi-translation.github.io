import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    collection,
    getDocs,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const accountStatus = document.getElementById("accountStatus");
    const signInPrompt = document.getElementById("signInPrompt");
    const historyLoading = document.getElementById("historyLoading");
    const historyError = document.getElementById("historyError");
    const emptyHistory = document.getElementById("emptyHistory");
    const historyTableWrapper = document.getElementById("historyTableWrapper");
    const historyTableBody = document.getElementById("historyTableBody");

    const loginLink = document.getElementById("loginLink");
    const signOutButton = document.getElementById("signOutButton");

    function hideAllHistorySections() {
        historyLoading.hidden = true;
        historyError.hidden = true;
        emptyHistory.hidden = true;
        historyTableWrapper.hidden = true;
        signInPrompt.hidden = true;
    }

    function showError(message) {
        hideAllHistorySections();
        historyError.textContent = message;
        historyError.hidden = false;
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return "Unavailable";
        }

        // Firestore timestamps convert to JavaScript dates with toDate().
        const date = typeof dateValue.toDate === "function"
            ? dateValue.toDate()
            : new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Unavailable";
        }

        return date.toLocaleString();
    }

    function formatLanguages(record) {
        if (Array.isArray(record.languages)) {
            return record.languages.join(" → ");
        }

        if (Array.isArray(record.steps)) {
            return record.steps
                .map(step => step.language)
                .filter(Boolean)
                .join(" → ");
        }

        return "Unavailable";
    }

    function formatSimilarity(record) {
        // Saved translations store their steps inside translation_result.
        const steps = record.translation_result?.steps ?? [];
        const lastStep = steps[steps.length - 1];

        const score =
            record.final_similarity_score ??
            record.final_similarity ??
            record.similarity_score ??
            lastStep?.similarity_score;

        if (score === null || score === undefined) {
            return "Unavailable";
        }

        return `${Number(score).toFixed(2)}%`;
    }

    function createTableCell(value) {
        const cell = document.createElement("td");
        cell.textContent = value ?? "Unavailable";
        return cell;
    }

    function displayHistory(records) {
        historyTableBody.innerHTML = "";

        if (!Array.isArray(records) || records.length === 0) {
            hideAllHistorySections();
            emptyHistory.hidden = false;
            return;
        }

        records.forEach(record => {
            const row = document.createElement("tr");

            const dateValue =
                record.created_at ??
                record.timestamp ??
                record.date;

            const originalMessage =
                record.original_text ??
                record.original_message ??
                record.input_text ??
                "Unavailable";

            row.appendChild(createTableCell(formatDate(dateValue)));
            row.appendChild(createTableCell(originalMessage));
            row.appendChild(createTableCell(formatLanguages(record)));
            row.appendChild(createTableCell(formatSimilarity(record)));

            const viewCell = document.createElement("td");
            const viewButton = document.createElement("button");

            viewButton.textContent = "View";
            viewButton.className = "view-result";

            viewButton.addEventListener("click", () => {
                // Save the selected translation record for results.html.
                localStorage.setItem(
                    "indy2PrototypeInput",
                    originalMessage
                );

                localStorage.setItem(
                    "indy2HistoryRecord",
                    JSON.stringify(record)
                );

                // Open the results page.
                window.location.href = "results.html";
            });

            viewCell.appendChild(viewButton);
            row.appendChild(viewCell);

            historyTableBody.appendChild(row);
        });

        hideAllHistorySections();
        historyTableWrapper.hidden = false;
    }

    async function loadHistory(user) {
        try {
            historyLoading.hidden = false;
            historyError.hidden = true;

            // Read the signed-in user's saved translations, newest first.
            const historyQuery = query(
                collection(db, "users", user.uid, "translationHistory"),
                orderBy("created_at", "desc")
            );

            const snapshot = await getDocs(historyQuery);

            const records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            displayHistory(records);

        } catch (error) {
            console.error("History loading error:", error);
            showError(
                "Unable to load your translation history. Please try again later."
            );
        }
    }

    // Monitor Firebase authentication.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            accountStatus.textContent =
                `Signed in as ${user.email}`;

            loginLink.hidden = true;
            signOutButton.hidden = false;

            await loadHistory(user);

        } else {
            accountStatus.textContent = "You are not signed in.";

            signOutButton.hidden = true;
            loginLink.hidden = false;

            hideAllHistorySections();
            signInPrompt.hidden = false;
        }
    });

    // Sign-out functionality.
    signOutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (error) {
            console.error("Sign-out error:", error);
            showError("Unable to sign out. Please try again.");
        }
    });
});
