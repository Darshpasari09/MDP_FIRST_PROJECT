const AHEAD = 6;

const session = window.api.requireAuth();
if (session) init();

async function init() {
  const initials = session.username.slice(0, 2).toUpperCase();
  document.getElementById("userAvatar").textContent    = initials;
  document.getElementById("userAvatarLg").textContent  = initials;
  document.getElementById("userName").textContent      = session.username;
  document.getElementById("userInfoName").textContent  = session.username;
  document.getElementById("userInfoEmail").textContent = session.email;

  const progress = await window.api.getProgress(session.userId, session.token);
  renderStats(progress);
  renderTree(progress.questions_solved);
}

function renderStats(p) {
  const solved   = p.questions_solved;
  const correct  = p.correct_answers;
  const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
  const next     = Math.ceil((solved + 1) / 5) * 5;

  document.getElementById("statSolved").textContent   = solved;
  document.getElementById("statAccuracy").textContent = accuracy + "%";
  document.getElementById("statNext").textContent     = next + " Qs";
  document.getElementById("qsStat").textContent       = solved;
  document.getElementById("caStat").textContent       = correct;
  document.getElementById("accStat").textContent      = accuracy + "%";
}

/* ─────────────────────────────────────────────────────────────
   Fluent SVG path — glowing 3D twisting ribbon (Tech aesthetic)
──────────────────────────────────────────────────────────── */
function renderTree(questionsSolved) {
  const container = document.getElementById("questionTree");
  const W  = Math.max(container.clientWidth || 380, 260);
  const CX = W / 2;

  // Always show completed + current + AHEAD locked (unlimited growth)
  const TOTAL   = Math.max(questionsSolved + 1 + AHEAD, 8);
  const SPACING = 120; // more vertical room for the waves
  const AMP     = W * 0.35; 

  // 1. Compute node positions along central sinusoidal path
  const nodes = [];
  for (let i = 0; i < TOTAL; i++) {
    const x = CX + Math.sin(i * 1.0) * AMP;
    const y = 80 + i * SPACING;
    nodes.push({ x, y, num: i + 1 });
  }

  const SVG_H = 80 + (TOTAL - 1) * SPACING + 100;

  // 2. Build twisting 3D path function
  function makeRibbonLine(pts, widthOffset, layerPitch) {
    if (!pts || pts.length < 2) return "";
    let d = "";
    for (let i = 0; i < pts.length; i++) {
       // Twist changes slowly over the path creating 3D crossovers
       const twist = Math.sin(i * 0.7 + layerPitch) * widthOffset;
       const px = pts[i].x + twist;
       
       if (i === 0) {
         d += `M ${px.toFixed(1)},${pts[i].y.toFixed(1)}`;
       } else {
         const prevT = Math.sin((i-1) * 0.7 + layerPitch) * widthOffset;
         const prevX = pts[i-1].x + prevT;
         const cy = SPACING * 0.5;
         d += ` C ${prevX.toFixed(1)},${(pts[i-1].y + cy).toFixed(1)} ${px.toFixed(1)},${(pts[i].y - cy).toFixed(1)} ${px.toFixed(1)},${pts[i].y.toFixed(1)}`;
       }
    }
    return d;
  }

  let waveLinesHTML = "";
  
  // Layer 1: Background thick glow bundle
  for (let w = -8; w <= 8; w++) {
    const opacity = 0.15 - Math.abs(w) * 0.015;
    waveLinesHTML += `<path d="${makeRibbonLine(nodes, w * 5, 0)}" fill="none" stroke="rgba(46,204,113,${opacity})" stroke-width="2" />`;
  }
  
  // Layer 2: Secondary overlapping wireframe ribbon
  const secNodes = [];
  for (let i = 0; i < TOTAL; i++) {
    const x = CX + Math.sin(i * 1.2 + 3) * (AMP * 0.8);
    const y = 80 + i * SPACING;
    secNodes.push({ x, y });
  }
  for (let w = -4; w <= 4; w++) {
    const opacity = 0.1 - Math.abs(w) * 0.02;
    waveLinesHTML += `<path d="${makeRibbonLine(secNodes, w * 8, 2)}" fill="none" stroke="rgba(88,214,141,${opacity})" stroke-width="1.5" />`;
  }

  // ── 3. Tech Background Accents (From user image) ──
  let accentsHTML = "";
  const codeSnippets = [
    "for (element) {", "  insert(element);", "}", "</>", "{ }", "max(A, B)", "O(N log N)", "const root = new Node();"
  ];
  for (let i = 0; i < TOTAL * 1.5; i++) {
    const rx = CX + (Math.random() > 0.5 ? 1 : -1) * (AMP + 20 + Math.random() * 60);
    const ry = 40 + i * (SPACING * 0.6) + (Math.random() * 60 - 30);
    const text = codeSnippets[i % codeSnippets.length];
    accentsHTML += `<text x="${rx}" y="${ry}" fill="rgba(88,214,141,0.2)" font-family="monospace" font-size="12">${text}</text>`;
    // abstract geometric lines
    if (i % 3 === 0) {
      accentsHTML += `<path d="M ${rx-20},${ry+10} l 30,0 l 10,10" fill="none" stroke="rgba(88,214,141,0.15)" stroke-width="1"/>`;
    }
  }

  // Completed highlight (central line)
  const doneNodes = nodes.slice(0, Math.max(questionsSolved + 1, 1));
  const donePath  = makeRibbonLine(doneNodes, 0, 0);

  // ── 4. Build SVG node groups ──
  let nodesHTML = "";
  for (let i = 0; i < TOTAL; i++) {
    const { x, y, num } = nodes[i];
    const status =
      num <= questionsSolved        ? "completed" :
      num === questionsSolved + 1   ? "current"   : "locked";

    const isClick = status === "current";
    const R       = status === "current" ? 28 : 24;
    const label   = status === "completed" ? "✓" : String(num);

    nodesHTML += `
      <g class="svg-node ${status}"
         ${isClick ? `onclick="window.navigate('learning.html')"` : ""}
         style="cursor:${isClick ? "pointer" : "default"}">
        ${status === "current" ? `
          <circle class="ring-anim" cx="${x}" cy="${y}" r="${R + 10}"
                  fill="rgba(46,204,113,0.12)" stroke="rgba(46,204,113,0.25)" stroke-width="1.5"/>` : ""}
        <circle cx="${x}" cy="${y}" r="${R}"/>
        <text class="node-text" x="${x}" y="${y}" text-anchor="middle"
              dominant-baseline="central">${label}</text>
        <text class="node-sub"  x="${x}" y="${y + R + 13}" text-anchor="middle">Q${num}</text>
      </g>`;
  }

  // ── 5. Assemble SVG ──
  // ── 5. Assemble SVG ──
  container.innerHTML = `
    <svg width="${W}" height="${SVG_H}" viewBox="0 0 ${W} ${SVG_H}" style="overflow:visible;display:block;">
      ${waveLinesHTML}
      ${accentsHTML}
      ${donePath ? `<path d="${donePath}" fill="none"
            stroke="rgba(46,204,113,0.6)" stroke-width="6" filter="drop-shadow(0 0 4px rgba(46,204,113,0.8))"
            stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      ${nodesHTML}
    </svg>`;

  setTimeout(() => {
    const cur = container.querySelector(".svg-node.current");
    if (cur) cur.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 300);
}

function logout() {
  window.api.clearSession();
  window.navigate("index.html");
}
