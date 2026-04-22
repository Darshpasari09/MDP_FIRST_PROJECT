const API = "http://127.0.0.1:8000";

/* ── Auth ─────────────────────────────────────── */

async function registerUser(username, email, password) {
  const res = await fetch(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

async function loginUser(email, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

/* ── Session helpers ──────────────────────────── */

function saveSession(user) {
  localStorage.setItem("userId",   String(user.id));
  localStorage.setItem("username", user.username);
  localStorage.setItem("email",    user.email);
  localStorage.setItem("token",    user.token);
}

function getSession() {
  const userId   = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const email    = localStorage.getItem("email");
  const token    = localStorage.getItem("token");
  if (!userId || !token) return null;
  return { userId: Number(userId), username, email, token };
}

function clearSession() {
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("token");
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.navigate("login.html");
    return null;
  }
  return session;
}

/* ── Progress ─────────────────────────────────── */

async function getProgress(userId, token) {
  try {
    const res = await fetch(
      `${API}/api/v1/progress/${userId}?token=${encodeURIComponent(token)}`
    );
    return await res.json();
  } catch {
    return { questions_solved: 0, correct_answers: 0 };
  }
}

async function updateProgress(userId, token, correct) {
  try {
    await fetch(`${API}/api/v1/progress/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, token, correct })
    });
  } catch (e) {
    console.error("Progress update failed", e);
  }
}

/* ── Questions / Stress (unchanged hardware pipeline) ── */

async function getLatestStress() {
  try {
    const res = await fetch(`${API}/api/v1/readings/latest`);
    return await res.json();
  } catch {
    return { stress: "moderate" };
  }
}

async function getNextQuestion(stressLevel) {
  try {
    const res = await fetch(`${API}/api/v1/next-question?stress=${stressLevel}`);
    return await res.json();
  } catch {
    return { difficulty: "unknown", question: "Could not load question" };
  }
}

/* ── Export ───────────────────────────────────── */
window.api = {
  registerUser,
  loginUser,
  saveSession,
  getSession,
  clearSession,
  requireAuth,
  getProgress,
  updateProgress,
  getLatestStress,
  getNextQuestion
};