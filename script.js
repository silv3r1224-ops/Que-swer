function searchPapers() {
  let input = document.getElementById("searchInput").value.toLowerCase();
  let papers = document.querySelectorAll("#paperList li, #paperList a");

  papers.forEach(paper => {
    if (paper.textContent.toLowerCase().includes(input)) {
      paper.style.display = "list-item";
    } else {
      paper.style.display = "none";
    }
  });
}
