const reviews = document.querySelector(".review-list");
const reviewButtons = document.querySelectorAll("[data-review-step]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

for (const button of reviewButtons) {
    button.hidden = false;
    button.addEventListener("click", () => {
        const cards = reviews.querySelectorAll(".review-card");
        const step = cards[1].offsetLeft - cards[0].offsetLeft;
        const lastPosition = reviews.scrollWidth - reviews.clientWidth;
        const direction = Number(button.dataset.reviewStep);
        let position = reviews.scrollLeft + step * direction;

        if (direction > 0 && reviews.scrollLeft >= lastPosition - 2) {
            position = 0;
        } else if (direction < 0 && reviews.scrollLeft <= 2) {
            position = lastPosition;
        }

        reviews.scrollTo({
            left: position,
            behavior: reducedMotion.matches ? "instant" : "smooth",
        });
    });
}

/* Contact form */
const form = document.querySelector("#contact-form");
const successMessage = document.querySelector("#success-message");
const formStatus = document.querySelector("#form-status");
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton.disabled || !form.reportValidity()) return;

    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    formStatus.textContent = "Sending your message…";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" },
            signal: controller.signal,
        });
        if (!response.ok) throw new Error("Submission failed");

        formStatus.textContent = "";
        form.reset();
        form.hidden = true;
        successMessage.hidden = false;
        successMessage.focus();
    } catch (error) {
        formStatus.textContent =
            error.name === "AbortError"
                ? "Delivery could not be confirmed. Please try again or email oksana1.1pleshkan@gmail.com."
                : "Your message could not be sent. Please try again or email oksana1.1pleshkan@gmail.com.";
    } finally {
        clearTimeout(timeout);
        submitButton.disabled = false;
        form.removeAttribute("aria-busy");
    }
});
