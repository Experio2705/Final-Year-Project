
function isVisible(element) {
    return element.getClientRects().length > 0 &&
        getComputedStyle(element).display !== "none" &&
        getComputedStyle(element).visibility !== "hidden";
}


// Ignore ordinary search forms
function isSearchField(field) {
    const form = field.closest("form");

    if (!form) return false;

    const controls = [
        ...form.querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
        )
    ];

    if (controls.length !== 1) return false;

    const name = (field.name || "").toLowerCase();
    const placeholder = (field.placeholder || "").toLowerCase();

    return (
        field.type === "search" ||
        name === "q" ||
        name === "search" ||
        placeholder.includes("search")
    );
}


// Find website-generated errors near a field
function getWebsiteError(field) {

    const wrapper = field.closest(
        ".form-group, .form-field, .field, .input-group"
    );

    if (!wrapper) return null;

    const errorElements = wrapper.querySelectorAll(`
        .error-message,
        .error,
        .error-text,
        .invalid-feedback,
        [role="alert"]
    `);

    for (const element of errorElements) {

        // Ignore Fill Buddy's own injected messages
        if (element.classList.contains("privacy-assistant-error")) {
            continue;
        }

        if (!isVisible(element)) continue;

        const message = element.textContent.trim();

        if (message) return message;
    }

    return null;
}
export function identifyFieldType(field) {
    const type = field.type?.toLowerCase() || "";

    const name = field.name?.toLowerCase() || "";
    const id = field.id?.toLowerCase() || "";
    const placeholder = field.placeholder?.toLowerCase() || "";
    const ariaLabel = field.getAttribute("aria-label")?.toLowerCase() || "";
    const label = field.labels?.[0]?.textContent?.toLowerCase() || "";

    const fieldInfo = `${name} ${id} ${placeholder} ${ariaLabel} ${label}`;

    // Dropdown
    if (field.tagName.toLowerCase() === "select") {
        return "select";
    }

    if (type === "checkbox" || type === "radio") {
        return type;
    }
    // Email
    if (type === "email" || /\bemail\b/.test(fieldInfo)) {
        return "email";
    }

    // Phone
    if (
        type === "tel" ||
        /phone|mobile|contact[_\s-]*number|telephone/.test(fieldInfo)
    ) {
        return "phone";
    }

    // URL
    if (type === "url" || /website|url/.test(fieldInfo)) {
        return "url";
    }

    // Password
    if (type === "password") {
        return "password";
    }

    // Number
    if (type === "number") {
        return "number";
    }

    // Date
    if (type === "date" || /date|dob|birth/.test(fieldInfo)) {
        return "date";
    }

    // Name
    if (/full[_\s-]*name|first[_\s-]*name|last[_\s-]*name/.test(fieldInfo)) {
        return "name";
    }

    // File
    if (type === "file" || /resume|upload|attachment/.test(fieldInfo)) {
        return "file";
    }

    // Default
    return "text";
}
function validateRadioGroup(field) {
    const name = field.name;

    if (!name) {
        return { valid: true, error: null, suggestion: null };
    }

    const group = document.querySelectorAll(
        `input[type="radio"][name="${CSS.escape(name)}"]`
    );

    const isRequired = [...group].some(radio => radio.required);
    const isSelected = [...group].some(radio => radio.checked);

    if (isRequired && !isSelected) {
        return {
            valid: false,
            error: "No radio option selected",
            suggestion: "Please select one of the available options."
        };
    }

    return { valid: true, error: null, suggestion: null };
}

export function validateField(field) {

    const value = field.value?.trim() ?? "";
    const validity = field.validity;

    // Native browser validation
    if (validity.badInput) {
        return {
            valid: false,
            error: "Invalid input",
            suggestion: "Enter a value in the expected format."
        };
    }

    if (validity.valueMissing) {
        return {
            valid: false,
            error: "Required field is empty",
            suggestion: "Please fill in or select this field."
        };
    }

    if (validity.typeMismatch) {
        return {
            valid: false,
            error: "Invalid input format",
            suggestion: field.type === "email"
                ? "Enter a valid email address."
                : "Enter a valid value."
        };
    }

    if (validity.patternMismatch) {
        return {
            valid: false,
            error: "Incorrect input format",
            suggestion: field.title ||
                "Check the required format for this field."
        };
    }

    if (validity.tooShort) {
        return {
            valid: false,
            error: "Input is too short",
            suggestion: `Enter at least ${field.minLength} characters.`
        };
    }

    if (validity.tooLong) {
        return {
            valid: false,
            error: "Input is too long",
            suggestion: `Enter no more than ${field.maxLength} characters.`
        };
    }

    if (validity.rangeUnderflow) {
        return {
            valid: false,
            error: "Value is too small",
            suggestion: `Enter a value greater than or equal to ${field.min}.`
        };
    }

    if (validity.rangeOverflow) {
        return {
            valid: false,
            error: "Value is too large",
            suggestion: `Enter a value less than or equal to ${field.max}.`
        };
    }

    if (validity.stepMismatch) {
        return {
            valid: false,
            error: "Invalid value increment",
            suggestion: `Follow the required step of ${field.step}.`
        };
    }

    if (!validity.valid) {
        return {
            valid: false,
            error: "Input does not meet requirements",
            suggestion: "Review this field's requirements."
        };
    }

    // Website-specific validation
    const websiteError = getWebsiteError(field);

    if (websiteError) {
        return {
            valid: false,
            error: websiteError,
            suggestion: "Please correct this field."
        };
    }
    // Semantic validation using identified field type
    const fieldType = identifyFieldType(field);

    if (fieldType === "email" && value !== "") {

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(value)) {
        return {
            valid: false,
            error: "Invalid email address",
            suggestion: "Enter a valid email address, such as name@example.com."
            };
        }
    }
    // Semantic phone validation
    if (fieldType === "phone" && value !== "") {

    const digits = value.replace(/\D/g, "");

    if (digits.length !== 10) {
        return {
            valid: false,
            error: "Invalid phone number",
            suggestion: "Enter a valid 10-digit Indian mobile number."
         };
        }
    }
    // Semantic URL validation
    if (fieldType === "url" && value !== "") {

    try {
        const url = new URL(value);

        if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
            throw new Error("Invalid URL");
        }

    } catch {
        return {
            valid: false,
            error: "Invalid URL",
            suggestion: "Enter a valid website address, such as https://example.com."
            };
        }
    }
    // Semantic password validation
    if (fieldType === "password" && value !== "") {

    if (value.length < 8) {
        return {
            valid: false,
            error: "Password is too short",
            suggestion: "Use at least 8 characters."
            };
        }
    }

    // File validation
if (field.type === "file") {

    const file = field.files?.[0];

    // Required file validation is handled by native browser validation.
    if (!file) {
        return {
            valid: !field.required,
            error: field.required ? "File is required" : null,
            suggestion: field.required
                ? "Please select a file to upload."
                : null
        };
    }

    // File size validation
    const maxSize = 2 * 1024 * 1024; // 2 MB

    if (file.size > maxSize) {
        return {
            valid: false,
            error: "File size exceeds the limit",
            suggestion: "Please upload a file smaller than 2 MB."
        };
    }

    // Allowed file extension validation
    const accept = field.getAttribute("accept");

    if (accept) {
        const allowedTypes = accept.split(",").map(type => type.trim().toLowerCase());

        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        const isAllowed = allowedTypes.some(type => {
            if (type.startsWith(".")) {
                return fileName.endsWith(type);
            }

            if (type.endsWith("/*")) {
                return fileType.startsWith(type.replace("*", ""));
            }

            return fileType === type;
        });

        if (!isAllowed) {
            return {
                valid: false,
                error: "Unsupported file format",
                suggestion: `Allowed formats: ${accept}`
            };
        }
    }
    // Radio group validation
    if (field.type === "radio") {
        return validateRadioGroup(field);
    }

        return {
        valid: true,
        error: null,
        suggestion: null
        };
    }

    // Semantic dropdown validation
    if (fieldType === "select") {
        const selectedOption = field.options[field.selectedIndex];

        if (field.required && (
            !selectedOption ||
            selectedOption.value.trim() === ""
        )) {
            return {
                valid: false,
                error: "No option selected",
                suggestion: "Please select an option from the dropdown."
            };
        }   
    }

    // Checkbox validation
    if (field.type === "checkbox") {

        if (field.required && !field.checked) {
            return {
                valid: false,
                error: "Required checkbox is not selected",
                suggestion: "Please check this box to continue."
            };
        }

        return {
            valid: true,
            error: null,
            suggestion: null
        };
    }
    return {
        valid: true,
        error: null,
        suggestion: null
    };
}


// Collect fields from the document and open Shadow DOMs
function collectFields(root) {

    const selector = `
        input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]):not([type="image"]),
        textarea,
        select
    `;

    const fields = [...root.querySelectorAll(selector)];

    root.querySelectorAll("*").forEach(element => {
        if (element.shadowRoot) {
            fields.push(...collectFields(element.shadowRoot));
        }
    });

    return fields;
}


export function scanFormFields() {

    const fields = collectFields(document);
    const results = [];
    

    fields.forEach((field, index) => {

        console.log(
    field.name || field.id || field.placeholder,
    "=>",
    identifyFieldType(field)
);
        if (field.disabled) return;

        // Ignore ordinary search bars
        if (isSearchField(field)) return;

        // Ignore fields in hidden steps or hidden sections
        if (!isVisible(field)) return;

        const result = validateField(field);

        const label =
            field.labels?.[0]?.innerText?.trim() ||
            field.getAttribute("aria-label") ||
            field.placeholder ||
            field.name ||
            `Field ${index + 1}`;

        results.push({
            index,
            label,
            type: field.type || field.tagName.toLowerCase(),
            valid: result.valid,
            error: result.error,
            suggestion: result.suggestion
        });
    });

    return results;
}
