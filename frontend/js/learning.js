/* Auth guard */
const session = window.api.requireAuth();

let correctAnswer  = "";
let sessionSolved  = 0;
let sessionCorrect = 0;
let questionCount  = 0;   // will be set to questions_solved on init

/* ── Init: fetch progress to resume question numbering ── */
async function init() {
  if (!session) return;
  try {
    const progress = await window.api.getProgress(session.userId, session.token);
    questionCount  = progress.questions_solved;  // resume from last question
  } catch (_) {
    questionCount = 0;
  }
  loadQuestion();
}

/* ── Robust regex parser ────────────────────── */
function parseQuestion(raw) {
  const text = raw.replace(/\r/g, "").trim();

  // Try strict match first: "Question:" followed eventually by an option line
  let qMatch = text.match(/Question\s*:\s*([\s\S]*?)(?=\n\s*[A-D][).\:])/i);

  // Fallback: just grab everything after "Question:" until a blank line or end
  if (!qMatch) {
    qMatch = text.match(/Question\s*:\s*(.+?)(?:\n|$)/i);
  }

  const question = qMatch ? qMatch[1].replace(/\n/g, " ").trim() : "";

  // Options: match A) / A. / A: formats
  const optRegex = /^([A-D])[).\:]\s*(.+)$/gim;
  const options   = [];
  let m;
  while ((m = optRegex.exec(text)) !== null) {
    options.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
  }

  // Correct answer
  const aMatch = text.match(/Correct\s*Answer\s*[:\-]\s*([A-D])/i);
  const answer  = aMatch ? aMatch[1].toUpperCase() : "";

  return { question, options, answer };
}

/* ── Load question (with auto-retry) ───────── */
async function loadQuestion(retryCount = 0) {
  if (!session) return;

  const MAX_RETRIES = 3;

  const qNumEl   = document.getElementById("questionNumber");
  const qTextEl  = document.getElementById("questionText");
  const optsEl   = document.getElementById("options");
  const nextBtn  = document.getElementById("nextBtn");
  const feedback = document.getElementById("feedback");

  qNumEl.textContent     = `Question ${questionCount + 1}`;
  qTextEl.textContent    = retryCount > 0 ? `Generating question... (attempt ${retryCount + 1})` : "Loading question...";
  optsEl.innerHTML       = "";
  feedback.style.display = "none";
  nextBtn.disabled       = true;

  try {
    const reading = await window.api.getLatestStress();
    const data    = await window.api.getNextQuestion(reading.stress);
    const parsed  = parseQuestion(data.question);

    // If we still can't parse and have retries left — silently retry
    if ((!parsed.question || parsed.options.length === 0) && retryCount < MAX_RETRIES) {
      return loadQuestion(retryCount + 1);
    }

    // If all retries exhausted and still nothing useful, just show raw text
    if (!parsed.question) {
      qTextEl.textContent = data.question || "Could not load question. Click Next.";
      nextBtn.disabled    = false;
      return;
    }

    correctAnswer    = parsed.answer;
    qTextEl.textContent = parsed.question;

    parsed.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "opt-btn";
      btn.innerHTML =
        `<span class="opt-letter">${opt.letter}</span>
         <span>${opt.text}</span>`;
      btn.onclick = () => checkAnswer(btn, opt.letter);
      optsEl.appendChild(btn);
    });

    if (parsed.options.length === 0) {
      optsEl.innerHTML =
        `<p style="color:var(--txt-2);font-size:0.9rem;">
           Options could not be loaded. Click Next to try another.
         </p>`;
      nextBtn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    qTextEl.textContent = "Failed to load question. Is the backend running?";
    nextBtn.disabled = false;
  }
}

/* ── Check answer ───────────────────────────── */
async function checkAnswer(clickedBtn, selected) {
  const allBtns  = document.querySelectorAll(".opt-btn");
  const feedback = document.getElementById("feedback");
  const nextBtn  = document.getElementById("nextBtn");

  allBtns.forEach(b => b.disabled = true);

  const isCorrect = selected === correctAnswer;
  sessionSolved++;
  questionCount++;
  if (isCorrect) sessionCorrect++;

  // Colour the buttons
  if (isCorrect) {
    clickedBtn.classList.add("correct");
  } else {
    clickedBtn.classList.add("wrong");
    allBtns.forEach(b => {
      if (b.querySelector(".opt-letter")?.textContent === correctAnswer)
        b.classList.add("correct");
    });
  }

  // Show feedback
  feedback.textContent    = isCorrect
    ? "✓ Correct! Well done."
    : `✗ The correct answer was ${correctAnswer}.`;
  feedback.className      = "feedback " + (isCorrect ? "correct-fb" : "wrong-fb");
  feedback.style.display  = "block";

  // Update session bar
  updateSessionBar();

  // Update backend progress (non-blocking)
  window.api.updateProgress(session.userId, session.token, isCorrect);

  nextBtn.disabled = false;
}

/* ── Session progress bar ───────────────────── */
function updateSessionBar() {
  document.getElementById("sessionSolved").textContent  = sessionSolved;
  document.getElementById("sessionCorrect").textContent = sessionCorrect;
  const pct = sessionSolved > 0 ? Math.min((sessionCorrect / sessionSolved) * 100, 100) : 0;
  document.getElementById("progressFill").style.width   = pct + "%";
}

/* ── Wire up Next button ────────────────────── */
document.getElementById("nextBtn").addEventListener("click", loadQuestion);

/* ── Start ──────────────────────────────────── */
if (session) init();
