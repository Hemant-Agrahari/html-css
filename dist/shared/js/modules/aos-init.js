/**
 * aos-init.js
 * Vanilla JS replacement for AOS (Animate On Scroll) library.
 * Uses IntersectionObserver for better performance.
 */
document.addEventListener("DOMContentLoaded", () => {
  const aosElements = document.querySelectorAll("[data-aos]");

  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const animation = el.getAttribute("data-aos");
        const delay = el.getAttribute("data-aos-delay") || 0;
        const duration = el.getAttribute("data-aos-duration") || 400;

        el.style.animationDelay = `${delay}ms`;
        el.style.animationDuration = `${duration}ms`;
        el.classList.add("aos-animate", animation);

        // Optional: stop observing after animation triggers once
        // observer.unobserve(el);
      }
    });
  }, observerOptions);

  aosElements.forEach((el) => {
    observer.observe(el);
  });
});
