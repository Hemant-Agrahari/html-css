/**
 * slick-init.js
 * Drop-in replacement to initialize VCarousel on elements that previously used Slick.
 */
document.addEventListener("DOMContentLoaded", () => {
  const sliders = document.querySelectorAll(
    ".brand-slider, .client-slider, .customer-testomial, .poker-script-slider, .slick-slider",
  );

  sliders.forEach((slider) => {
    // Basic detection of settings from data attributes or classes
    const options = {
      slidesToShow: parseInt(slider.dataset.slidesToShow) || 1,
      autoplay: slider.classList.contains("autoplay") || true,
      dots: true,
      arrows: true,
      infinite: true,
      responsive: [
        {
          breakpoint: 1024,
          settings: { slidesToShow: 2 },
        },
        {
          breakpoint: 768,
          settings: { slidesToShow: 1 },
        },
      ],
    };

    if (window.VCarousel) {
      new VCarousel(slider, options);
    }
  });
});
