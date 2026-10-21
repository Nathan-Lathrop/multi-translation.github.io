const form = document.getElementById("analysisForm");
const text = document.getElementById("sourceText");
const chain = document.getElementById("languageChain");
const add = document.getElementById("addLanguage");
const count = document.getElementById("translationCount");

const API_URL = "https://indy-2-api-1074577122547.us-east1.run.app/";

const MAX_STEPS = 10;
const RANDOM_VALUE = "__random__";

let languageOptions = [];

function normalizeLanguages(data) {
    const languages = data.languages || [];

    // Supports the list-of-objects format from the updated backend.
    if (Array.isArray(languages)) {
        return languages
            .map((language) => ({
                code: language.code || language.language_code,
                name: language.name || language.display_name
            }))
            .filter((language) => language.code && language.name)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Also supports a code-to-name object, if your existing API uses one.
    return Object.entries(languages)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function populateSelect(select, searchTerm = "") {
    const previousValue = select.value;
    const query = searchTerm.trim().toLocaleLowerCase();

    select.replaceChildren(
        createOption(RANDOM_VALUE, "Random — choose automatically")
    );

    const filteredLanguages = languageOptions.filter((language) => {
        return (
            language.name.toLocaleLowerCase().includes(query) ||
            language.code.toLocaleLowerCase().includes(query)
        );
    });

    filteredLanguages.forEach((language) => {
        select.appendChild(
            createOption(
                language.code,
                `${language.name} (${language.code})`
            )
        );
    });

    const previousValueExists = [...select.options].some(
        (option) => option.value === previousValue
    );

    if (previousValueExists) {
        select.value = previousValue;
    } else if (filteredLanguages.length > 0) {
        select.value = filteredLanguages[0].code;
    } else {
        select.value = RANDOM_VALUE;
    }
}

function makeSelect(stepNumber) {
    const wrapper = document.createElement("div");
    wrapper.className = "language-step";

    const search = document.createElement("input");
    search.type = "search";
    search.className = "language-search";
    search.placeholder = "Search languages...";
    search.setAttribute(
        "aria-label",
        `Search languages for step ${stepNumber}`
    );
    search.autocomplete = "off";

    const select = document.createElement("select");
    select.className = "language-select";
    select.setAttribute(
        "aria-label",
        `Translation language for step ${stepNumber}`
    );

    populateSelect(select);

    search.addEventListener("input", () => {
        populateSelect(select, search.value);
    });

    wrapper.append(search, select);
    return wrapper;
}

function sync() {
    const numberOfSteps = Math.max(
        1,
        Math.min(MAX_STEPS, Number(count.value) || 1)
    );

    count.value = numberOfSteps;
    count.max = MAX_STEPS;

    while (chain.querySelectorAll(".language-step").length < numberOfSteps) {
        const existingSteps =
            chain.querySelectorAll(".language-step").length;
        const arrow = document.createElement("span");
        arrow.className = "chain-arrow";
        arrow.textContent = "→";

        chain.append(arrow, makeSelect(existingSteps + 1));
    }

    const steps = [...chain.querySelectorAll(".language-step")];
    const arrows = [...chain.querySelectorAll(".chain-arrow")];

    steps.forEach((step, index) => {
        step.style.display = index < numberOfSteps ? "" : "none";
    });

    arrows.forEach((arrow, index) => {
        arrow.style.display = index < numberOfSteps - 1 ? "" : "none";
    });
}

function getSelectedLanguages() {
    return [...chain.querySelectorAll(".language-step")]
        .filter((step) => step.style.display !== "none")
        .map((step) => step.querySelector(".language-select").value);
}

add.onclick = () => {
    if (Number(count.value) < MAX_STEPS) {
        count.value = Number(count.value) + 1;
        sync();
    } else {
        alert(`The maximum path length is ${MAX_STEPS} translation steps.`);
    }
};

count.onchange = sync;

async function loadLanguages() {
    const response = await fetch(`${API_URL}/languages`);

    if (!response.ok) {
        throw new Error(`Unable to load languages (HTTP ${response.status}).`);
    }

    const data = await response.json();
    languageOptions = normalizeLanguages(data);

    if (languageOptions.length === 0) {
        throw new Error("The backend returned no supported languages.");
    }

    // Refresh existing selectors while preserving their current selections.
    chain.querySelectorAll(".language-select").forEach((select) => {
        const search = select.parentElement.querySelector(".language-search");
        populateSelect(select, search ? search.value : "");
    });
}

form.onsubmit = async (event) => {
    event.preventDefault();

    const inputText = text.value.trim();

    if (!inputText) {
        text.focus();
        return;
    }

    if (API_URL.includes("YOUR-CLOUD-RUN-URL")) {
        alert("Set API_URL in js/app.js to your actual Cloud Run URL.");
        return;
    }

    if (languageOptions.length === 0) {
        alert("The language list has not loaded. Please refresh and try again.");
        return;
    }

    const selectedLanguages = getSelectedLanguages();

    if (selectedLanguages.length === 0) {
        alert("Add at least one translation step.");
        return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const originalButtonText = submitButton
        ? submitButton.textContent
        : "";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Translating...";
    }

    try {
        const response = await fetch(`${API_URL}/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: inputText,
                languages: selectedLanguages
            })
        });

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(
                `The backend returned an invalid response: ${responseText}`
            );
        }

        if (!response.ok) {
            throw new Error(
                result.detail || `Translation failed (HTTP ${response.status}).`
            );
        }

        localStorage.setItem("indy2PrototypeInput", inputText);
        localStorage.setItem(
            "indy2PrototypeLanguages",
            JSON.stringify(selectedLanguages)
        );
        localStorage.setItem(
            "indy2TranslationResults",
            JSON.stringify(result)
        );

        window.location.href = "results.html";
    } catch (error) {
        console.error("Translation request failed:", error);
        alert(
            "The translation request failed.\n\n" +
            error.message +
            "\n\nCheck your Cloud Run URL and backend logs."
        );
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
};

async function initialize() {
    count.max = MAX_STEPS;

    // Keep the existing starting step count, but enforce the new limit.
    count.value = Math.max(
        1,
        Math.min(MAX_STEPS, Number(count.value) || 1)
    );

    sync();

    if (API_URL.includes("YOUR-CLOUD-RUN-URL")) {
        console.warn("Set API_URL in js/app.js to your Cloud Run URL.");
        return;
    }

    try {
        await loadLanguages();
    } catch (error) {
        console.error("Could not load supported languages:", error);
        alert(
            "Could not load the Google Translate language list.\n\n" +
            error.message
        );
    }
}

async function initialize() {
    count.max = MAX_STEPS;
    count.value = Math.max(
        1,
        Math.min(MAX_STEPS, Number(count.value) || 1)
    );

    if (API_URL.includes("YOUR-CLOUD-RUN-URL")) {
        sync();
        console.warn("Set API_URL in js/app.js to your Cloud Run URL.");
        return;
    }

    try {
        await loadLanguages();
        sync();
    } catch (error) {
        console.error("Could not load supported languages:", error);
        sync();
        alert(
            "Could not load the Google Translate language list.\n\n" +
            error.message
        );
    }
}

initialize();
