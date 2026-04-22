/**
 * accordion.js
 * Vanilla JS replacement for Bootstrap Accordions.
 */
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".accordion-button");
    if (!btn) return;

    e.preventDefault();
    const targetId =
      btn.getAttribute("data-bs-target") || btn.getAttribute("href");
    const target = document.querySelector(targetId);
    if (!target) return;

    const isExpanding = btn.classList.contains("collapsed");
    const parent = btn.closest(".accordion");

    // Close other items in the same accordion if it has data-bs-parent
    if (parent && isExpanding) {
      const openButtons = parent.querySelectorAll(
        ".accordion-button:not(.collapsed)",
      );
      openButtons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          closeAccordionItem(otherBtn);
        }
      });
    }

    if (isExpanding) {
      openAccordionItem(btn, target);
    } else {
      closeAccordionItem(btn, target);
    }
  });

  function openAccordionItem(btn, target) {
    btn.classList.remove("collapsed");
    btn.setAttribute("aria-expanded", "true");

    target.classList.remove("collapse");
    target.classList.add("collapsing");
    target.style.height = target.scrollHeight + "px";

    setTimeout(() => {
      target.classList.remove("collapsing");
      target.classList.add("collapse", "show");
      target.style.height = "";
    }, 350);
  }

  function closeAccordionItem(btn, target) {
    if (!target) {
      const targetId =
        btn.getAttribute("data-bs-target") || btn.getAttribute("href");
      target = document.querySelector(targetId);
    }
    if (!target) return;

    btn.classList.add("collapsed");
    btn.setAttribute("aria-expanded", "false");

    target.style.height = target.scrollHeight + "px";
    target.classList.remove("collapse", "show");
    target.classList.add("collapsing");
    void target.offsetHeight; // force reflow
    target.style.height = "0";

    setTimeout(() => {
      target.classList.remove("collapsing");
      target.classList.add("collapse");
      target.style.height = "";
    }, 350);
  }
});
