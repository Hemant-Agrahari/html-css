/**
 * modals.js
 * Handles global modal interactions and form submission routing.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Global VModal handler for [data-bs-toggle="modal"]
  document.addEventListener("click", (e) => {
    const target = e.target.closest('[data-bs-toggle="modal"]');
    if (!target) return;

    e.preventDefault();
    const modalId =
      target.getAttribute("data-bs-target") || target.getAttribute("href");
    if (!modalId) return;

    const modalElement = document.querySelector(modalId);
    if (modalElement && window.VModal) {
      const modal = VModal.getInstance(modalElement);
      modal.show();
    }
  });

  // Handle forms inside modals if needed
  const forms = document.querySelectorAll(".modal form");
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      // Logic for form submission could go here or in forms.js
      // If success, close modal:
      // const modal = VModal.getInstance(form.closest('.modal'));
      // modal.hide();
    });
  });
});
