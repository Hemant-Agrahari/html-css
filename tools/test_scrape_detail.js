const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www.ezheatandair.com/advantage-of-professional-heat-pump-services-over-do-it-yourself-repairs';
  console.log('Fetching', url);
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    
    console.log("TITLE:", $('title').text());
    console.log("DESC:", $('meta[name="description"]').attr('content'));
    
    const articleSection = $('.why-do-slab-leaks-occur-mostly-parent');
    console.log("HAS ARTICLE SECTION?", articleSection.length > 0);
    
    const breadcrumbs = $('.breadcrumbs5');
    console.log("HAS BREADCRUMBS?", breadcrumbs.length > 0);
    
    const schema = $('script[type="application/ld+json"]');
    console.log("HAS SCHEMA?", schema.length);
  } catch (err) {
    console.error(err.message);
  }
}
test();
