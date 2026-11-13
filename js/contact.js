"use strict";

// Contact submission stays independent from navigation and animations.
(() => {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const endpoint = "https://formspree.io/f/mrpqborz";
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector("#form-status");
  const popup = document.querySelector("#contact-result");
  const popupTitle = document.querySelector("#contact-result-title");
  const popupMessage = document.querySelector("#contact-result-message");
  const buttonLabel = button.innerHTML;
  let sending = false;

  function showStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state;

    if (state === "sending") return;

    const title = state === "success" ? "Message sent" : "Message not confirmed";
    if (popup && typeof popup.showModal === "function") {
      popupTitle.textContent = title;
      popupMessage.textContent = message;
      popup.dataset.state = state;
      if (!popup.open) popup.showModal();
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  }

  // Native dialog handles Escape and traps focus; restore it on dismissal.
  popup?.addEventListener("close", () => button.focus({ preventScroll: true }));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;

    const data = new FormData(form);
    sending = true;
    button.disabled = true;
    button.textContent = "Sending...";
    form.setAttribute("aria-busy", "true");
    showStatus("Sending your message...", "sending");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const details = Array.isArray(result?.errors)
          ? result.errors
              .map((error) => error.message)
              .filter(Boolean)
              .join(" ")
          : "";
        showStatus(details || "Your message could not be sent. Please try again.", "error");
        return;
      }

      form.reset();
      showStatus("Thank you! Your message has been sent.", "success");
    } catch {
      // Keep the message available for retry after a connection failure.
      showStatus(
        "We could not confirm delivery. Check your connection before trying again.",
        "error",
      );
    } finally {
      sending = false;
      button.disabled = false;
      button.innerHTML = buttonLabel;
      form.removeAttribute("aria-busy");
    }
  });
})();
