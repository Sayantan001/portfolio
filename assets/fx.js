/* =====================================================================
   Site-wide FX: decoding headings, card spotlight, magnetic buttons,
   warp streaks on fast scroll, cursor coordinates, secret OVERDRIVE mode.
   Works on index.html and the project pages. Safe if elements are missing.
   ===================================================================== */
(() => {
  const H = document.documentElement;
  const de = (localStorage.getItem("lang") === "de");
  const fine = matchMedia("(pointer:fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  H.classList.add("fxon");

  /* 1. headings decode from random glyphs when they scroll into view */
  const GL = "!<>-_/[]{}=+*^?#01ΔΣΩ";
  function decode(el) {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (!node) { el.classList.add("fx-lit"); return; }
    const fin = node.nodeValue; let f = 0;
    const iv = setInterval(() => {
      f++; const rev = f / 2;
      node.nodeValue = [...fin].map((ch, i) => (i < rev || ch === " ") ? ch : GL[Math.random() * GL.length | 0]).join("");
      if (rev >= fin.length) { clearInterval(iv); node.nodeValue = fin; }
    }, 30);
    el.classList.add("fx-lit");
  }
  const heads = document.querySelectorAll(".s h2, .blk h2, .fx-h");
  if (reduce || !("IntersectionObserver" in window)) heads.forEach(h => h.classList.add("fx-lit"));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); decode(e.target); } }), { threshold: .6 });
    heads.forEach(h => io.observe(h));
  }

  if (fine && !reduce) {
    /* 2. spotlight that follows the cursor across cards */
    const SPOT = "#app .card,#app .sk>div,#app .ex>*";
    /* 3. magnetic buttons */
    const MAG = ".btn,.bt,#sw button";
    let mag = null;
    document.addEventListener("pointermove", e => {
      const t = e.target.closest ? e.target : null; if (!t) return;
      const c = t.closest(SPOT);
      if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px"); }
      const b = t.closest(MAG);
      if (mag && mag !== b) mag.style.translate = "";
      mag = b;
      if (b) { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * .22}px ${(e.clientY - r.top - r.height / 2) * .32}px`; }
    }, { passive: true });

    /* 4. cursor coordinate readout */
    const lab = document.createElement("div"); lab.id = "fxc"; document.body.appendChild(lab);
    let mx = -200, my = -200;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function f() {
      requestAnimationFrame(f);
      lab.style.transform = `translate(${mx + 26}px,${my + 18}px)`;
      lab.textContent = `x ${String(Math.round(mx)).padStart(4, "0")}\ny ${String(Math.round(my + scrollY)).padStart(5, "0")}`;
    })();
  }

  /* 5. warp streaks + RGB split on headings when you scroll fast */
  if (!reduce) {
    const cv = document.createElement("canvas"); cv.id = "fxw"; cv.setAttribute("aria-hidden", "true");
    const bg = document.getElementById("bg");
    if (bg && bg.parentNode) bg.parentNode.insertBefore(cv, bg.nextSibling); else { cv.style.zIndex = "-1"; document.body.prepend(cv); }
    const x = cv.getContext("2d"); let W = 0, Hh = 0;
    const sz = () => { const d = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = innerWidth * d; Hh = cv.height = innerHeight * d; x.setTransform(d, 0, 0, d, 0, 0); };
    addEventListener("resize", sz); sz();
    const ST = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), l: .4 + Math.random(), m: Math.random() < .3 }));
    let ly = scrollY, v = 0, drawn = false, lastSv = 0;
    (function f() {
      requestAnimationFrame(f);
      const dy = scrollY - ly; ly = scrollY; v += (dy - v) * .18;
      const sp = Math.min(1, Math.abs(v) / 70);
      const sv = Math.round(Math.max(-1, Math.min(1, v / 60)) * 100) / 100;
      if (sv !== lastSv) { H.style.setProperty("--sv", sv); lastSv = sv; }
      if (sp < .04) { if (drawn) { x.clearRect(0, 0, innerWidth, innerHeight); drawn = false; } return; }
      drawn = true; x.clearRect(0, 0, innerWidth, innerHeight);
      const w = innerWidth, h = innerHeight;
      x.lineWidth = 1.2;
      for (const s of ST) {
        s.y -= v * s.l * .004; if (s.y < -.2) s.y += 1.4; if (s.y > 1.2) s.y -= 1.4;
        const px = s.x * w, py = s.y * h, len = v * s.l * 3;
        x.strokeStyle = s.m ? `rgba(255,63,210,${sp * .5})` : `rgba(25,240,255,${sp * .55})`;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + len); x.stroke();
      }
    })();
  }

  /* 6. OVERDRIVE: type "overdrive", enter the Konami code, or run it from the Ctrl+K terminal */
  function overdrive() {
    if (H.classList.contains("od")) return;
    H.classList.add("od");
    dispatchEvent(new Event("sp-overdrive"));
    const o = document.createElement("div"); o.id = "odx";
    o.innerHTML = `<b>OVERDRIVE</b><span>${de ? "ALLE SYSTEME AUF 300%" : "ALL SYSTEMS AT 300%"}</span>`;
    document.body.appendChild(o);
    const sb = document.getElementById("sdb");
    if (sb && sb.getAttribute("aria-pressed") === "true") try {
      const AC = window.__spAC || new (window.AudioContext || window.webkitAudioContext)(); window.__spAC = AC;
      const o1 = AC.createOscillator(), g = AC.createGain(); o1.type = "sawtooth";
      o1.frequency.setValueAtTime(70, AC.currentTime); o1.frequency.exponentialRampToValueAtTime(900, AC.currentTime + 1.2);
      g.gain.setValueAtTime(.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(.05, AC.currentTime + .1); g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + 1.4);
      o1.connect(g); g.connect(AC.destination); o1.start(); o1.stop(AC.currentTime + 1.5);
    } catch (e) { }
    setTimeout(() => { H.classList.remove("od"); o.remove(); }, 7000);
  }
  window.SPFX = { overdrive };
  const KON = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let typed = "", ks = [];
  addEventListener("keydown", e => {
    const tg = e.target; if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    const k = (e.key || "").toLowerCase();
    ks.push(k); ks = ks.slice(-10); if (ks.join() === KON.join()) overdrive();
    if (k.length === 1) { typed = (typed + k).slice(-9); if (typed === "overdrive") overdrive(); }
  });
})();
