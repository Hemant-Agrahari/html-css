/* Desktop Dropdown Click Toggle & Mobile Accordion */
function initDropdowns() {
  const dropdownToggles = document.querySelectorAll(
    ".menu-header .dropdown-toggle",
  );

  dropdownToggles.forEach((toggle) => {
    toggle.removeAttribute("data-bs-toggle");

    // Prevent double-binding
    if (toggle.dataset.bound) return;
    toggle.dataset.bound = "true";

    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const parent = this.closest(".dropdown");
      const desktopMenu = parent.querySelector(".dropdown-menu");

      let mobileMenuId =
        this.getAttribute("href") || this.getAttribute("data-bs-target");
      if (mobileMenuId) mobileMenuId = mobileMenuId.replace("#", "");
      const mobileMenu = mobileMenuId
        ? document.getElementById(mobileMenuId)
        : null;

      if (window.innerWidth >= 992) {
        if (!desktopMenu) return;
        const isOpen = desktopMenu.classList.contains("show");
        document.querySelectorAll(".menu-header .dropdown").forEach((item) => {
          if (item !== parent) {
            item.classList.remove("show");
            const m = item.querySelector(".dropdown-menu");
            if (m) m.classList.remove("show");
            const link = item.querySelector(".nav-link");
            if (link) link.classList.remove("show");
          }
        });
        // Toggle current
        if (isOpen) {
          parent.classList.remove("show");
          desktopMenu.classList.remove("show");
          this.classList.remove("show");
        } else {
          parent.classList.add("show");
          desktopMenu.classList.add("show");
          this.classList.add("show");
        }
      } else if (mobileMenu) {
        const isShown = mobileMenu.classList.contains("show");

        if (isShown) {
          mobileMenu.style.height = mobileMenu.scrollHeight + "px";
          mobileMenu.classList.remove("collapse", "show");
          mobileMenu.classList.add("collapsing");
          void mobileMenu.offsetHeight; // trigger reflow
          mobileMenu.style.height = "0px";
          setTimeout(() => {
            mobileMenu.classList.remove("collapsing");
            mobileMenu.classList.add("collapse");
            mobileMenu.style.height = "";
          }, 350);
        } else {
          mobileMenu.classList.remove("collapse");
          mobileMenu.classList.add("collapsing");
          mobileMenu.style.height = mobileMenu.scrollHeight + "px";
          setTimeout(() => {
            mobileMenu.classList.remove("collapsing");
            mobileMenu.classList.add("collapse", "show");
            mobileMenu.style.height = "";
          }, 350);
        }
        this.classList.toggle("collapsed");
      }
    });
  });

  // Close on click outside (Desktop only)
  document.addEventListener("click", function (e) {
    if (window.innerWidth >= 992) {
      if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".menu-header .dropdown").forEach((item) => {
          item.classList.remove("show");
          const m = item.querySelector(".dropdown-menu");
          if (m) m.classList.remove("show");
          const link = item.querySelector(".nav-link");
          if (link) link.classList.remove("show");
        });
      }
    }
  });
}

// Ensure execution regardless of script load order
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDropdowns);
} else {
  initDropdowns();
}
