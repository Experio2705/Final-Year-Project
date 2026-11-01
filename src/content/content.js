
import {
    scanFormFields,
    validateField
} from "../utils/validator.js";

import panelStyles from "./panel.css?raw";

console.log("Fill Buddy Assistant loaded!");

// 1. Create Shadow DOM
const host = document.createElement("div");
host.id = "fill-buddy-host";

const shadow = host.attachShadow({ mode: "open" });

// 2. Create sidebar UI
shadow.innerHTML = `ok
    <style>
        ${panelStyles}
    </style>

    <button class="toggle-button">🛡️</button>

    <section class="panel">

        <header class="header">

            <div class="brand">
                <div class="logo">🛡️</div>

                <div>
                    <h2>Fill Buddy</h2>
                    <p>Intelligent Form Protection</p>
                </div>
            </div>

            <button class="close">&times;</button>

        </header>

        <main class="content">

            <div class="status">
                ● Protection Active
            </div>

            <button class="scan">
                Scan Current Page
            </button>

            <div class="results">
                <div class="empty">
                    Scan this webpage to detect form errors.
                </div>
            </div>

        </main>

    </section>
`;

// 3. Add sidebar to webpage
document.documentElement.appendChild(host);

function hasFormControls() {

    const forms = [...document.querySelectorAll("form")];

    return forms.some(form => {

        const fields = [
            ...form.querySelectorAll(`
                input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]),
                textarea,
                select
            `)
        ].filter(field =>
            !field.disabled &&
            field.getClientRects().length > 0
        );

        // Ignore empty forms
        if (fields.length === 0) return false;

        // Ignore search forms
        const formName = (
            form.id + " " +
            form.getAttribute("name") + " " +
            form.getAttribute("role") + " " +
            form.getAttribute("action")
        ).toLowerCase();

        const isSearchForm =
            formName.includes("search") ||
            fields.every(field =>
                field.type === "search" ||
                ["q", "query", "search", "keyword"].includes(
                    (field.name || "").toLowerCase()
                )
            );

        if (isSearchForm) return false;

        // A meaningful form should have at least two fields
        // or one strong identity field.
        const hasIdentityField = fields.some(field =>
            ["email", "password", "tel"].includes(field.type)
        );

        return fields.length >= 2 || hasIdentityField;
    });
}


function updateAssistantVisibility() {
    const hasForms = hasFormControls();

    host.style.setProperty(
        "display",
        hasForms ? "block" : "none",
        "important"
    );

    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("top", "100px", "important");
    host.style.setProperty("right", "20px", "important");
    host.style.setProperty("z-index", "2147483647", "important");
}

// Check when the page loads
updateAssistantVisibility();

// Detect forms added dynamically
const observer = new MutationObserver(() => {
    updateAssistantVisibility();
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});
// 4. Get elements
// Inspection remains inactive until the user requests a scan
let inspectionActive = false;
const toggleButton = shadow.querySelector(".toggle-button");
const panel = shadow.querySelector(".panel");
const closeButton = shadow.querySelector(".close");
const scanButton = shadow.querySelector(".scan");
const resultsContainer = shadow.querySelector(".results");

// 5. Open and close sidebar
toggleButton.addEventListener("click", () => {
    panel.classList.toggle("open");
});

closeButton.addEventListener("click", () => {
    panel.classList.remove("open");
});

// 6. Display scan results
function renderResults() {

    const results = scanFormFields();

    const errors = results.filter(field => !field.valid);

    resultsContainer.replaceChildren();

    const stats = document.createElement("div");
    stats.className = "stats";

    const values = [
        ["Forms", new Set(
                document.querySelectorAll(
                "input, textarea, select"
            )
        ).size > 0
        ? new Set(
            [...document.querySelectorAll("input, textarea, select")]
                .filter(field => !field.disabled && field.getClientRects().length > 0)
                .map(field => field.closest("form"))
                .filter(Boolean)
                    ).size
            : 0
        ],
        ["Fields", results.length],
        ["Errors", errors.length]
    ];

    values.forEach(([label, value]) => {

        const card = document.createElement("div");
        card.className = "stat";

        const number = document.createElement("strong");
        number.textContent = value;

        const caption = document.createElement("span");
        caption.textContent = label;

        card.append(number, caption);
        stats.appendChild(card);

    });

    resultsContainer.appendChild(stats);

    const title = document.createElement("h3");
    title.className = "errors-title";
    title.textContent = "Detected Issues";

    resultsContainer.appendChild(title);

    if (errors.length === 0) {

        const success = document.createElement("div");
        success.className = "success";
        success.textContent = "No validation errors found!";

        resultsContainer.appendChild(success);
        return;
    }

    errors.forEach(item => {

        const card = document.createElement("div");
        card.className = "error-card";

        const label = document.createElement("strong");
        label.textContent = item.label;

        const error = document.createElement("p");
        error.textContent = item.error;

        const suggestion = document.createElement("small");
        suggestion.textContent = item.suggestion;

        card.append(label, error, suggestion);

        resultsContainer.appendChild(card);

    });
}

// 7. Scan button
scanButton.addEventListener("click", () => {

    scanButton.disabled = true;
    scanButton.textContent = "Scanning...";

    inspectionActive = true;

    try {
        renderResults();
    } finally {
        scanButton.disabled = false;
        scanButton.textContent = "Scan Current Page";
    }

});

// 8. Real-time validation
function handleFieldValidation(event) {
    if (!inspectionActive) return;
    const field = event.target;

    if (
        !field.matches("input, textarea, select") ||
        field.disabled ||
        field.readOnly ||
        field.type === "hidden"
    ) {
        return;
    }

    const result = validateField(field);

    const oldMessage = field.nextElementSibling;

    if (
        oldMessage?.classList.contains("privacy-assistant-error")
    ) {
        oldMessage.remove();
    }

    field.classList.remove(
        "privacy-assistant-invalid",
        "privacy-assistant-valid"
    );

    if (!result.valid) {

        field.classList.add("privacy-assistant-invalid");

        const message = document.createElement("div");

        message.className = "privacy-assistant-error";
        message.textContent = result.suggestion;

        field.insertAdjacentElement("afterend", message);

    } else {

        field.classList.add("privacy-assistant-valid");

    }

    // Refresh sidebar if it is open
    if (panel.classList.contains("open")) {
        renderResults();
    }
}

document.addEventListener("input", handleFieldValidation);
document.addEventListener("change", handleFieldValidation);

const validationObserver = new MutationObserver(() => {

    if (panel.classList.contains("open")) {
        renderResults();
    }

});

validationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-invalid", "class"]
});

// 9. Preserve React popup communication
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.action === "SCAN_FORM") {

            const forms = document.querySelectorAll("form");
            const results = scanFormFields();

            const errors = results.filter(
                field => !field.valid
            );

            sendResponse({
                formCount: forms.length,
                fieldCount: results.length,
                errorCount: errors.length,
                errors
            });

        }

    }
);
