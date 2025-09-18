const data = {
  "Sem 1": {
    "2023": {
      "Physics": "papers/2023/science/sem1/physics.pdf",
      "Chemistry": "papers/2023/science/sem1/chemistry.pdf",
      "Math": "papers/2023/science/sem1/math.pdf"
    },
    "2024": {
      "Biology": "papers/2023/science/sem2/biology.pdf",
      "Computer Science": "papers/2023/science/sem2/compsci.pdf"
    },
    "2025": {
      "Bio": "",
      "Chem": ""
    }
  },
  "Sem 2": {
       "2023": {
      "Physics": "papers/2023/science/sem1/physics.pdf",
      "Chemistry": "papers/2023/science/sem1/chemistry.pdf",
      "Math": "papers/2023/science/sem1/math.pdf"
    },
    "2024": {
      "Biology": "papers/2023/science/sem2/biology.pdf",
      "Computer Science": "papers/2023/science/sem2/compsci.pdf"
    },
    "2025": {
      "Computer science":"",
      "Chemistry": "NEHU/NEP/sem3/"
    }
  },
  "sem 3": {
    "2023": {
      "Physics": "papers/2023/science/sem1/physics.pdf",
      "Chemistry": "papers/2023/science/sem1/chemistry.pdf",
      "Math": "papers/2023/science/sem1/math.pdf"
    },
    "2024": {
      "Biology": "papers/2023/science/sem2/biology.pdf",
      "Computer Science": "papers/2023/science/sem2/compsci.pdf"
    },
    "2025": {
      "Bio": "",
      "Chem": ""
    }
  }
};

let currentYear = null;
let currentSemester = null;

const title = document.getElementById('step-title');
const options = document.getElementById('options');
const paperView = document.getElementById('paper-view');
const backBtn = document.getElementById('back-btn');

function showBack(action, isHome=false) {
  if (isHome) {
    backBtn.innerHTML = `<a href="index.html" class="btn">⬅ Home</a>`;
  } else {
    backBtn.innerHTML = `<button class="btn" onclick="${action}">⬅ Back</button>`;
  }
}

function clearBack() {
  backBtn.innerHTML = "";
}

function loadYears() {
  title.textContent = "Select Year";
  options.innerHTML = "";
  paperView.innerHTML = "";
  showBack("", true); // back to home
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
      currentSemester = sem;
      loadSubjects(year, sem);
    });
  });
  showBack("loadYears()");
}

function loadSubjects(year, semester) {
  title.textContent = `Select Subject (${year} - ${semester})`;
  options.innerHTML = "";
  paperView.innerHTML = "";
  Object.keys(data[year][semester]).forEach(subject => {
    createCard(subject, () => {
      loadPaper(year, semester, subject);
    });
  });
  showBack(`loadSemesters('${year}')`);
}

function loadPaper(year, semester, subject) {
  title.textContent = `${subject} (${year} - ${semester})`;
  options.innerHTML = "";
  const pdf = data[year][semester][subject];
  paperView.innerHTML = `
    <iframe src="${pdf}" width="80%" height="600px"></iframe>
    <br>
    <a href="${pdf}" download class="btn">Download PDF</a>
  `;
  showBack(`loadSubjects('${year}','${semester}')`);
}

function createCard(label, action) {
  const card = document.createElement('div');
  card.className = "card";
  card.textContent = label;
  card.onclick = action;
  options.appendChild(card);
}

// start from years
loadYears();
