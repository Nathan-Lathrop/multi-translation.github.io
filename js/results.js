
document.addEventListener("DOMContentLoaded", () => {
    const originalElement = document.getElementById("originalMessage");

    const originalText =
        localStorage.getItem("indy2PrototypeInput");

    const rawResults =
        localStorage.getItem("indy2TranslationResults");

    if (originalElement) {
        originalElement.textContent = originalText || "No original message found.";
    }

    // Find an existing results container if the page has one.
    // Otherwise, create one beneath the original message.
    let resultsContainer = document.getElementById("translationResults");

    if (!resultsContainer && originalElement) {
        resultsContainer = document.createElement("section");
        resultsContainer.id = "translationResults";
        originalElement.insertAdjacentElement("afterend", resultsContainer);
    }

    if (!resultsContainer) {
        console.error(
            "Could not find #originalMessage or create a results container."
        );
        return;
    }

    resultsContainer.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Translation Results";
    resultsContainer.appendChild(heading);

    if (!rawResults) {
        const message = document.createElement("p");
        message.textContent =
            "No translation results are saved. Return to the main page and submit a translation.";
        resultsContainer.appendChild(message);
        return;
    }

    let result;

    try {
        result = JSON.parse(rawResults);
    } catch (error) {
        console.error("Could not parse saved translation results:", error);

        const message = document.createElement("p");
        message.textContent = "The saved translation results could not be read.";
        resultsContainer.appendChild(message);
        return;
    }

    const languages = JSON.parse(
        localStorage.getItem("indy2PrototypeLanguages") || "[]"
    );

    const pathHeading = document.createElement("h3");
    pathHeading.textContent = "Selected Translation Path";
    resultsContainer.appendChild(pathHeading);

    const pathText = document.createElement("p");
    pathText.textContent = ["English", ...languages, "English"].join(" → ");
    resultsContainer.appendChild(pathText);

    const dataHeading = document.createElement("h3");
    dataHeading.textContent = "Backend Response";
    resultsContainer.appendChild(dataHeading);

    // Render the response safely as formatted text.
    // This works without assuming the backend's exact JSON field names.
    const responseDisplay = document.createElement("pre");
    responseDisplay.style.whiteSpace = "pre-wrap";
    responseDisplay.style.overflowWrap = "anywhere";
    responseDisplay.style.padding = "1rem";
    responseDisplay.style.borderRadius = "8px";
    responseDisplay.style.overflowX = "auto";
    responseDisplay.textContent = JSON.stringify(result, null, 2);

    resultsContainer.appendChild(responseDisplay);
});
