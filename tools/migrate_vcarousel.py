import os
import re

pages_dir = 'pages'
js_template = """/* {title} Scripts - Vanilla Version */
document.addEventListener('DOMContentLoaded', function () {{
    // Services Carousel
    const servicesCarousel = document.querySelector(".services-carousel");
    if (servicesCarousel) {{
        new VCarousel(servicesCarousel, {{
            infinite: true,
            slidesToShow: 3,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                {{ breakpoint: 1024, settings: {{ slidesToShow: 3, slidesToScroll: 1 }} }},
                {{ breakpoint: 991, settings: {{ slidesToShow: 2, slidesToScroll: 1 }} }},
                {{ breakpoint: 767, settings: {{ slidesToShow: 1, slidesToScroll: 1 }} }}
            ]
        }});
    }}

    // Promo Carousel
    const promoCarousel = document.querySelector(".promo-carousel");
    if (promoCarousel) {{
        new VCarousel(promoCarousel, {{
            infinite: true,
            slidesToShow: 4,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                {{ breakpoint: 991, settings: {{ slidesToShow: 2, slidesToScroll: 1 }} }},
                {{ breakpoint: 767, settings: {{ slidesToShow: 1, slidesToScroll: 1 }} }}
            ]
        }});
    }}

    // Testimonial Carousel
    const testimonialCarousel = document.querySelector(".testimonial-carousel");
    if (testimonialCarousel) {{
        new VCarousel(testimonialCarousel, {{
            infinite: true,
            slidesToShow: 2,
            slidesToScroll: 1,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: false,
            dots: true,
            responsive: [
                {{ breakpoint: 767, settings: {{ slidesToShow: 1, slidesToScroll: 1 }} }}
            ]
        }});
    }}
}});
"""

def migrate():
    count = 0
    for root, dirs, files in os.walk(pages_dir):
        if 'home' in root: continue
        
        js_files = [f for f in files if f.endswith('.js')]
        html_files = [f for f in files if f == 'content.html']
        
        if js_files and html_files:
            js_path = os.path.join(root, js_files[0])
            html_path = os.path.join(root, html_files[0])
            
            # Read JS to check if it's a standard Slick file
            with open(js_path, 'r') as f:
                content = f.read()
                if 'slidesToShow' not in content: continue
            
            title = root.split('/')[-1].replace('-', ' ').title()
            
            # Rewrite JS
            with open(js_path, 'w') as f:
                f.write(js_template.format(title=title))
            
            # Modify HTML
            with open(html_path, 'r') as f:
                html = f.read()
            
            # Remove Slick CSS
            html = re.sub(r'<!-- Slick (Carousel|Slider) CSS -->.*?slick-theme\.css".*?/>', '<!-- Slick Carousel replaced by VCarousel -->\n    <link rel="stylesheet" href="../../shared/css/carousel.css" />\n    <script src="../../shared/js/modules/carousel-vanilla.js" defer></script>', html, flags=re.DOTALL)
            
            # Remove legacy JS
            html = re.sub(r'<!-- jQuery and Slick JS.*?slick\.min\.js"></script>', '', html, flags=re.DOTALL)
            html = re.sub(r'<script src="https://code\.jquery\.com/jquery-3\.6\.0\.min\.js"></script>.*?slick\.min\.js"></script>', '', html, flags=re.DOTALL)
            
            with open(html_path, 'w') as f:
                f.write(html)
            
            print(f"Migrated {root}")
            count += 1
    print(f"Total pages migrated: {count}")

if __name__ == "__main__":
    migrate()
