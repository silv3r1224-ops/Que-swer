// Highlight active nav link
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll("nav ul li a");
  navLinks.forEach(link => {
    if (link.href === window.location.href) {
      link.classList.add("active");
    }
  });

  // Accordion functionality
  const accordions = document.querySelectorAll(".accordion-btn");
  accordions.forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  });
});
