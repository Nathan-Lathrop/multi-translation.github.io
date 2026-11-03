document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");
    const container = document.getElementById("translationResults");
    const tableBody = document.getElementById("translationTableBody");

    const similarityResults = document.getElementById("similarityResults");
    const similaritySummary = document.getElementById("similaritySummary");
    const similarityDetails = document.getElementById("similarityDetails");

    // Saved data from either a new translation or the History page.
    const rawHistoryRecord = localStorage.getItem("indy2HistoryRecord");
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

    function hasScore(value) {
        return (
            value !== null &&
            value !== undefined &&
            value !== "" &&
            Number.isFinite(Number(value))
        );
    }

    function formatPercent(value) {
        if (!hasScore(value)) {
            return "Unavailable";
        }

        return `${Number(value).toFixed(2)}%`;
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

    function getOriginalText(result) {
        return (
            result.original_text ||
            result.original_message ||
            result.input_text ||
            originalText ||
            "No original message found."
        );
    }

    function getSteps(result) {
        return Array.isArray(result.steps) ? result.steps : [];
    }

    function getLanguages(result) {
        if (Array.isArray(result.language_path_display)) {
            return result.language_path_display;
        }

        if (Array.isArray(result.languages)) {
            return result.languages;
        }

        try {
            return JSON.parse(savedLanguages || "[]");
        } catch {
            return [];
        }
    }

    function getFinalTranslation(result, steps) {
        if (result.final_translation) {
            return result.final_translation;
        }

        if (result.final_back_translation) {
            return result.final_back_translation;
        }

        if (steps.length > 0) {
            return steps[steps.length - 1].back_translation ||
                "No English back-translation returned.";
        }

        return "No English back-translation returned.";
    }

    function displayResults(result, isHistoricalRecord = false) {
        const steps = getSteps(result);
        const message = getOriginalText(result);

        if (originalElement) {
            originalElement.textContent = message;
        }

        container.replaceChildren();

        if (tableBody) {
            tableBody.replaceChildren();
        }

        if (similarityResults) {
            similarityResults.hidden = true;
        }

        addTextElement(
            container,
            "h2",
            isHistoricalRecord
                ? "Saved Translation Results"
                : "Translation Results"
        );

        if (isHistoricalRecord) {
            addTextElement(
                container,
                "p",
                "Viewing a previously saved translation. No new translation was submitted."
            );
        }

        // Translation path.
        addSectionHeading(container, "Translation Path");

        const pathLanguages = getLanguages(result);
        const displayPath = [...pathLanguages];

        if (
            displayPath.length === 0 ||
            String(displayPath[0]).toLowerCase() !== "english"
        ) {
            displayPath.unshift("English");
        }

        if (
            String(displayPath[displayPath.length - 1]).toLowerCase() !==
            "english (back-translation)"
        ) {
            displayPath.push("English (back-translation)");
        }

        addTextElement(container, "p", displayPath.join(" → "));

        // Final English back-translation.
        addSectionHeading(container, "Final English Back-Translation");

        addTextElement(
            container,
            "p",
            getFinalTranslation(result, steps)
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
                "No scores are available because the saved record contains no translation steps."
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

            // Change in similarity relative to the original message.
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

            // Similarity to original.
            addTextElement(card, "h5", "Similarity to Original Message");

            addTextElement(
                card,
                "p",
                `Original message: ${message}`
            );

            addTextElement(
                card,
                "p",
                `Back-translation: ${step.back_translation || "(Unavailable)"}`
            );

            addTextElement(
                card,
                "p",
                `Similarity score: ${getScoreText(step.similarity_score)}`
            );

            // Cumulative meaning loss.
            addTextElement(card, "h5", "Cumulative Meaning Loss");

            addTextElement(
                card,
                "p",
                `Estimated loss from original: ${getScoreText(step.estimated_meaning_loss)}`
            );

            // Similarity to previous step.
            addTextElement(card, "h5", "Similarity to Previous Step");

            addTextElement(
                card,
                "p",
                `Similarity score: ${getScoreText(step.previous_step_similarity_score)}`
            );

            // Change since previous step.
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

                addTableCell(
                    row,
                    getScoreText(step.estimated_meaning_loss)
                );

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

        // Similarity summary.
        addSectionHeading(container, "Similarity and Meaning Loss Summary");

        if (availableScoreCount === 0) {
            addTextElement(
                container,
                "p",
                "Similarity scores are unavailable. Check the saved record or backend response."
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

            if (greatestCumulativeLossStep !== null) {
                addTextElement(
                    container,
                    "p",
                    `Largest cumulative loss relative to the original: Step ${greatestCumulativeLossStep}, with ${formatPercent(greatestCumulativeLoss)} estimated meaning loss.`
                );
            }

            if (greatestStepDropStep !== null && greatestStepDrop > 0) {
                addTextElement(
                    container,
                    "p",
                    `Largest step-to-step similarity drop relative to the original: Step ${greatestStepDropStep}, decreasing by ${formatPercentagePoints(greatestStepDrop)}.`
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
                    "A step-to-step change could not be calculated because consecutive similarity scores were unavailable."
                );
            }

            // Existing summary alert.
            if (similarityResults && similaritySummary && similarityDetails) {
                if (greatestStepDropStep !== null && greatestStepDrop > 0) {
                    similaritySummary.textContent =
                        `Largest similarity drop: Step ${greatestStepDropStep}`;

                    similarityDetails.textContent =
                        ` Similarity to the original decreased by ${formatPercentagePoints(greatestStepDrop)}.`;

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
            "Interpretation: Similarity to Original compares each English back-translation with the original message. Cumulative Meaning Loss is calculated as 100 minus that similarity score. Similarity to Previous Step compares the current English back-translation with the immediately preceding English text; for Step 1, the original message is used. Loss Increase vs. Previous Step measures the change in similarity to the original between consecutive steps. Positive values indicate a decrease in similarity, while negative values indicate an improvement. These are model-based estimates, not calibrated percentages of meaning preserved or lost."
        );
    }

    if (!container) {
        console.error("Missing #translationResults in results.html.");
        return;
    }

    // PRIORITY 1: Display a saved history record if one was selected.
    if (rawHistoryRecord) {
        try {
            const historyRecord = JSON.parse(rawHistoryRecord);

            // Some backends store the complete result inside a nested property.
            const savedResult =
                historyRecord.translation_result ||
                historyRecord.result ||
                historyRecord;

            displayResults(savedResult, true);

            // Remove the selected history record so it does not override
            // a future new translation when the user returns to this page.
            localStorage.removeItem("indy2HistoryRecord");

            return;

        } catch (error) {
            console.error("Unable to read historical translation:", error);

            addTextElement(
                container,
                "p",
                "The saved translation record could not be read."
            );

            localStorage.removeItem("indy2HistoryRecord");
            return;
        }
    }

    // PRIORITY 2: Display the most recent new translation.
    if (!rawResults) {
        if (originalElement) {
            originalElement.textContent =
                originalText || "No original message found.";
        }

        addTextElement(
            container,
            "h2",
            "Translation Results"
        );

        addTextElement(
            container,
            "p",
            "No translation results found. Return to the main page and submit a message."
        );

        return;
    }

    try {
        const result = JSON.parse(rawResults);
        displayResults(result, false);

    } catch (error) {
        console.error("Unable to parse saved translation results:", error);

        addTextElement(
            container,
            "p",
            "The saved translation results could not be read. Please run the analysis again."
        );
    }
});
