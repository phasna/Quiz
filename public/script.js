const API_URL = 'http://localhost:3000/api';

let currentQuestionIndex = 0;
let score = 0;
let questions = [];

async function startQuiz() {
  const response = await fetch(`${API_URL}/questions`);
  questions = await response.json();

  currentQuestionIndex = 0;
  score = 0;

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');

  document.getElementById('total').textContent = questions.length;
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  document.getElementById('question-text').textContent = q.question;
  document.getElementById('current').textContent = currentQuestionIndex + 1;

  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  q.options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = option;
    btn.onclick = () => selectAnswer(option, btn);
    optionsDiv.appendChild(btn);
  });
}

async function selectAnswer(selected, clickedBtn) {
  const q = questions[currentQuestionIndex];

  // Empêche de cliquer plusieurs fois pendant qu'on affiche la correction
  const allButtons = document.querySelectorAll('.option');
  allButtons.forEach(btn => btn.onclick = null);

  const response = await fetch(`${API_URL}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: q.id, selectedAnswer: selected })
  });

  const result = await response.json();

  if (result.correct) {
    score++;
    clickedBtn.classList.add('correct');
  } else {
    clickedBtn.classList.add('incorrect');
  }

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      showResult();
    }
  }, 800);
}

function showResult() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.remove('hidden');

  document.getElementById('score-final').textContent = score;
  document.getElementById('total-questions').textContent = questions.length;
}

function restartQuiz() {
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}
