/* San Diego Heater Tune Ups Scripts - Vanilla Version */
document.addEventListener('DOMContentLoaded', function () {
    // Services Carousel
    const servicesCarousel = document.querySelector(".services-carousel");
    if (servicesCarousel) {
        new VCarousel(servicesCarousel, {
            infinite: true,
            slidesToShow: 3,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                { breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 1 } },
                { breakpoint: 991, settings: { slidesToShow: 2, slidesToScroll: 1 } },
                { breakpoint: 767, settings: { slidesToShow: 1, slidesToScroll: 1 } }
            ]
        });
    }

    // Promo Carousel
    const promoCarousel = document.querySelector(".promo-carousel");
    if (promoCarousel) {
        new VCarousel(promoCarousel, {
            infinite: true,
            slidesToShow: 4,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                { breakpoint: 991, settings: { slidesToShow: 2, slidesToScroll: 1 } },
                { breakpoint: 767, settings: { slidesToShow: 1, slidesToScroll: 1 } }
            ]
        });
    }

    // Testimonial Carousel
    const testimonialCarousel = document.querySelector(".testimonial-carousel");
    if (testimonialCarousel) {
        new VCarousel(testimonialCarousel, {
            infinite: true,
            slidesToShow: 2,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                { breakpoint: 767, settings: { slidesToShow: 1, slidesToScroll: 1 } }
            ]
        });
    }
});
