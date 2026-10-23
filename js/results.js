document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");
    const container = document.getElementById("translationResults");
    const tableBody = document.getElementById("translationTableBody");
    const rawResults = localStorage.getItem("indy2TranslationResults");
    const originalText = localStorage.getItem("indy2PrototypeInput");
    const savedLanguages = localStorage.getItem("indy2PrototypeLanguages");

    function addTextElement(parent, tag, textContent, className = "") {
        const element = document.createElement(tag);
        element.textContent = textContent ?? "";

        if (className) {
            element.className = className;
        }

        parent.appendChild(element);
        return element;
    }

    if (originalElement) {
        originalElement.textContent =
            originalText || "No original message found.";
    }

    if (!container) {
        console.error("Missing #translationResults in results.html.");
        return;
    }

    container.replaceChildren();

    if (tableBody) {
        tableBody.replaceChildren();
    }

    addTextElement(container, "h2", "Translation Results");

    if (!rawResults) {
        addTextElement(
            container,
            "p",
            "No translation results found. Return to the main page and submit a message."
        );
        return;
    }

    let result;

    try {
        result = JSON.parse(rawResults);
    } catch (error) {
        console.error("Unable to parse saved translation results:", error);

        addTextElement(
            container,
            "p",
            "The saved translation results could not be read. Please run the analysis again."
        );
        return;
    }

    const steps = Array.isArray(result.steps) ? result.steps : [];

    let selectedLanguages = [];

    try {
        selectedLanguages = JSON.parse(savedLanguages || "[]");
    } catch {
        selectedLanguages = [];
    }

    // Display the translation path.
    addTextElement(container, "h3", "Translation Path");

    const pathLanguages = Array.isArray(result.language_path_display)
        ? result.language_path_display
        : ["English", ...selectedLanguages];

    const displayPath = [...pathLanguages];

    if (
        displayPath.length === 0 ||
        displayPath[0].toLowerCase() !== "english"
    ) {
        displayPath.unshift("English");
    }

    displayPath.push("English (back-translation)");

    addTextElement(container, "p", displayPath.join(" → "));

    // Display the final English back-translation.
    addTextElement(container, "h3", "Final English Back-Translation");

    addTextElement(
        container,
        "p",
        result.final_translation || "No English back-translation returned."
    );

    // Display the individual translation steps.
    addTextElement(container, "h3", "Translation Steps");

    if (steps.length === 0) {
        addTextElement(container, "p", "No translation steps were returned.");

        if (tableBody) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 4;
            cell.textContent = "No translation steps were returned.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        }

        return;
    }

    steps.forEach((step, index) => {
        const sourceName =
            step.source_language_name ||
            step.source_language ||
            "Unknown";

        const targetName =
            step.target_language_name ||
            step.target_language ||
            "Unknown";

        // Detailed result card.
        const card = document.createElement("article");
        card.className = "translation-result-step";

        card.style.border = "1px solid #ddd";
        card.style.borderRadius = "8px";
        card.style.padding = "16px";
        card.style.margin = "16px 0";

        addTextElement(
            card,
            "h4",
            `Step ${step.step ?? index + 1}: ${sourceName} → ${targetName}`
        );

        addTextElement(card, "h5", "Input to this step");
        addTextElement(
            card,
            "p",
            step.input_text || "(No input text returned)"
        );

        addTextElement(card, "h5", "Translated Text");
        addTextElement(
            card,
            "p",
            step.translated_text || "(No translated text returned)"
        );

        addTextElement(card, "h5", "English Back-Translation");
        addTextElement(
            card,
            "p",
            step.back_translation || "(No back-translation returned)"
        );

        container.appendChild(card);

        // Populate the table that already exists in results.html.
        if (tableBody) {
            const row = document.createElement("tr");

            const values = [
                step.step ?? index + 1,
                `${sourceName} → ${targetName}`,
                step.translated_text || "(No translation returned)",
                step.back_translation || "(No back-translation returned)"
            ];

            values.forEach((value) => {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        }
    });

    // Explain the current status of semantic similarity scoring.
    addTextElement(container, "h3", "Semantic Similarity");

    addTextElement(
        container,
        "p",
        "Similarity scores are not available yet. The semantic similarity model has not been connected to the backend."
    );
});
