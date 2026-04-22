/**
 * VCarousel - A lightweight vanilla JS carousel replacement for Slick
 * Supports: slidesToShow, responsive breakpoints, dots, arrows, autoplay
 */
class VCarousel {
  constructor(element, options = {}) {
    if (!element) return;
    this.element = element;
    this.options = {
      slidesToShow: options.slidesToShow || 1,
      autoplay: options.autoplay || false,
      autoplaySpeed: options.autoplaySpeed || 3000,
      arrows: options.arrows !== undefined ? options.arrows : true,
      dots: options.dots !== undefined ? options.dots : true,
      responsive: options.responsive || [],
      ...options,
    };

    this.currentSlide = 0;
    this.list = element.querySelector(".slick-list");
    this.track =
      element.querySelector(".slick-track") ||
      element.querySelector(".vc-track");

    if (!this.track) {
      // Create list if missing
      if (!this.list) {
        this.list = document.createElement("div");
        this.list.className = "slick-list";
        // Move all children to the list temporarily
        while (element.firstChild) {
          this.list.appendChild(element.firstChild);
        }
        element.appendChild(this.list);
      }

      // Create track
      this.track = document.createElement("div");
      this.track.className = "vc-track slick-track";
      while (this.list.firstChild) {
        this.track.appendChild(this.list.firstChild);
      }
      this.list.appendChild(this.track);
    } else if (!this.list) {
      // If we have a track but no list (unusual but possible)
      this.list = document.createElement("div");
      this.list.className = "slick-list";
      element.insertBefore(this.list, this.track);
      this.list.appendChild(this.track);
    }

    this.slides = Array.from(this.track.children);

    if (this.slides.length === 0) return;

    this.init();
  }

  init() {
    // Setup classes
    this.element.classList.add("vc-carousel", "slick-initialized");

    // Handle responsiveness
    this.updateSettings();
    window.addEventListener("resize", () => this.updateSettings());

    // Create Navigation
    if (this.options.arrows) this.createArrows();
    if (this.options.dots) this.createDots();

    // Initial setup
    this.goTo(0);

    if (this.options.autoplay) {
      this.startAutoplay();
      this.element.addEventListener("mouseenter", () => this.stopAutoplay());
      this.element.addEventListener("mouseleave", () => this.startAutoplay());
    }
  }

  updateSettings() {
    let width = window.innerWidth;
    let matched = this.options;

    if (this.options.responsive) {
      const sorted = [...this.options.responsive].sort(
        (a, b) => a.breakpoint - b.breakpoint,
      );
      for (let res of sorted) {
        if (width <= res.breakpoint) {
          matched = { ...this.options, ...res.settings };
          break;
        }
      }
    }

    this.slidesToShow = matched.slidesToShow;
    this.slidesToScroll = matched.slidesToScroll || this.slidesToShow;
    this.updateLayout();
  }

  updateLayout() {
    const slideWidth = 100 / this.slidesToShow;
    this.slides.forEach((slide) => {
      slide.style.flex = `0 0 ${slideWidth}%`;
      slide.style.width = `${slideWidth}%`;
    });
  }

  goTo(index) {
    const maxIndex = this.slides.length - this.slidesToShow;

    if (index < 0) {
      index = this.options.infinite ? maxIndex : 0;
    } else if (index > maxIndex) {
      index = this.options.infinite ? 0 : maxIndex;
    }

    this.currentSlide = index;
    const slideWidth = 100 / this.slidesToShow;
    const offset = -(index * slideWidth);
    if (this.track) {
      this.track.style.transform = `translateX(${offset}%)`;
    }

    this.updateDots();
  }

  createArrows() {
    const prev = document.createElement("button");
    prev.className = "slick-prev vc-arrow";
    prev.innerHTML = "←";
    prev.onclick = () => {
      this.goTo(this.currentSlide - this.slidesToScroll);
      if (this.options.autoplay) this.resetAutoplay();
    };

    const next = document.createElement("button");
    next.className = "slick-next vc-arrow";
    next.innerHTML = "→";
    next.onclick = () => {
      this.goTo(this.currentSlide + this.slidesToScroll);
      if (this.options.autoplay) this.resetAutoplay();
    };

    this.element.appendChild(prev);
    this.element.appendChild(next);
  }

  createDots() {
    const dotsCount = Math.ceil(
      (this.slides.length - this.slidesToShow) / this.slidesToScroll + 1,
    );
    if (dotsCount <= 1) return;

    const dotsWrap = document.createElement("ul");
    dotsWrap.className = "slick-dots vc-dots";

    for (let i = 0; i < dotsCount; i++) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = i + 1;
      btn.onclick = () => {
        this.goTo(i * this.slidesToScroll);
        if (this.options.autoplay) this.resetAutoplay();
      };
      li.appendChild(btn);
      dotsWrap.appendChild(li);
    }

    this.element.appendChild(dotsWrap);
    this.dots = Array.from(dotsWrap.children);
  }

  updateDots() {
    if (!this.dots) return;
    const activeDotIndex = Math.floor(this.currentSlide / this.slidesToScroll);
    this.dots.forEach((dot, i) => {
      if (i === activeDotIndex) dot.classList.add("slick-active");
      else dot.classList.remove("slick-active");
    });
  }

  startAutoplay() {
    this.autoplayInterval = setInterval(() => {
      this.goTo(this.currentSlide + this.slidesToScroll);
    }, this.options.autoplaySpeed);
  }

  stopAutoplay() {
    clearInterval(this.autoplayInterval);
  }

  resetAutoplay() {
    this.stopAutoplay();
    this.startAutoplay();
  }
}

window.VCarousel = VCarousel;
