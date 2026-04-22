/**
 * css-safelist.js
 * List of classes that must NEVER be removed by PurgeCSS.
 * Includes interactive states, JS-injected classes, and responsive utilities.
 */
module.exports = {
  standard: [
    "show",
    "collapsing",
    "collapsed",
    "active",
    "fade",
    "modal-open",
    "navbar-toggler-icon",
    "vc-active", // VCarousel
    "vc-hidden",
    "vc-transitioning",
    "aos-animate", // AOS replacement
    "aos-init",
  ],
  deep: [/modal/, /accordion/, /carousel/, /nav-/, /navbar-/],
  greedy: [/aria-/, /data-bs-/],
};
