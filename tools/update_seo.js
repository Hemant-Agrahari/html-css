const fs = require("fs");
const filePath = "pages/home/content.html";
let content = fs.readFileSync(filePath, "utf8");

const newSeo = `    <title>Expert HVAC Services &amp; Repairs in San Diego – Contact Us Today! | EZ Heat &amp; Air</title>
    <meta name="description" content="Looking for expert HVAC services? EZ Heat and Air provides top-quality repairs, installations, and maintenance. Book your service today and stay comfortable!" />
    <meta name="publisher" content="EZplumbingusa" />
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow, noimageindex, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
    <meta property="og:title" content="Expert HVAC Services &amp; Repairs in San Diego – Contact Us Today! | EZ Heat &amp; Air" />
    <meta property="og:description" content="Looking for expert HVAC services? EZ Heat and Air provides top-quality repairs, installations, and maintenance. Book your service today and stay comfortable!" />
    <meta property="og:url" content="https://www.ezheatandair.com/" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Expert HVAC Services &amp; Repairs in San Diego – Contact Us Today! | EZ Heat &amp; Air" />
    <meta name="twitter:description" content="Looking for expert HVAC services? EZ Heat and Air provides top-quality repairs, installations, and maintenance. Book your service today and stay comfortable!" />
    <link rel="canonical" href="https://www.ezheatandair.com/" />
    <meta name="google-site-verification" content="sk4u_N9HoSFPqfKako6gsLfBPi9onVbr40hURKpuzHI" />
    <meta name="msvalidate.01" content="54FCA1907D994E234DF3F8DA34CEE9A1" />
    <script type="application/ld+json">
      [
        {
          "@context": "https://schema.org",
          "@id": "https://en.wikipedia.org/wiki/San_Diego_California_area",
          "@type": "LocalBusiness",
          "name": "EZ Heat and Air",
          "image": "https://www.ezheatandair.com/images/ez-brand-logo.webp",
          "url": "https://www.ezheatandair.com/",
          "telephone": "844-755-7889",
          "priceRange": "$$",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "29610 Buena Tierra",
            "addressLocality": "Sun City",
            "addressRegion": "CA",
            "postalCode": "92586",
            "addressCountry": "US"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 33.6904912,
            "longitude": -117.1822276
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "00:00",
            "closes": "23:59"
          },
          "sameAs": [
            "https://www.yelp.com/biz/ez-heat-and-air-sun-city",
            "https://www.facebook.com/ezheatandair",
            "https://twitter.com/ezheatandair",
            "https://www.mapquest.com/us/california/ez-heat-and-air-san-diego-440603622"
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "EZ Heat and Air",
          "alternateName": "EZ Heat & Air",
          "url": "https://www.ezheatandair.com/",
          "logo": "https://www.ezheatandair.com/images/ez-brand-logo.webp",
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "844-755-7889",
            "contactType": "customer service",
            "contactOption": "TollFree",
            "areaServed": "US"
          }
        },
        {
          "@context": "https://schema.org/",
          "@type": "HVACBusiness",
          "name": "EZ Heat and Air",
          "legalName": "EZ Heat and Air",
          "url": "https://www.ezheatandair.com/",
          "logo": "https://www.ezheatandair.com/images/ez-brand-logo.webp",
          "image": "https://www.ezheatandair.com/images/ez-brand-logo.webp",
          "description": "EZ Heat and Air is your trusted partner for comprehensive HVAC services in San Diego, Orange County, and Riverside, California...",
          "telephone": "844-755-7889",
          "priceRange": "$",
          "hasMap": "https://maps.app.goo.gl/j6eRiQ6GNxQRVtow6",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "29610 Buena Tierra",
            "addressLocality": "Sun City",
            "addressRegion": "CA",
            "postalCode": "92586",
            "addressCountry": "United States"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 33.6904912,
            "longitude": -117.1822276
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "844-755-7889",
            "email": "sales@ezheatandair.com",
            "contactType": "Customer Service",
            "availableLanguage": "English"
          },
          "areaServed": {
            "@type": "Place",
            "name": "San Diego, Orange County, Riverside, CA"
          },
          "openingHours": "24 hours",
          "sameAs": [
            "https://www.yelp.com/biz/ez-heat-and-air-sun-city",
            "https://www.facebook.com/ezheatandair",
            "https://twitter.com/ezheatandair"
          ]
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What types of heating and air conditioning services do you offer?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "We offer various HVAC services, including air conditioner maintenance, installation and repair, heating repair and installation, duct cleaning, thermostat installations, and emergency HVAC services. We cater to both residential and commercial needs, ensuring optimal comfort year-round."
              }
            },
            {
              "@type": "Question",
              "name": "How often should I schedule maintenance for my HVAC system?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "We recommend scheduling maintenance for your HVAC system at least once a year. It's best to have air conditioners serviced in the spring and schedule service in the fall for heating systems. Regular maintenance ensures optimal performance and extends the lifespan of your system."
              }
            },
            {
              "@type": "Question",
              "name": "How can I improve the energy efficiency of my heating and cooling system?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Improving energy efficiency starts with regular air conditioner maintenance and ensuring your system is up to date. Consider upgrading to energy-efficient systems, sealing air leaks, using programmable thermostats, and cleaning ducts regularly to reduce strain on the system and save energy."
              }
            },
            {
              "@type": "Question",
              "name": "Do you offer emergency heating and cooling services?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, we provide 24/7 emergency HVAC services. Whether it's a sudden AC breakdown in the middle of summer or a furnace failure during winter, our team is always ready to restore comfort to your home quickly."
              }
            },
            {
              "@type": "Question",
              "name": "What should I do if my air conditioner isn’t cooling properly?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "If your AC isn’t cooling properly, check for simple issues like a dirty filter, thermostat settings, or blocked vents. If these aren’t the cause, it's best to call a professional for air conditioner maintenance to identify and fix any underlying problems."
              }
            },
            {
              "@type": "Question",
              "name": "What should I do if I need Air Conditioning Repair in San Diego?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Check the thermostat and power supply if your AC isn’t working. If the issue continues, contact our team for air conditioning repair in San Diego. We offer fast, reliable service to restore comfort quickly."
              }
            }
          ]
        }
      ]
    </script>`;

// Replace from <title> to </script> inclusive with regex
const updatedContent = content.replace(/<title>[\s\S]*?<\/script>/, newSeo);
fs.writeFileSync(filePath, updatedContent);
console.log("Successfully updated SEO tags in home/content.html.");

const { execSync } = require("child_process");
try {
  execSync("node build.js --page=home", { stdio: "inherit" });
  console.log("Built dist/index.html successfully.");
} catch (e) {
  console.error(e);
}
