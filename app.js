// app.js – multi JSON + filters + grid + explanation + remember answers

const QUESTION_FILES = [
  // Main sets
  "Questions-Set-1.json",
  "Questions-Set-2.json",
  "Questions-Set-3.json",
  "Questions-Set-4.json",
  "Questions-Set-5.json",

  // Last Day Revision Tests
  "Last-Day-Revision-Test-1-Q1-Q50-Questions.json",
  "Last-Day-Revision-Test-1-Q51-Q100-Questions.json",
  "Last-Day-Revision-Test-2-Q1-Q50-Questions.json",
  "Last-Day-Revision-Test-2-Q51-Q100-Questions.json",
  "Last-Day-Revision-Test-3-Q1-Q50-Questions.json",
  "Last-Day-Revision-Test-3-Q51-Q100-Questions.json",
];

const QUESTIONS_PER_TEST = 50;

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;

let timerInterval = null;
let startTime = null;

let answersStatus = []; // "notVisited" | "current" | "answered" | "skipped"
let userAnswers = []; // selected option index or null

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadAllQuestions()
    .then(() => {
      buildFilters();
      wireFilterEvents();
      wireNavButtons();
    })
    .catch((err) => {
      console.error(err);
      alert("Error loading questions.");
    });
});

// ---------- LOAD ----------
async function loadAllQuestions() {
  const arrays = [];
  for (const file of QUESTION_FILES) {
    try {
      const r = await fetch(file);
      if (!r.ok) {
        console.warn("Failed to load", file, r.status);
        continue;
      }
      const data = await r.json();
      if (Array.isArray(data)) arrays.push(data);
    } catch (e) {
      console.warn("Error loading", file, e);
    }
  }
  allQuestions = arrays.flat();
}

// ---------- FILTER UI ----------
function buildFilters() {
  const qsSelect = document.getElementById("questionSetSelect");
  const moduleSelect = document.getElementById("moduleSelect");
  const chapterSelect = document.getElementById("chapterSelect");

  const questionSets = [...new Set(allQuestions.map((q) => q.questionSet))].sort(
    (a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    }
  );

  const modules = [...new Set(allQuestions.map((q) => q.module))].sort();
  const chapters = [...new Set(allQuestions.map((q) => q.chapter))].sort();

  qsSelect.innerHTML =
    '<option value="">Select Question Set</option>' +
    questionSets.map((s) => `<option value="${s}">${s}</option>`).join("");

  moduleSelect.innerHTML =
    '<option value="">Select Module</option>' +
    modules.map((m) => `<option value="${m}">${m}</option>`).join("");

  chapterSelect.innerHTML =
    '<option value="">Select Chapter</option>' +
    chapters.map((c) => `<option value="${c}">${c}</option>`).join("");

  document.getElementById("startBtn").addEventListener("click", onStartTest);
}

function wireFilterEvents() {
  const ft = document.getElementById("filterType");
  ft.addEventListener("change", updateFilterEnabling);
  updateFilterEnabling();
}

function updateFilterEnabling() {
  const mode = document.getElementById("filterType").value;
  document.getElementById("questionSetSelect").disabled = mode !== "questionSet";
  document.getElementById("moduleSelect").disabled = mode !== "module";
  document.getElementById("chapterSelect").disabled = mode !== "chapter";
}

function wireNavButtons() {
  document.getElementById("prevBtn").addEventListener("click", () => {
    goToQuestion(currentIndex - 1);
  });

  document.getElementById("nextBtn").addEventListener("click", () => {
    goToQuestion(currentIndex + 1);
  });

  document.getElementById("skipBtn").addEventListener("click", onSkip);

  document.getElementById("finishBtn").addEventListener("click", onFinishTest);
}

// ---------- FILTER LOGIC ----------
function getFilteredQuestions() {
  const mode = document.getElementById("filterType").value;
  const qsVal = document.getElementById("questionSetSelect").value;
  const moduleVal = document.getElementById("moduleSelect").value;
  const chapterVal = document.getElementById("chapterSelect").value;

  let filtered = [];

  if (mode === "all") {
    filtered = [...allQuestions];
  } else if (mode === "questionSet") {
    if (!qsVal) {
      alert("Select Question Set");
      return null;
    }
    filtered = allQuestions.filter((q) => String(q.questionSet) === qsVal);
  } else if (mode === "module") {
    if (!moduleVal) {
      alert("Select Module");
      return null;
    }
    filtered = allQuestions.filter((q) => q.module === moduleVal);
  } else if (mode === "chapter") {
    if (!chapterVal) {
      alert("Select Chapter");
      return null;
    }
    filtered = allQuestions.filter((q) => q.chapter === chapterVal);
  } else {
    alert("Select mode");
    return null;
  }

  if (!filtered.length) {
    alert("No questions for this selection");
    return null;
  }

  return filtered;
}

// ---------- START TEST ----------
function onStartTest() {
  const filtered = getFilteredQuestions();
  if (!filtered) return;

  currentQuestions = shuffleArray(filtered).slice(0, QUESTIONS_PER_TEST);

  currentIndex = 0;
  correctCount = 0;

  answersStatus = new Array(currentQuestions.length).fill("notVisited");
  answersStatus[0] = "current";

  userAnswers = new Array(currentQuestions.length).fill(null);

  enableNavButtons(true);

  startTimer();
  renderCurrentQuestion();
  renderQuestionGrid();
}

function enableNavButtons(enable) {
  document.getElementById("prevBtn").disabled = !enable;
  document.getElementById("nextBtn").disabled = !enable;
  document.getElementById("skipBtn").disabled = !enable;
  document.getElementById("finishBtn").disabled = !enable;
}

// ---------- TIMER ----------
function startTimer() {
  stopTimer();
  startTime = Date.now();
  const label = document.getElementById("timeLabel");
  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    if (label) label.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ---------- RENDER QUESTION ----------
function renderCurrentQuestion() {
  const container = document.getElementById("quizContainer");
  const q = currentQuestions[currentIndex];

  if (!q) {
    showResult();
    return;
  }

  const total = currentQuestions.length;
  const num = currentIndex + 1;
  const savedAnswer = userAnswers[currentIndex];

  const optionsHtml = q.options
    .map((opt, i) => {
      const checked = savedAnswer === i ? "checked" : "";
      return `
        <div class="form-check option-item">
          <input class="form-check-input" type="radio" name="option"
            id="opt${i}" value="${i}" ${checked}>
          <label class="form-check-label" for="opt${i}">
            ${opt}
          </label>
        </div>`;
    })
    .join("");

  const explanationHtml = buildExplanationHtml(q, savedAnswer);

  container.innerHTML = `
    <div>
      <div class="mb-2">
        <strong>Q${num} / ${total}</strong>
      </div>
      <div class="mb-3">
        ${q.question}
      </div>
      <div class="mb-2">
        ${optionsHtml}
      </div>
      <div id="explanationBox">
        ${explanationHtml}
      </div>
      <div class="mt-2">
        Score: <strong>${correctCount}</strong> / ${total}
      </div>
    </div>
  `;

  // wire option clicks
  const radios = container.querySelectorAll('input[name="option"]');
  radios.forEach((r) => {
    r.addEventListener("change", onOptionSelected);
  });

  // update prev/next disabled state
  document.getElementById("prevBtn").disabled = currentIndex === 0;
  document.getElementById("nextBtn").disabled =
    currentIndex === currentQuestions.length - 1;
}

// explanation box (correct / wrong)
function buildExplanationHtml(q, savedAnswer) {
  if (savedAnswer === null || savedAnswer === undefined) return "";

  const isCorrect = savedAnswer === q.answer;
  const cls = isCorrect
    ? "explanation-box explanation-correct"
    : "explanation-box explanation-wrong";

  const heading = isCorrect ? "Correct" : "Incorrect";
  const correctText = q.options[q.answer];

  let text = q.explanation || "";
  return `
    <div class="${cls}">
      <strong>${heading}.</strong>
      <div><strong>Right answer:</strong> ${correctText}</div>
      <div class="mt-1">${text}</div>
    </div>
  `;
}

// when user selects an option
function onOptionSelected(ev) {
  const idx = Number(ev.target.value);
  userAnswers[currentIndex] = idx;

  const q = currentQuestions[currentIndex];
  const wasCorrectBefore = answersStatus[currentIndex] === "answered"; // just for safety

  if (idx === q.answer && !wasCorrectBefore) {
    correctCount++;
  } else if (idx !== q.answer && wasCorrectBefore) {
    // if user changes from correct to wrong, adjust score
    correctCount = Math.max(0, correctCount - 1);
  }

  // mark as answered once user attempts
  answersStatus[currentIndex] = "answered";
  renderCurrentQuestion();
  renderQuestionGrid();
}

// ---------- NAVIGATION ----------
function goToQuestion(newIndex) {
  if (newIndex < 0 || newIndex >= currentQuestions.length) return;

  // leaving current question: if it has an answer and is still marked current, mark answered
  if (
    answersStatus[currentIndex] === "current" &&
    userAnswers[currentIndex] !== null
  ) {
    answersStatus[currentIndex] = "answered";
  }

  // if leaving as skipped explicitly, it can remain "skipped"

  currentIndex = newIndex;

  if (answersStatus[currentIndex] === "notVisited") {
    answersStatus[currentIndex] = "current";
  }

  renderCurrentQuestion();
  renderQuestionGrid();
}

function onSkip() {
  // mark current as skipped only if not answered
  if (userAnswers[currentIndex] === null) {
    answersStatus[currentIndex] = "skipped";
  }
  const nextIndex =
    currentIndex < currentQuestions.length - 1 ? currentIndex + 1 : currentIndex;
  goToQuestion(nextIndex);
}

// ---------- GRID ----------
function renderQuestionGrid() {
  const grid = document.getElementById("questionGrid");
  if (!grid) return;

  grid.innerHTML = "";

  currentQuestions.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = i + 1;

    const status = answersStatus[i];

    if (status === "current") btn.className = "btn btn-sm q-current";
    else if (status === "answered") btn.className = "btn btn-sm q-answered";
    else if (status === "skipped") btn.className = "btn btn-sm q-skipped";
    else btn.className = "btn btn-sm q-notVisited";

    btn.addEventListener("click", () => {
      goToQuestion(i);
    });

    grid.appendChild(btn);
  });
}

// ---------- FINISH / RESULT ----------
function onFinishTest() {
  if (!currentQuestions.length) return;

  stopTimer();

  const total = currentQuestions.length;
  const attempted = userAnswers.filter((a) => a !== null).length;
  const percentage = total
    ? ((correctCount / total) * 100).toFixed(2)
    : "0.00";

  showResult(total, attempted, percentage);
}

function showResult(
  totalOverride,
  attemptedOverride,
  percentageOverride
) {
  stopTimer();

  const total = totalOverride || currentQuestions.length;
  const attempted =
    attemptedOverride !== undefined
      ? attemptedOverride
      : userAnswers.filter((a) => a !== null).length;
  const percentage =
    percentageOverride !== undefined
      ? percentageOverride
      : total
      ? ((correctCount / total) * 100).toFixed(2)
      : "0.00";

  const container = document.getElementById("quizContainer");
  container.innerHTML = `
    <div class="text-center">
      <h3>Test Finished</h3>
      <p class="mt-3">Score: <strong>${correctCount}</strong> / ${total}</p>
      <p>Attempted: <strong>${attempted}</strong></p>
      <p>Percentage: <strong>${percentage}%</strong></p>
    </div>
  `;

  enableNavButtons(false);
}

// ---------- UTIL ----------
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
