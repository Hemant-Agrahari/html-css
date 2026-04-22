async function x() {
  const res = await fetch("https://ezapi.ezheatandair.com/getMostpopular/?pageIndex=1&pageSize=10&search=");
  const d = await res.json();
  console.log(d.blogPosts.map(p => p.postSlug));
}
x();
