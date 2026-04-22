/**
 * offcanvas.js
 * Vanilla JS replacement for Bootstrap Offcanvas.
 */
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest('[data-bs-toggle="offcanvas"]');
    const dismiss = e.target.closest('[data-bs-dismiss="offcanvas"]');

    if (toggle) {
      e.preventDefault();
      const targetId =
        toggle.getAttribute("data-bs-target") || toggle.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) openOffcanvas(target);
    } else if (dismiss) {
      e.preventDefault();
      const target = dismiss.closest(".offcanvas");
      if (target) closeOffcanvas(target);
    } else {
      // Outside click detection
      const openOffcanvasEl = document.querySelector(".offcanvas.show");
      if (openOffcanvasEl && !e.target.closest(".offcanvas") && !toggle) {
        closeOffcanvas(openOffcanvasEl);
      }
    }
  });

  function openOffcanvas(el) {
    el.classList.add("showing");
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "0px"; // Prevent layout shift if possible

    setTimeout(() => {
      el.classList.remove("showing");
      el.classList.add("show");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("role", "dialog");
    }, 10);
  }

  function closeOffcanvas(el) {
    el.classList.add("hiding");
    el.classList.remove("show");

    setTimeout(() => {
      el.classList.remove("hiding");
      el.removeAttribute("aria-modal");
      el.removeAttribute("role");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }, 300);
  }
});
