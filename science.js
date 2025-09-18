// ========================
// Data for Science Papers
// ========================
const data = {
  "2023": {
    "Semester 1": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 2": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 3": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 4": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 5": [
      { name: "Biology", folder: "NEHU/NEP/sem2/2023/BSC/bio", prefix: "bio", totalPages: 4 }
    ]
  },
  "2024": {
    "Semester 1": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 2": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 3": [
      { name: "Chemistry", folder: "NEHU/NEP/sem3/2024/BSC/chem", prefix: "chem", totalPages: 11 },
      { name: "Mathematics", folder: "NEHU/NEP/sem3/2024/BSC/maths", prefix: "maths", totalPages: 8 }
    ],
    "Semester 4": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 5": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ]
  },
  "2025": {
    "Semester 1": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 2": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 3": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 4": [
      { name: "Physics", folder: "NEHU/NEP/sem1/2023/BSC/physics", prefix: "phy", totalPages: 5 },
      { name: "Chemistry", folder: "NEHU/NEP/sem1/2023/BSC/chem", prefix: "chem", totalPages: 6 }
    ],
    "Semester 5": [
      { name: "Biology", folder: "NEHU/NEP/sem2/2023/BSC/bio", prefix: "bio", totalPages: 4 }
    ]
  }
};

// ========================
// Globals
// ========================
let currentYear = null;

const title = document.getElementById('step-title');
const options = document.getElementById('options');
const paperView = document.getElementById('paper-view');
const backBtn = document.getElementById('back-btn');

// ========================
// Navigation Helpers
// ========================
function showBack(action, isHome=false) {
  if (isHome) {
    backBtn.innerHTML = `<a href="index.html" class="btn">⬅ Home</a>`;
  } else {
    backBtn.innerHTML = `<button class="btn" onclick="${action}">⬅ Back</button>`;
  }
}

// ========================
// Load Functions
// ========================
function loadYears() {
  title.textContent = "Select Year";
  options.innerHTML = "";
  paperView.innerHTML = "";
  showBack("", true);
  Object.keys(data).forEach(year => {
    createCard(year, () => {
      currentYear = year;
      loadSemesters(year);
    });
  });
}

function loadSemesters(year) {
  title.textContent = `Select Semester (${year})`;
  options.innerHTML = "";
  paperView.innerHTML = "";
  Object.keys(data[year]).forEach(sem => {
    createCard(sem, () => {
      loadPapers(year, sem);
    });
  });
  showBack("loadYears()");
}

function loadPapers(year, semester) {
  title.textContent = `${semester} Papers (${year})`;
  options.innerHTML = "";
  paperView.innerHTML = "";
  const papers = data[year][semester];

  papers.forEach(paper => {
    createCard(paper.name, () => {
      loadPaperPages(year, semester, paper);
    });
  });

  showBack(`loadSemesters('${year}')`);
}

function loadPaperPages(year, semester, paper) {
  title.textContent = `${paper.name} (${semester}, ${year})`;
  options.innerHTML = "";
  paperView.innerHTML = "";

  for (let i = 1; i <= paper.totalPages; i++) {
    let imgPath = `${paper.folder}/${paper.prefix}${i}.jpg`;
    let img = document.createElement("img");
    img.setAttribute("loading", "lazy");
    img.src = imgPath;
    img.alt = `${paper.name} Page ${i}`;
    paperView.appendChild(img);
  }

  showBack(`loadPapers('${year}','${semester}')`);
}

// ========================
// Helpers
// ========================
function createCard(label, action) {
  const card = document.createElement('div');
  card.className = "card";
  card.textContent = label;
  card.onclick = action;
  options.appendChild(card);
}

// ========================
// Start App
// ========================
loadYears();
