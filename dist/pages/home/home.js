/* pages/home/home.js */

document.addEventListener("DOMContentLoaded", () => {
  // Hero Form Validation
  const heroForm = document.getElementById("hero-contact-form");
  if (heroForm) {
    heroForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // Basic validation
      let isValid = true;
      const inputs = heroForm.querySelectorAll("input, textarea");

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          isValid = false;
          input.style.borderColor = "red";
        } else {
          input.style.borderColor = "#ddd";
        }
      });

      if (isValid) {
        alert("Thank you for your message! We will get back to you shortly.");
        heroForm.reset();
      } else {
        alert("Please fill in all required fields.");
      }
    });
  }

  // FAQ Accordion
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq-item");
      if (item) {
        item.classList.toggle("active");
        const icon = question.querySelector(".icon");
        if (icon) {
          icon.textContent = item.classList.contains("active") ? "-" : "+";
        }
      }
    });
  });

  // Testimonial Slider
  const slides = document.querySelectorAll(".testimonial-slide");
  const prevBtn = document.getElementById("prev-slide");
  const nextBtn = document.getElementById("next-slide");
  let currentSlide = 0;

  function showSlide(index) {
    slides.forEach((slide) => slide.classList.remove("active"));
    if (index >= slides.length) currentSlide = 0;
    else if (index < 0) currentSlide = slides.length - 1;
    else currentSlide = index;
    slides[currentSlide].classList.add("active");
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      currentSlide--;
      showSlide(currentSlide);
    });
    nextBtn.addEventListener("click", () => {
      currentSlide++;
      showSlide(currentSlide);
    });
  }

  // Testimonial Slider
  // ... (previous logic)

  // Initialize Lazy Loading
  if (window.ezUtils && window.ezUtils.initLazyLoading) {
    window.ezUtils.initLazyLoading();
  }
});
