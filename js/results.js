```javascript
document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");
    const resultsContainer = document.getElementById("translationResults");
    const tableBody = document.getElementById("translationTableBody");

    const originalText = localStorage.getItem("indy2PrototypeInput");
    const rawResults = localStorage.getItem("indy2TranslationResults");

    if (originalElement) {
        originalElement.textContent =
            originalText || "No original message found.";
    }

    function addElement(parent, tag, text, className = "") {
        const element = document.createElement(tag);
        element.textContent = text ?? "";
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
    }

    if (!rawResults) {
        if (resultsContainer) {
            addElement(
                resultsContainer,
                "p",
                "No translation results found. Return to the home page and submit a message."
            );
        }

        if (tableBody) {
            tableBody.replaceChildren();
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "No translation results available.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        }
        return;
    }

    let result;

    try {
        result = JSON.parse(rawResults);
    } catch (error) {
        console.error("Unable to parse saved translation results:", error);

        if (resultsContainer) {
            addElement(
                resultsContainer,
                "p",
                "The saved translation results could not be read."
            );
        }
        return;
    }

    const steps = Array.isArray(result.steps) ? result.steps : [];

    if (resultsContainer) {
        resultsContainer.replaceChildren();

        addElement(resultsContainer, "h2", "Translation Path");

        const path = Array.isArray(result.language_path_display)
            ? result.language_path_display
            : ["English"];

        addElement(resultsContainer, "p", path.join(" → "));

        addElement(resultsContainer, "h2", "Final Translation");
        addElement(
            resultsContainer,
            "p",
            result.final_translation || "No final translation returned."
        );
    }

    if (tableBody) {
        tableBody.replaceChildren();

        if (steps.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "No translation steps were returned.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        } else {
            steps.forEach((step) => {
                const row = document.createElement("tr");

                const language =
                    step.target_language_name ||
                    step.target_language ||
                    "Unknown";

                const values = [
                    step.step ?? "",
                    language,
                    step.translated_text || "",
                    step.back_translation || ""
                ];

                values.forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = String(value);
                    row.appendChild(cell);
                });

                tableBody.appendChild(row);
            });
        }
    }

    // Semantic similarity is not yet returned by the backend.
    const similarityResults =
        document.getElementById("similarityResults");

    if (similarityResults) {
        similarityResults.hidden = true;
    }
});
```
