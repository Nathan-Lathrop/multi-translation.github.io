
const form = document.getElementById("analysisForm");
const text = document.getElementById("sourceText");
const chain = document.getElementById("languageChain");
const add = document.getElementById("addLanguage");
const count = document.getElementById("translationCount");

const API_URL = "https://indy-2-api-1074577122547.us-east1.run.app/";

const opts = [
    ["zh-CN", "Chinese (zh-CN)"],
    ["es", "Spanish (es)"],
    ["ar", "Arabic (ar)"],
    ["fr", "French (fr)"],
    ["de", "German (de)"],
    ["ja", "Japanese (ja)"],
    ["ru", "Russian (ru)"],
    ["pt", "Portuguese (pt)"],
    ["it", "Italian (it)"],
    ["ko", "Korean (ko)"]
];

// Create a dropdown for one translation step.
function makeSelect(i) {
    const wrapper = document.createElement("div");
    wrapper.className = "language-step";

    const select = document.createElement("select");
    select.className = "language-select";
    select.setAttribute("aria-label", `Translation language ${i}`);

    opts.forEach(([code, name]) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    });

    select.selectedIndex = Math.min(i - 1, opts.length - 1);

    wrapper.appendChild(select);
    return wrapper;
}

// Keep the visible dropdowns synchronized with the selected step count.
function sync() {
    const numberOfSteps = Number(count.value);
    const currentSteps = chain.querySelectorAll(".language-step").length;

    while (chain.querySelectorAll(".language-step").length < numberOfSteps) {
        const arrow = document.createElement("span");
        arrow.className = "chain-arrow";
        arrow.textContent = "→";

        const nextStep = chain.querySelectorAll(".language-step").length + 1;

        chain.append(arrow, makeSelect(nextStep));
    }

    const steps = [...chain.querySelectorAll(".language-step")];
    const arrows = [...chain.querySelectorAll(".chain-arrow")];

    steps.forEach((step, i) => {
        step.style.display = i < numberOfSteps ? "" : "none";
    });

    arrows.forEach((arrow, i) => {
        arrow.style.display = i < numberOfSteps - 1 ? "" : "none";
    });
}

// Add another translation step, up to five.
add.onclick = () => {
    if (Number(count.value) < 5) {
        count.value = Number(count.value) + 1;
        sync();
    } else {
        alert("Phase 1 supports up to five translation steps.");
    }
};

count.onchange = sync;

// Submit the input to the Cloud Run backend.
form.onsubmit = async (event) => {
    event.preventDefault();

    const inputText = text.value.trim();

    if (!inputText) {
        text.focus();
        return;
    }

    if (
        !API_URL ||
        API_URL.includes("YOUR-CLOUD-RUN-URL")
    ) {
        alert(
            "The backend URL has not been configured. " +
            "Update API_URL in app.js first."
        );
        return;
    }

    const selectedLanguages = [
        ...chain.querySelectorAll(".language-select")
    ]
        .filter(select => select.parentElement.style.display !== "none")
        .map(select => select.value);

    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";
    }

    try {
        const response = await fetch(`${API_URL}/translate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: inputText,
                languages: selectedLanguages
            })
        });

        if (!response.ok) {
            const details = await response.text();

            throw new Error(
                `Backend error (${response.status}): ${details}`
            );
        }

        const result = await response.json();

        // Save the submitted input, selected languages, and API response.
        localStorage.setItem("indy2PrototypeInput", inputText);

        localStorage.setItem(
            "indy2PrototypeLanguages",
            JSON.stringify(selectedLanguages)
        );

        localStorage.setItem(
            "indy2TranslationResults",
            JSON.stringify(result)
        );

        // Open the results page after the backend responds successfully.
        window.location.href = "results.html";

    } catch (error) {
        console.error("Translation request failed:", error);

        alert(
            "The translation request failed.\n\n" +
            error.message +
            "\n\nCheck your Cloud Run URL, backend logs, " +
            "and browser console."
        );

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Analyze";
        }
    }
};

// Initialize the language dropdowns when the page loads.
sync();
