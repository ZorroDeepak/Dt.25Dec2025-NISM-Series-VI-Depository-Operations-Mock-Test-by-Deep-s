// app.js – CLEAN & FIXED VERSION (Question-Set-3 ISSUE SOLVED)

// ---------------- CONFIG ----------------
const QUESTION_FILES = [
  'Questions-Set-1.json',
  'Questions-Set-2.json',
  'Questions-Set-3.json',
  'Questions-Set-4.json',
  'Questions-Set-5.json',

  'Last-Day-Revision-Test-1-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-1-Q51-Q100-Questions.json',
  'Last-Day-Revision-Test-2-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-2-Q51-Q100-Questions.json',
  'Last-Day-Revision-Test-3-Q1-Q50-Questions.json',
  'Last-Day-Revision-Test-3-Q51-Q100-Questions.json'
];

const QUESTIONS_PER_TEST = 50;

// ---------------- STATE ----------------
let allQuestions = [];
let currentQuestions = [];
let currentIndex = 0;
let correctCount = 0;

let answersStatus = [];
let userAnswers = [];

let timerInterval = null;
let startTime = null;

// ---------------- INIT ----------------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadAllQuestions();
    buildFilters();
    wireFilterEvents();
  } catch (e) {
    console.error(e);
    alert('Failed to load questions');
  }
});

// ---------------- LOAD QUESTIONS ----------------
async function loadAllQuestions() {
  const loaded = [];

  for (const file of QUESTION_FILES) {
    try {
      const res = await fetch(file);
      if (!res.ok) {
        console.warn('Failed to load:', file);
        continue;
      }
      const data = await res.json();
      if (Array.isArray(data)) loaded.push(...data);
    } catch (err) {
      console.warn('Error loading:', file, err);
    }
  }

  allQuestions = loaded;
  console.log('Total Questions Loaded:', allQuestions.length);
}

// ---------------- FILTER UI ----------------
function buildFilters() {
  const qsSelect = document.getElementById('questionSetSelect');
  const moduleSelect = document.getElementById('moduleSelect');
  const chapterSelect = document.getElementById('chapterSelect');

  // ✅ SAFE & CORRECT Question Set extraction
  const questionSets = Array.from(
    new Set(
      allQuestions
        .map(q => q.questionSet)
        .filter(v => typeof v === 'string' && v.trim() !== '')
    )
  ).sort((a, b) => {
    const getNum = s => {
      const m = s.match(/Set-(\d+)/);
      return m ? parseInt(m[1], 10) : 9999;
    };
    return getNum(a) - getNum(b);
  });

  console.table(questionSets); // 🔍 Debug proof

  const modules = Array.from(
    new Set(allQuestions.map(q => q.module).filter(Boolean))
  ).sort();

  const chapters = Array.from(
    new Set(allQuestions.map(q => q.chapter).filter(Boolean))
  ).sort();

  qsSelect.innerHTML =
    '<option value="">Select set</option>' +
    questionSets.map(s => `<option value="${s}">${s}</option>`).join('');

  moduleSelect.innerHTML =
    '<option value="">Select module</option>' +
    modules.map(m => `<option value="${m}">${m}</option>`).join('');

  chapterSelect.innerHTML =
    '<option value="">Select chapter</option>' +
    chapters.map(c => `<option value="${c}">${c}</option>`).join('');

  document.getElementById('startBtn').onclick = onStartTest;
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

// ---------------- FILTER LOGIC ----------------
function getFilteredQuestions() {
  const mode = document.getElementById('filterType').value;
  const qsVal = document.getElementById('questionSetSelect').value;
  const moduleVal = document.getElementById('moduleSelect').value;
  const chapterVal = document.getElementById('chapterSelect').value;

  let filtered = [];

  if (mode === 'all') filtered = allQuestions;
  else if (mode === 'questionSet') {
    if (!qsVal) return alert('Select Question Set');
    filtered = allQuestions.filter(q => q.questionSet === qsVal);
  } else if (mode === 'module') {
    if (!moduleVal) return alert('Select Module');
    filtered = allQuestions.filter(q => q.module === moduleVal);
  } else if (mode === 'chapter') {
    if (!chapterVal) return alert('Select Chapter');
    filtered = allQuestions.filter(q => q.chapter === chapterVal);
  }

  if (!filtered.length) {
    alert('No questions found');
    return null;
  }

  return filtered;
}

// ---------------- START TEST ----------------
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

// ---------------- TIMER ----------------
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
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// ---------------- RENDER QUESTION ----------------
function renderCurrentQuestion() {
  const container = document.getElementById('quizContainer');
  const q = currentQuestions[currentIndex];
  if (!q) return showResult();

  const saved = userAnswers[currentIndex];

  container.innerHTML = `
    <div class="question-meta">
      <strong>Q${currentIndex + 1} / ${currentQuestions.length}</strong>
      <div>Set: ${q.questionSet} | Module: ${q.module} | Chapter: ${q.chapter}</div>
    </div>
    <div class="question-text">${q.question}</div>
    <div class="options">
      ${q.options.map((o, i) => `
        <label>
          <input type="radio" name="opt" value="${i}" ${saved === i ? 'checked' : ''}>
          ${String.fromCharCode(65 + i)}. ${o}
        </label>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('input[name="opt"]').forEach(inp => {
    inp.onchange = () => {
      const val = Number(inp.value);
      const prev = userAnswers[currentIndex];

      userAnswers[currentIndex] = val;
      answersStatus[currentIndex] = 'answered';

      if (prev !== q.answerIndex && val === q.answerIndex) correctCount++;
      if (prev === q.answerIndex && val !== q.answerIndex) correctCount--;

      renderCurrentQuestion();
      renderQuestionGrid();
    };
  });
}

// ---------------- NAVIGATION ----------------
function renderNavButtons() {
  const nav = document.getElementById('navButtons');
  nav.innerHTML = `
    <button onclick="onPrev()">Previous</button>
    <button onclick="onSkip()">Skip</button>
    <button onclick="onNext()">Next</button>
  `;
}

function onNext() {
  if (currentIndex < currentQuestions.length - 1) currentIndex++;
  updateCurrentStatus();
  renderCurrentQuestion();
  renderQuestionGrid();
}

function onPrev() {
  if (currentIndex > 0) currentIndex--;
  updateCurrentStatus();
  renderCurrentQuestion();
  renderQuestionGrid();
}

function onSkip() {
  if (userAnswers[currentIndex] === null)
    answersStatus[currentIndex] = 'skipped';
  onNext();
}

function updateCurrentStatus() {
  answersStatus = answersStatus.map((s, i) =>
    i === currentIndex ? 'current' : s === 'current' ? 'notVisited' : s
  );
}

// ---------------- GRID ----------------
function renderQuestionGrid() {
  const grid = document.getElementById('questionGridContainer');
  grid.innerHTML = currentQuestions.map((_, i) =>
    `<button class="q-box ${answersStatus[i]}" onclick="jumpTo(${i})">${i + 1}</button>`
  ).join('');
}

function jumpTo(i) {
  currentIndex = i;
  updateCurrentStatus();
  renderCurrentQuestion();
  renderQuestionGrid();
}

// ---------------- RESULT ----------------
function showResult() {
  stopTimer();
  document.getElementById('quizContainer').innerHTML = `
    <h2>Test Completed</h2>
    <p>Score: <strong>${correctCount}</strong> / ${currentQuestions.length}</p>
  `;
  document.getElementById('navButtons').innerHTML = '';
  document.getElementById('questionGridContainer').innerHTML = '';
}

// ---------------- UTIL ----------------
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
