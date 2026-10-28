document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");
    const container = document.getElementById("translationResults");
    const tableBody = document.getElementById("translationTableBody");

    const similarityResults = document.getElementById("similarityResults");
    const similaritySummary = document.getElementById("similaritySummary");
    const similarityDetails = document.getElementById("similarityDetails");

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

    function formatPercent(value) {
        if (value === null || value === undefined || value === "") {
            return "Unavailable";
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "Unavailable";
        }

        return `${number.toFixed(2)}%`;
    }

    function hasScore(value) {
        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value))
        );
    }

    function getScoreText(value) {
        return hasScore(value) ? formatPercent(value) : "Unavailable";
    }

    function addTableCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = String(value ?? "");
        row.appendChild(cell);
        return cell;
    }

    function addSectionHeading(parent, text) {
        addTextElement(parent, "h3", text);
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

    if (similarityResults) {
        similarityResults.hidden = true;
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
    addSectionHeading(container, "Translation Path");

    const pathLanguages = Array.isArray(result.language_path_display)
        ? result.language_path_display
        : ["English", ...selectedLanguages];

    const displayPath = [...pathLanguages];

    if (
        displayPath.length === 0 ||
        String(displayPath[0]).toLowerCase() !== "english"
    ) {
        displayPath.unshift("English");
    }

    displayPath.push("English (back-translation)");

    addTextElement(container, "p", displayPath.join(" → "));

    // Display the final English back-translation.
    addSectionHeading(container, "Final English Back-Translation");

    addTextElement(
        container,
        "p",
        result.final_translation || "No English back-translation returned."
    );

    // Display the individual translation steps.
    addSectionHeading(container, "Translation Steps");

    if (steps.length === 0) {
        addTextElement(container, "p", "No translation steps were returned.");

        if (tableBody) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No translation steps were returned.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        }

        addSectionHeading(container, "Semantic Similarity");
        addTextElement(
            container,
            "p",
            "No similarity scores are available because the backend returned no translation steps."
        );

        return;
    }

    let availableScoreCount = 0;
    let greatestLossStep = null;
    let greatestLoss = -Infinity;

    steps.forEach((step, index) => {
        const stepNumber = step.step ?? index + 1;

        const sourceName =
            step.source_language_name ||
            step.source_language ||
            "Unknown";

        const targetName =
            step.target_language_name ||
            step.target_language ||
            "Unknown";

        const scoreAvailable = hasScore(step.similarity_score);
        const lossAvailable = hasScore(step.estimated_meaning_loss);

        if (scoreAvailable) {
            availableScoreCount++;
        }

        if (
            lossAvailable &&
            Number(step.estimated_meaning_loss) > greatestLoss
        ) {
            greatestLoss = Number(step.estimated_meaning_loss);
            greatestLossStep = stepNumber;
        }

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
            `Step ${stepNumber}: ${sourceName} → ${targetName}`
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

        // Semantic similarity results for this step.
        addTextElement(card, "h5", "Semantic Similarity Analysis");

        addTextElement(
            card,
            "p",
            `Comparison text: ${
                step.comparison_text ||
                (index === 0
                    ? result.original_text || originalText || "(Unavailable)"
                    : steps[index - 1]?.back_translation ||
                      "(Previous back-translation unavailable)")
            }`
        );

        addTextElement(
            card,
            "p",
            `Similarity score: ${getScoreText(step.similarity_score)}`
        );

        addTextElement(
            card,
            "p",
            `Estimated meaning loss: ${getScoreText(
                step.estimated_meaning_loss
            )}`
        );

        container.appendChild(card);

        // Populate the results table.
        if (tableBody) {
            const row = document.createElement("tr");

            addTableCell(row, stepNumber);
            addTableCell(row, `${sourceName} → ${targetName}`);
            addTableCell(
                row,
                step.translated_text || "(No translation returned)"
            );
            addTableCell(
                row,
                step.back_translation || "(No back-translation returned)"
            );
            addTableCell(row, getScoreText(step.similarity_score));
            addTableCell(row, getScoreText(step.estimated_meaning_loss));

            tableBody.appendChild(row);
        }
    });

    // Semantic similarity overview and greatest-loss alert.
    addSectionHeading(container, "Semantic Similarity");

    if (availableScoreCount === 0) {
        addTextElement(
            container,
            "p",
            "Similarity scores are unavailable. Confirm that the backend has the similarity model installed, that scoring is enabled, and that the latest backend version has been deployed."
        );
    } else {
        addTextElement(
            container,
            "p",
            `Similarity scores are available for ${availableScoreCount} of ${steps.length} translation steps. Each step compares its English back-translation with the preceding English text. The first step is compared with the original message.`
        );

        if (result.similarity_model) {
            addTextElement(
                container,
                "p",
                `Model: ${result.similarity_model}`
            );
        }

        if (greatestLossStep !== null) {
            addTextElement(
                container,
                "p",
                `Greatest estimated meaning loss: Step ${greatestLossStep} (${formatPercent(greatestLoss)}).`
            );
        }

        if (similarityResults && similaritySummary && similarityDetails) {
            if (greatestLossStep !== null) {
                similaritySummary.textContent =
                    `Greatest estimated meaning loss: Step ${greatestLossStep}`;

                similarityDetails.textContent =
                    ` The estimated loss for this step is ${formatPercent(greatestLoss)}. These values are model-based estimates, not literal percentages of meaning lost.`;

                similarityResults.hidden = false;
            }
        }
    }

    addTextElement(
        container,
        "p",
        "Interpretation: Similarity is a model-based estimate of how semantically related two English texts are. Estimated meaning loss is calculated as 100 minus the normalized similarity score. Neither value is a guaranteed or scientifically calibrated percentage of meaning preserved or lost."
    );
});
