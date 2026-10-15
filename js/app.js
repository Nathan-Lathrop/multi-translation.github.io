
const form = document.getElementById("analysisForm");
const text = document.getElementById("sourceText");
const chain = document.getElementById("languageChain");
const add = document.getElementById("addLanguage");
const count = document.getElementById("translationCount");

// Replace this with your real Cloud Run service URL.
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

function sync() {
    const numberOfSteps = Number(count.value);

    while (
        chain.querySelectorAll(".language-step").length <
        numberOfSteps
    ) {
        const arrow = document.createElement("span");
        arrow.className = "chain-arrow";
        arrow.textContent = "→";

        const nextStep =
            chain.querySelectorAll(".language-step").length + 1;

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

add.onclick = () => {
    if (Number(count.value) < 5) {
        count.value = Number(count.value) + 1;
        sync();
    } else {
        alert("Phase 1 supports up to five translation steps.");
    }
};

count.onchange = sync;

form.onsubmit = async (event) => {
    event.preventDefault();

    const inputText = text.value.trim();

    if (!inputText) {
        text.focus();
        return;
    }

    if (API_URL.includes("YOUR-CLOUD-RUN-URL")) {
        alert("Replace the API_URL placeholder in app.js with your Cloud Run URL.");
        return;
    }

    const selectedLanguages = [
        ...chain.querySelectorAll(".language-select")
    ]
        .filter(select => select.parentElement.style.display !== "none")
        .map(select => select.value);

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
            headers: {
                "Content-Type": "application/json"
            },
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
                result.detail || `Backend error: ${response.status}`
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

sync();
