/**
 * VModal - A lightweight vanilla JS replacement for Bootstrap Modals.
 */
class VModal {
  constructor(element) {
    if (!element) return;
    this.element = element;
    this.backdrop = null;
    this.init();
  }

  init() {
    // Look for close buttons
    const closeButtons = this.element.querySelectorAll(
      '[data-bs-dismiss="modal"], .btn-close',
    );
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.hide());
    });

    // ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.element.classList.contains("show")) {
        this.hide();
      }
    });

    // Backdrop click
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) {
        this.hide();
      }
    });
  }

  show() {
    if (this.element.classList.contains("show")) return;

    // Create backdrop
    this.backdrop = document.createElement("div");
    this.backdrop.className = "modal-backdrop fade show";
    document.body.appendChild(this.backdrop);

    // Show modal
    this.element.style.display = "block";
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "0px";

    // Trigger reflow for animation
    void this.element.offsetWidth;
    this.element.classList.add("show");
  }

  hide() {
    if (!this.element.classList.contains("show")) return;

    this.element.classList.remove("show");
    if (this.backdrop) {
      this.backdrop.classList.remove("show");
    }

    setTimeout(() => {
      this.element.style.display = "none";
      if (this.backdrop) {
        this.backdrop.remove();
        this.backdrop = null;
      }
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";

      // Dispatch event for compatibility
      const event = new CustomEvent("hidden.bs.modal", { bubbles: true });
      this.element.dispatchEvent(event);
    }, 150);
  }
}

// Static instance tracker/getter
VModal.getInstance = function (element) {
  if (element._vmodal) return element._vmodal;
  element._vmodal = new VModal(element);
  return element._vmodal;
};

// Global polyfill for new bootstrap.Modal()
window.bootstrap = window.bootstrap || {};
window.bootstrap.Modal = VModal;
window.bootstrap.Modal.getInstance = VModal.getInstance;

window.VModal = VModal;
