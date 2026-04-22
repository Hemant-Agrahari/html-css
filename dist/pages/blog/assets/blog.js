/* pages/blog/blog.js */

document.addEventListener("DOMContentLoaded", () => {
  console.log("Blog page initialised");

  // Search Logic
  const searchInput = document.getElementById("blog-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      const allCards = document.querySelectorAll(".image-placeholder-parent");

      allCards.forEach((card) => {
        const title =
          card.querySelector(".heading")?.textContent.toLowerCase() || "";
        const desc =
          card.querySelector(".dec")?.textContent.toLowerCase() || "";

        if (title.includes(query) || desc.includes(query)) {
          card.classList.remove("d-none");
        } else {
          card.classList.add("d-none");
        }
      });
    });
  }

  // Tab switching logic
  const recentBtn = document.getElementById("filter-recent");
  const popularBtn = document.getElementById("filter-popular");
  const recentPosts = document.getElementById("most-recent-posts");
  const popularPosts = document.getElementById("most-popular-posts");

  if (recentBtn && popularBtn && recentPosts && popularPosts) {
    recentBtn.addEventListener("click", () => {
      recentBtn.classList.add("active");
      popularBtn.classList.remove("active");
      recentPosts.classList.remove("d-none");
      popularPosts.classList.add("d-none");

      // Re-trigger search filter on switch to ensure correct visibility
      if (searchInput) searchInput.dispatchEvent(new Event("input"));
    });

    popularBtn.addEventListener("click", () => {
      popularBtn.classList.add("active");
      recentBtn.classList.remove("active");
      popularPosts.classList.remove("d-none");
      recentPosts.classList.add("d-none");

      // Re-trigger search filter on switch to ensure correct visibility
      if (searchInput) searchInput.dispatchEvent(new Event("input"));
    });
  }
});
