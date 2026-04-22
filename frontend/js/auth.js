/* Redirect if already logged in */
(function () {
  const session = localStorage.getItem("token");
  if (session) window.location.replace("dashboard.html");
})();

function showTab(tab) {
  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginTab     = document.getElementById("loginTab");
  const registerTab  = document.getElementById("registerTab");
  clearMsg();

  if (tab === "login") {
    loginForm.style.display    = "flex";
    registerForm.style.display = "none";
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
  } else {
    loginForm.style.display    = "none";
    registerForm.style.display = "flex";
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
  }
}

function showMsg(text, type) {
  const el = document.getElementById("authMsg");
  el.textContent  = text;
  el.className    = "auth-msg " + type;
  el.style.display = "block";
}
function clearMsg() {
  const el = document.getElementById("authMsg");
  el.style.display = "none";
}

async function handleLogin(e) {
  e.preventDefault();
  const btn   = document.getElementById("loginBtn");
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPassword").value;

  btn.disabled = true;
  btn.textContent = "Logging in...";
  clearMsg();

  try {
    const user = await window.api.loginUser(email, pass);
    window.api.saveSession(user);
    showMsg("Welcome back, " + user.username + "! Redirecting...", "success");
    setTimeout(() => window.navigate("dashboard.html"), 900);
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled    = false;
    btn.textContent = "Login →";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn      = document.getElementById("registerBtn");
  const username = document.getElementById("regUsername").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const pass     = document.getElementById("regPassword").value;

  btn.disabled = true;
  btn.textContent = "Creating account...";
  clearMsg();

  try {
    const user = await window.api.registerUser(username, email, pass);
    window.api.saveSession(user);
    showMsg("Account created! Taking you to your dashboard...", "success");
    setTimeout(() => window.navigate("dashboard.html"), 900);
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled    = false;
    btn.textContent = "Create Account →";
  }
}
