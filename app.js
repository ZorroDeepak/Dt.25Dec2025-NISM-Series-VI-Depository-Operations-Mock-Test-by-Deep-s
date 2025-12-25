// app.js – multi JSON + filters + bottom grid + bold explanation + remember answers

const QUESTION_FILES = [
  // Main sets
  'questions-set-1.json',
  'questions-set-2.json',
  'questions-set-3.json',
  'questions-set-4.json',
  'questions-set-5.json',

  // Last Day Revision Tests
  'Last-Day-Revision-Test-1-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-1-Q51-Q100-Questions.json',
  'Last-Day-Revision-Test-2-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-2-Q51-Q100-Questions.json',
  'Last-Day-Revision-Test-3-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-3-Q51-Q100-Questions.json'
];

const QUESTIONS_PER_TEST = 50;

let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let timerInterval = null;
let startTime = null;

let answersStatus = []; // 'notVisited' | 'current' | 'answered' | 'skipped'
let userAnswers = [];   // selected option index per question (or null)

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  loadAllQuestions()
    .then(() => {
      buildFilters();
      wireFilterEvents();
    })
    .catch(err => {
      console.error(err);
      alert('Error loading questions.');
    });
});

// ---------- LOAD ----------
async function loadAllQuestions() {
  const arrays = [];

  for (const file of QUESTION_FILES) {
    try {
      const r = await fetch(file);
      if (!r.ok) {
        console.warn('Failed to load', file, r.status);
        continue;
      }
      const data = await r.json();
      if (Array.isArray(data)) arrays.push(data);
    } catch (e) {
      console.warn('Error loading', file, e);
    }
  }

  allQuestions = arrays.flat();
}

// ---------- FILTER UI ----------
function buildFilters() {
  const qsSelect = document.getElementById('questionSetSelect');
  const moduleSelect = document.getElementById('moduleSelect');
  const chapterSelect = document.getElementById('chapterSelect');

  const questionSets = [...new Set(allQuestions.map(q => q.questionSet))].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });

  const modules = [...new Set(allQuestions.map(q => q.module))].sort();
  const chapters = [...new Set(allQuestions.map(q => q.chapter))].sort();

  qsSelect.innerHTML =
    '<option value="">Select set</option>' +
    questionSets.map(s => `<option value="${s}">${s}</option>`).join('');

  moduleSelect.innerHTML =
    '<option value="">Select module</option>' +
    modules.map(m => `<option value="${m}">${m}</option>`).join('');

  chapterSelect.innerHTML =
    '<option value="">Select chapter</option>' +
    chapters.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('startBtn').addEventListener('click', onStartTest);
}

function wireFilterEvents() {
  const ft = document.getElementById('filterType');
  ft.addEventListener('change', updateFilterEnabling);
  updateFilterEnabling();
}

function updateFilterEnabling() {
  const mode = document.getElementById('filterType').value;

  document.getElementById('questionSetSelect').disabled = mode !== 'questionSet';
  document.getElementById('moduleSelect').disabled = mode !== 'module';
  document.getElementById('chapterSelect').disabled = mode !== 'chapter';
}

// ---------- FILTER LOGIC ----------
function getFilteredQuestions() {
  const mode = document.getElementById('filterType').value;
  const qsVal = document.getElementById('questionSetSelect').value;
  const moduleVal = document.getElementById('moduleSelect').value;
  const chapterVal = document.getElementById('chapterSelect').value;

  let filtered = [];

  if (mode === 'all') {
    filtered = [...allQuestions];
  } else if (mode === 'questionSet') {
    if (!qsVal) {
      alert('Select Question Set');
      return null;
    }
    filtered = allQuestions.filter(q => String(q.questionSet) === qsVal);
  } else if (mode === 'module') {
    if (!moduleVal) {
      alert('Select Module');
      return null;
    }
    filtered = allQuestions.filter(q => q.module === moduleVal);
  } else if (mode === 'chapter') {
    if (!chapterVal) {
      alert('Select Chapter');
      return null;
    }
    filtered = allQuestions.filter(q => q.chapter === chapterVal);
  } else {
    alert('Select mode');
    return null;
  }

  if (!filtered.length) {
    alert('No questions for this selection');
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

  answersStatus = new Array(currentQuestions.length).fill('notVisited');
  answersStatus[0] = 'current';

  userAnswers = new Array(currentQuestions.length).fill(null);

  startTimer();
  renderCurrentQuestion();
  renderNavButtons();
  renderQuestionGrid();
}

// ---------- TIMER ----------
function startTimer() {
  stopTimer();
  startTime = Date.now();
  const label = document.getElementById('timeLabel');

  timerInterval = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
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
  const container = document.getElementById('quizContainer');
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
      const checked = savedAnswer === i ? 'checked' : '';
      return `
        <div class="option">
          <label>
            <input type="radio" name="option" value="${i}" ${checked}>
            ${String.fromCharCode(65 + i)}. ${opt}
          </label>
        </div>`;
    })
    .join('');

  let feedbackHtml = '';
  if (savedAnswer !== null) {
    const isCorrect = savedAnswer === q.answerIndex;
    const statusText = isCorrect ? 'Correct!' : 'Incorrect';
    const statusClass = isCorrect ? 'correct' : 'incorrect';
    feedbackHtml = `
      <div class="feedback ${statusClass}">
        ${statusText}
      </div>
      <div class="explanation">
        ${q.explanation || ''}
      </div>`;
  }

  container.innerHTML = `
    <div class="question-meta">
      <div><strong>Q${num} / ${total}</strong></div>
      <div>Set: ${q.questionSet} &nbsp;|&nbsp; Module: ${q.module} &nbsp;|&nbsp; Chapter: ${q.chapter}</div>
    </div>
    <div class="question-text">${q.question}</div>
    <div class="options">
      ${optionsHtml}
    </div>
    ${feedbackHtml}
  `;

  const optionInputs = container.querySelectorAll('input[name="option"]');
  optionInputs.forEach(inp => {
    inp.addEventListener('change', () => {
      const chosen = Number(inp.value);
      const prevAnswer = userAnswers[currentIndex];

      userAnswers[currentIndex] = chosen;

      const wasCorrectBefore = prevAnswer !== null && prevAnswer === q.answerIndex;
      const isCorrectNow = chosen === q.answerIndex;

      if (!wasCorrectBefore && isCorrectNow) correctCount++;
      if (wasCorrectBefore && !isCorrectNow) correctCount--;

      answersStatus[currentIndex] = 'answered';

      renderCurrentQuestion();
      renderQuestionGrid();
    });
  });
}

// ---------- NAV BUTTONS ----------
function renderNavButtons() {
  const nav = document.getElementById('navButtons');
  if (!nav) return;

  nav.innerHTML = `
    <button id="prevBtn">Previous</button>
    <button id="skipBtn">Skip</button>
    <button id="nextBtn">Next</button>
  `;

  document.getElementById('prevBtn').addEventListener('click', onPrev);
  document.getElementById('skipBtn').addEventListener('click', onSkip);
  document.getElementById('nextBtn').addEventListener('click', onNext);
}

// ---------- QUESTION GRID ----------
function renderQuestionGrid() {
  const gridContainer = document.getElementById('questionGridContainer');
  if (!gridContainer) return;

  const buttonsHtml = answersStatus
    .map((status, idx) => {
      let cls = 'q-box';
      if (status === 'current') cls += ' current';
      else if (status === 'answered') cls += ' answered';
      else if (status === 'skipped') cls += ' skipped';

      return `<button class="${cls}" data-qidx="${idx}">${idx + 1}</button>`;
    })
    .join('');

  gridContainer.innerHTML = `
    <div class="question-grid">
      ${buttonsHtml}
    </div>
    <div class="legend">
      <span class="legend-item"><span class="current-dot"></span>Current</span>
      <span class="legend-item"><span class="answered-dot"></span>Answered</span>
      <span class="legend-item"><span class="notvisited-dot"></span>Not visited</span>
      <span class="legend-item"><span class="skipped-dot"></span>Skipped</span>
    </div>
  `;

  gridContainer.querySelectorAll('.q-box').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = Number(btn.getAttribute('data-qidx'));
      moveToQuestion(target);
    });
  });
}

// ---------- NAVIGATION ----------
function onNext() {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    updateCurrentStatus();
    renderCurrentQuestion();
    renderQuestionGrid();
  } else {
    showResult();
  }
}

function onPrev() {
  if (currentIndex === 0) return;
  currentIndex--;
  updateCurrentStatus();
  renderCurrentQuestion();
  renderQuestionGrid();
}

function onSkip() {
  if (userAnswers[currentIndex] === null) {
    answersStatus[currentIndex] = 'skipped';
  }

  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    updateCurrentStatus();
    renderCurrentQuestion();
    renderQuestionGrid();
  } else {
    showResult();
  }
}

function moveToQuestion(idx) {
  if (idx < 0 || idx >= currentQuestions.length) return;
  currentIndex = idx;
  updateCurrentStatus();
  renderCurrentQuestion();
  renderQuestionGrid();
}

function updateCurrentStatus() {
  answersStatus = answersStatus.map((s, i) => {
    if (i === currentIndex) return s === 'answered' ? 'answered' : 'current';
    if (s === 'current' && userAnswers[i] === null) return 'notVisited';
    return s;
  });
}

// ---------- RESULT ----------
function showResult() {
  stopTimer();

  const container = document.getElementById('quizContainer');
  const total = currentQuestions.length || 0;

  container.innerHTML = `
    <div class="result">
      <h2>Test Completed</h2>
      <p>Score: <strong>${correctCount}</strong> / ${total}</p>
      <button id="restartBtn">Start New Test</button>
    </div>
  `;

  const nav = document.getElementById('navButtons');
  if (nav) nav.innerHTML = '';

  const grid = document.getElementById('questionGridContainer');
  if (grid) grid.innerHTML = '';

  document.getElementById('restartBtn').addEventListener('click', () => {
    currentQuestions = [];
    currentIndex = 0;
    correctCount = 0;
    answersStatus = [];
    userAnswers = [];
    document.getElementById('quizContainer').innerHTML = '';
    stopTimer();
  });
}

// ---------- UTIL ----------
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
