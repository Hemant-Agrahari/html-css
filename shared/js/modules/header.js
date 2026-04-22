/* components/header/header.js */

(function () {
  // Navigation toggle is handled by Bootstrap 5 data attributes in index.html

  // Dynamic Time Update
  const dayEl = document.getElementById("current-day");
  const timeEl = document.getElementById("current-time");

  function updateTime() {
    const now = new Date();
    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (timeEl) {
      let hours = now.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = now.getMinutes().toString().padStart(2, "0");
      timeEl.textContent = `${hours}:${minutes} ${ampm}`;
    }
  }

  updateTime();
  setInterval(updateTime, 60000);
})();
