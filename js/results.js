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
        if (!hasScore(value)) {
            return "Unavailable";
        }

        return `${Number(value).toFixed(2)}%`;
    }

    function hasScore(value) {
        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value))
        );
    }

    function formatPercentagePoints(value) {
        if (!hasScore(value)) {
            return "Unavailable";
        }

        return `${Number(value).toFixed(2)} percentage points`;
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

    // Translation path.
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

    // Final English back-translation.
    addSectionHeading(container, "Final English Back-Translation");

    addTextElement(
        container,
        "p",
        result.final_translation || "No English back-translation returned."
    );

    addSectionHeading(container, "Translation Steps");

    if (steps.length === 0) {
        addTextElement(container, "p", "No translation steps were returned.");

        if (tableBody) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 8;
            cell.textContent = "No translation steps were returned.";
            row.appendChild(cell);
            tableBody.appendChild(row);
        }

        addSectionHeading(container, "Similarity and Meaning Loss");

        addTextElement(
            container,
            "p",
            "No scores are available because the backend returned no translation steps."
        );

        return;
    }

    let availableScoreCount = 0;
    let availablePreviousStepScoreCount = 0;

    let greatestCumulativeLoss = -Infinity;
    let greatestCumulativeLossStep = null;

    let greatestStepDrop = -Infinity;
    let greatestStepDropStep = null;

    let previousSimilarity = null;

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
        const previousStepScoreAvailable = hasScore(
            step.previous_step_similarity_score
        );

        // Calculate the step-to-step drop using the original-relative scores.
        // This is separate from similarity to the previous step.
        let stepDrop = null;

        if (scoreAvailable) {
            availableScoreCount++;

            const currentSimilarity = Number(step.similarity_score);

            if (previousSimilarity !== null) {
                stepDrop = Number(
                    (previousSimilarity - currentSimilarity).toFixed(2)
                );

                if (stepDrop > greatestStepDrop) {
                    greatestStepDrop = stepDrop;
                    greatestStepDropStep = stepNumber;
                }
            }

            previousSimilarity = currentSimilarity;
        } else {
            // Do not calculate a difference across a missing score.
            previousSimilarity = null;
        }

        if (previousStepScoreAvailable) {
            availablePreviousStepScoreCount++;
        }

        if (
            lossAvailable &&
            Number(step.estimated_meaning_loss) > greatestCumulativeLoss
        ) {
            greatestCumulativeLoss = Number(step.estimated_meaning_loss);
            greatestCumulativeLossStep = stepNumber;
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

        // Output 1: similarity to the original message.
        addTextElement(card, "h5", "Similarity to Original Message");

        addTextElement(
            card,
            "p",
            `Original message: ${
                result.original_text || originalText || "(Unavailable)"
            }`
        );

        addTextElement(
            card,
            "p",
            `Back-translation: ${
                step.back_translation || "(Unavailable)"
            }`
        );

        addTextElement(
            card,
            "p",
            `Similarity score: ${getScoreText(step.similarity_score)}`
        );

        // Output 2: cumulative loss relative to the original message.
        addTextElement(card, "h5", "Cumulative Meaning Loss");

        addTextElement(
            card,
            "p",
            `Estimated loss from original: ${getScoreText(
                step.estimated_meaning_loss
            )}`
        );

        // Output 3: similarity between consecutive English texts.
        addTextElement(card, "h5", "Similarity to Previous Step");

        addTextElement(
            card,
            "p",
            `Similarity score: ${getScoreText(
                step.previous_step_similarity_score
            )}`
        );

        // Output 4: change in similarity to the original since the prior step.
        addTextElement(card, "h5", "Change Since Previous Step");

        addTextElement(
            card,
            "p",
            stepDrop === null
                ? "No previous step score available for comparison."
                : stepDrop > 0
                    ? `Similarity to the original decreased by ${formatPercentagePoints(stepDrop)}.`
                    : stepDrop < 0
                        ? `Similarity to the original increased by ${formatPercentagePoints(Math.abs(stepDrop))}.`
                        : "Similarity to the original did not change from the previous step."
        );

        container.appendChild(card);

        // Results table.
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
            addTableCell(
                row,
                getScoreText(step.previous_step_similarity_score)
            );
            addTableCell(
                row,
                stepDrop === null
                    ? "N/A"
                    : formatPercentagePoints(stepDrop)
            );

            tableBody.appendChild(row);
        }
    });

    // Summary of all four outputs.
    addSectionHeading(container, "Similarity and Meaning Loss Summary");

    if (availableScoreCount === 0) {
        addTextElement(
            container,
            "p",
            "Similarity scores are unavailable. Check that the backend calculates and returns similarity_score and estimated_meaning_loss for each step."
        );
    } else {
        addTextElement(
            container,
            "p",
            `Similarity-to-original scores are available for ${availableScoreCount} of ${steps.length} steps.`
        );

        addTextElement(
            container,
            "p",
            `Previous-step similarity scores are available for ${availablePreviousStepScoreCount} of ${steps.length} steps.`
        );

        if (result.similarity_model) {
            addTextElement(
                container,
                "p",
                `Model: ${result.similarity_model}`
            );
        }

        // Largest cumulative loss from the original.
        if (greatestCumulativeLossStep !== null) {
            addTextElement(
                container,
                "p",
                `Largest cumulative loss relative to the original: Step ${greatestCumulativeLossStep}, with ${formatPercent(greatestCumulativeLoss)} estimated meaning loss.`
            );
        }

        // Largest loss increase between consecutive steps.
        if (greatestStepDropStep !== null && greatestStepDrop > 0) {
            addTextElement(
                container,
                "p",
                `Largest step-to-step similarity drop relative to the original: Step ${greatestStepDropStep}, decreasing by ${formatPercentagePoints(greatestStepDrop)} compared with the preceding step.`
            );
        } else if (greatestStepDropStep !== null) {
            addTextElement(
                container,
                "p",
                "No decrease in similarity to the original was observed between consecutive steps."
            );
        } else {
            addTextElement(
                container,
                "p",
                "A step-to-step change could not be calculated because at least two consecutive similarity scores were unavailable."
            );
        }

        // Populate the existing alert with the most important change.
        if (similarityResults && similaritySummary && similarityDetails) {
            if (greatestStepDropStep !== null && greatestStepDrop > 0) {
                similaritySummary.textContent =
                    `Largest similarity drop: Step ${greatestStepDropStep}`;

                similarityDetails.textContent =
                    ` Similarity to the original decreased by ${formatPercentagePoints(greatestStepDrop)} at this step.`;
                similarityResults.hidden = false;
            } else if (greatestCumulativeLossStep !== null) {
                similaritySummary.textContent =
                    `Largest cumulative loss: Step ${greatestCumulativeLossStep}`;

                similarityDetails.textContent =
                    ` Estimated meaning loss relative to the original is ${formatPercent(greatestCumulativeLoss)}.`;
                similarityResults.hidden = false;
            }
        }
    }

    addTextElement(
        container,
        "p",
        "Interpretation: Similarity to Original compares each English back-translation with the original message. Cumulative Meaning Loss is calculated as 100 minus that similarity score. Similarity to Previous Step compares the current English back-translation with the immediately preceding English text; for Step 1, the original message is used. Loss Increase vs. Previous Step is calculated by subtracting the current step's similarity to the original from the preceding step's similarity to the original. A positive value indicates a decrease in similarity to the original, while a negative value indicates an improvement. These are model-based estimates, not calibrated percentages of meaning preserved or lost."
    );
});
