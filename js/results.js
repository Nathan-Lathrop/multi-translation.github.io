
document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");

    const rawResults = localStorage.getItem("indy2TranslationResults");
    const originalText = localStorage.getItem("indy2PrototypeInput");
    const savedLanguages = localStorage.getItem("indy2PrototypeLanguages");

    // Display the original message.
    if (originalElement) {
        originalElement.textContent = originalText || "No original message found.";
    }

    // Find or create the results container.
    let container = document.getElementById("translationResults");

    if (!container && originalElement) {
        container = document.createElement("section");
        container.id = "translationResults";
        originalElement.insertAdjacentElement("afterend", container);
    }

    if (!container) {
        console.error("Could not find the original message or results container.");
        return;
    }

    container.replaceChildren();

    function addTextElement(parent, tag, textContent, className = "") {
        const element = document.createElement(tag);
        element.textContent = textContent;

        if (className) {
            element.className = className;
        }

        parent.appendChild(element);
        return element;
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
        console.error("Unable to parse translation results:", error);

        addTextElement(
            container,
            "p",
            "The saved translation results could not be read."
        );
        return;
    }

    const steps = Array.isArray(result.steps) ? result.steps : [];

    let languages = [];

    try {
        languages = JSON.parse(savedLanguages || "[]");
    } catch {
        languages = [];
    }

    // Show the translation path.
    addTextElement(container, "h3", "Translation Path");

    const path = [
        "English",
        ...(result.language_path_display || languages),
        ...(result.language_path_display ? [] : [])
    ];

    // language_path_display already includes the initial English entry.
    const displayPath = result.language_path_display
        ? result.language_path_display
        : ["English", ...languages.map(code => code)];

    if (
        displayPath.length > 0 &&
        displayPath[displayPath.length - 1] !== "English"
    ) {
        displayPath.push("English (back-translation)");
    }

    addTextElement(container, "p", displayPath.join(" → "));

    // Show the final translation.
    addTextElement(container, "h3", "Final Translation");

    addTextElement(
        container,
        "p",
        result.final_translation || "No final translation returned."
    );

    // Show each translation step.
    addTextElement(container, "h3", "Translation Steps");

    if (steps.length === 0) {
        addTextElement(container, "p", "No translation steps were returned.");
        return;
    }

    steps.forEach(step => {
        const card = document.createElement("article");
        card.className = "translation-result-step";

        card.style.border = "1px solid #ddd";
        card.style.borderRadius = "8px";
        card.style.padding = "16px";
        card.style.margin = "16px 0";

        const sourceName =
            step.source_language_name || step.source_language || "Unknown";

        const targetName =
            step.target_language_name || step.target_language || "Unknown";

        addTextElement(
            card,
            "h4",
            `Step ${step.step}: ${sourceName} → ${targetName}`
        );

        addTextElement(card, "h5", "Input to this step");
        addTextElement(card, "p", step.input_text || "(No input text returned)");

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
    });

    // Similarity scoring will be displayed here once implemented.
    addTextElement(container, "h3", "Semantic Similarity");

    addTextElement(
        container,
        "p",
        "Similarity scores are not available yet. The cross-encoder model has not been connected to the backend."
    );
});
