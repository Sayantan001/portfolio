/* =====================================================================
   LiDAR LAB: a GPU point cloud that morphs between shapes.
   name -> face scan (from your photo) -> robotic arm -> quadcopter -> globe
   Drag = rotate, move = disturb, click = shockwave.
   Usage (from index.html): SPLidar(document.getElementById("ldr"), {photo, lang})
   ===================================================================== */
window.SPLidar = function (root, opt) {
  if (!root || !window.THREE) return;
  const de = opt.lang === "de";
  const T = {
    name: de ? "Name" : "Name", face: de ? "Gesichtsscan" : "Face scan", arm: de ? "Roboterarm" : "Robotic arm",
    drone: de ? "Quadrocopter" : "Quadcopter", globe: "Kolkata → Bonn"
  };
  const mobile = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
  const N = mobile ? 9000 : 18432;
  const fmt = n => n.toLocaleString(de ? "de-DE" : "en-US");

  /* ---------- renderer ---------- */
  let ren;
  try { ren = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" }); } catch (e) { ren = null; }
  if (!ren) { root.classList.add("nogl"); root.querySelector(".ldr-msg").textContent = de ? "WebGL ist auf diesem Gerät nicht verfügbar." : "WebGL is not available on this device."; return; }
  const PR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  ren.setPixelRatio(PR);
  ren.domElement.className = "ldr-c";
  root.prepend(ren.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(45, 1, .1, 100);

  /* ---------- helpers ---------- */
  const rnd = Math.random, col = h => new THREE.Color(h);
  const C = { c: col("#19f0ff"), m: col("#ff3fd2"), a: col("#ffb23e"), w: col("#ffffff"), d: col("#2a6cff") };

  // sample N points on the surfaces of a list of transformed geometries
  function sampleParts(parts, n) {
    const tris = [];
    let total = 0;
    parts.forEach(p => {
      const g = p.g.index ? p.g.toNonIndexed() : p.g;
      g.applyMatrix4(p.mx || new THREE.Matrix4());
      const a = g.attributes.position.array;
      for (let i = 0; i < a.length; i += 9) {
        const A = new THREE.Vector3(a[i], a[i + 1], a[i + 2]), B = new THREE.Vector3(a[i + 3], a[i + 4], a[i + 5]), Cc = new THREE.Vector3(a[i + 6], a[i + 7], a[i + 8]);
        const area = new THREE.Vector3().crossVectors(B.clone().sub(A), Cc.clone().sub(A)).length() * .5 * (p.w || 1);
        if (area <= 0) continue;
        total += area; tris.push({ A, B, C: Cc, cum: total, col: p.c });
      }
    });
    const pos = new Float32Array(n * 3), cl = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rnd() * total;
      let lo = 0, hi = tris.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tris[mid].cum < r) lo = mid + 1; else hi = mid; }
      const t = tris[lo];
      let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const x = t.A.x + (t.B.x - t.A.x) * u + (t.C.x - t.A.x) * v, y = t.A.y + (t.B.y - t.A.y) * u + (t.C.y - t.A.y) * v, z = t.A.z + (t.B.z - t.A.z) * u + (t.C.z - t.A.z) * v;
      pos.set([x, y, z], i * 3);
      const c = typeof t.col === "function" ? t.col(x, y, z) : t.col;
      cl.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, cl };
  }
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  // center a shape and scale it so its largest side is `size`
  function fit(s, size = 6.2) {
    const p = s.pos, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < p.length; i++) { const k = i % 3; if (p[i] < mn[k]) mn[k] = p[i]; if (p[i] > mx[k]) mx[k] = p[i]; }
    const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], sc = size / Math.max(mx[0] - mn[0], mx[1] - mn[1]);
    for (let i = 0; i < p.length; i++) p[i] = (p[i] - c[i % 3]) * sc;
    return s;
  }
  const mixC = (a, b, t) => a.clone().lerp(b, t);

  /* ---------- shapes ---------- */
  const S = {};

  // galaxy: the "unassembled" state before the section scrolls into view
  S.galaxy = (() => {
    const pos = new Float32Array(N * 3), cl = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const arm = i % 3, r = Math.pow(rnd(), .6) * 9, a = arm * 2.094 + r * .55 + (rnd() - .5) * .6;
      pos.set([Math.cos(a) * r, (rnd() - .5) * (1.6 - r * .12), Math.sin(a) * r - 2], i * 3);
      const c = mixC(C.c, C.m, Math.min(1, r / 8)); cl.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, cl };
  })();

  // name, sampled from rendered text
  function makeName() {
    const cv = document.createElement("canvas"), W = 1100, H = 420, x = cv.getContext("2d");
    cv.width = W; cv.height = H;
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "700 190px 'Chakra Petch', 'Arial Black', sans-serif"; x.fillText("SAYANTAN", W / 2, 120);
    x.font = "700 190px 'Chakra Petch', 'Arial Black', sans-serif"; x.fillText("PANDA", W / 2, 310);
    const d = x.getImageData(0, 0, W, H).data, on = [];
    for (let j = 0; j < H; j += 2) for (let i = 0; i < W; i += 2) if (d[(j * W + i) * 4 + 3] > 128) on.push(i, j);
    const pos = new Float32Array(N * 3), cl = new Float32Array(N * 3), cnt = on.length / 2;
    for (let k = 0; k < N; k++) {
      const q = (rnd() * cnt | 0) * 2, px = on[q] + rnd() * 2, py = on[q + 1] + rnd() * 2;
      pos.set([px, -py, (rnd() - .5) * 26], k * 3);
      const c = rnd() < .04 ? C.a : mixC(C.c, C.m, px / W); cl.set([c.r, c.g, c.b], k * 3);
    }
    return fit({ pos, cl }, 6.6);
  }

  // face: depth-from-luminance scan of the portrait photo
  function makeFace(img) {
    const W = 300, H = Math.round(W * img.naturalHeight / img.naturalWidth), cv = document.createElement("canvas"), x = cv.getContext("2d");
    cv.width = W; cv.height = H; x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data;
    // where the person is in the photo (fractions of width/height)
        const torso = (u, v) => Math.exp(-(((u - .5) / .52) ** 2 + ((v - .86) / .5) ** 2) * 1.3);
    const cand = [], LH = [1, 0], LT = [1, 0];
    const head2 = (u, v) => Math.exp(-(((u - .47) / .2) ** 2 + ((v - .27) / .27) ** 2) * 1.3);
    for (let j = 0; j < H * .8; j++) for (let i = 0; i < W; i++) {
      const u = i / W, v = j / H, hh = head2(u, v), m = Math.max(hh, torso(u, v) * (v > .3 ? 1.3 : 0));
      const o = (j * W + i) * 4, l = (.3 * d[o] + .59 * d[o + 1] + .11 * d[o + 2]) / 255, R = hh > .45 ? LH : LT;
      if (m > .4) { const rep = hh > .45 ? 4 : 1; for (let r = 0; r < rep; r++) cand.push(i, j, l, hh); if (l < R[0]) R[0] = l; if (l > R[1]) R[1] = l; }
    }
    const nc = cand.length / 4, pos = new Float32Array(N * 3), cl = new Float32Array(N * 3), dark = C.m.clone().multiplyScalar(.5), tmp = new THREE.Color();
    for (let k = 0; k < N; k++) {
      if (k > N * .97) { pos.set([rnd() * W, -rnd() * H * .8, -70], k * 3); cl.set([.04, .22, .3], k * 3); continue; }
      const q = (rnd() * nc | 0) * 4, px = cand[q] + rnd(), py = cand[q + 1] + rnd(), hd = cand[q + 3], R = hd > .45 ? LH : LT, l = Math.max(0, Math.min(1, (cand[q + 2] - R[0]) / (R[1] - R[0] + 1e-3)));
      const z = hd * 34 + torso(px / W, py / H) * 18 + l * 8;
      pos.set([px, -py, z], k * 3);
      tmp.copy(C.c).lerp(C.w, Math.pow(l, 1.6)); const c = dark.clone().lerp(tmp, Math.pow(l, .9)).multiplyScalar(.28 + l * 1.05);
      cl.set([c.r, c.g, c.b], k * 3);
    }
    return fit({ pos, cl }, 6.4);
  }

  // robotic arm
  function makeArm() {
    const G = THREE, P = [];
    const cyl = (r, h, mx, c, w) => P.push({ g: new G.CylinderGeometry(r, r, h, 40, 1), mx, c, w });
    const box = (sx, sy, sz, mx, c, w) => P.push({ g: new G.BoxGeometry(sx, sy, sz), mx, c, w });
    const link = (ax, ay, bx, by, t, c) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); box(t, L, t, M((ax + bx) / 2, (ay + by) / 2, 0, 0, 0, -Math.atan2(dx, dy)), c); };
    P.push({ g: new G.RingGeometry(1.4, 2.8, 64, 3), mx: M(0, 0, 0, -Math.PI / 2), c: (x, y, z) => mixC(C.c, C.d, Math.hypot(x, z) / 2.8), w: .35 });
    cyl(1.25, .35, M(0, .18, 0), C.c);
    cyl(.8, .6, M(0, .65, 0), C.c);
    const sh = [0, 1.25], el = [1.15, 3.6], wr = [3.25, 2.7];
    cyl(.48, .95, M(sh[0], sh[1], 0, Math.PI / 2), C.m, 1.4);
    link(sh[0], sh[1], el[0], el[1], .48, C.c);
    cyl(.4, .8, M(el[0], el[1], 0, Math.PI / 2), C.m, 1.4);
    link(el[0], el[1], wr[0], wr[1], .4, C.c);
    P.push({ g: new G.SphereGeometry(.32, 24, 16), mx: M(wr[0], wr[1], 0), c: C.a, w: 1.5 });
    box(.6, .14, .5, M(wr[0], wr[1] - .4, 0), C.a);
    box(.1, .65, .22, M(wr[0] - .22, wr[1] - .8, 0), C.a, 1.6);
    box(.1, .65, .22, M(wr[0] + .22, wr[1] - .8, 0), C.a, 1.6);
    return fit(sampleParts(P, N), 6.2);
  }

  // quadcopter
  function makeDrone() {
    const G = THREE, P = [];
    P.push({ g: new G.BoxGeometry(1.5, .38, 1.5), mx: M(), c: C.c });
    P.push({ g: new G.SphereGeometry(.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mx: M(0, .19, 0), c: C.c });
    P.push({ g: new G.BoxGeometry(4.6, .14, .2), mx: M(0, 0, 0, 0, Math.PI / 4), c: C.c });
    P.push({ g: new G.BoxGeometry(4.6, .14, .2), mx: M(0, 0, 0, 0, -Math.PI / 4), c: C.c });
    P.push({ g: new G.SphereGeometry(.26, 16, 12), mx: M(0, -.42, .3), c: C.a, w: 2 });
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      const x = sx * 1.63, z = sz * 1.63;
      P.push({ g: new G.CylinderGeometry(.24, .24, .34, 24), mx: M(x, .12, z), c: C.m, w: 1.4 });
      P.push({ g: new G.TorusGeometry(.95, .035, 6, 72), mx: M(x, .36, z, Math.PI / 2), c: C.a, w: 2.2 });
      P.push({ g: new G.BoxGeometry(1.75, .02, .16), mx: M(x, .34, z, 0, rnd() * 3), c: mixC(C.a, C.w, .4), w: 1.3 });
      P.push({ g: new G.BoxGeometry(.08, .5, .08), mx: M(sx * .55, -.4, sz * .55), c: C.c });
    });
    return fit(sampleParts(P, N), 6.4);
  }

  // globe with the Kolkata -> Bonn arc
  const KOL = [22.5726, 88.3639], BON = [50.7374, 7.0982];
  const KM = (() => { const r = Math.PI / 180, a = Math.sin((BON[0] - KOL[0]) * r / 2) ** 2 + Math.cos(KOL[0] * r) * Math.cos(BON[0] * r) * Math.sin((BON[1] - KOL[1]) * r / 2) ** 2; return Math.round(6371 * 2 * Math.asin(Math.sqrt(a))); })();
  function makeGlobe() {
    const R = 3, r = Math.PI / 180;
    const ll = (lat, lon, h = 0) => { const la = lat * r, lo = (lon - 48) * r; return [(R + h) * Math.cos(la) * Math.sin(lo), (R + h) * Math.sin(la), (R + h) * Math.cos(la) * Math.cos(lo)]; };
    const pos = new Float32Array(N * 3), cl = new Float32Array(N * 3);
    const A = new THREE.Vector3(...ll(...KOL)).normalize(), B = new THREE.Vector3(...ll(...BON)).normalize(), om = A.angleTo(B);
    for (let i = 0; i < N; i++) {
      const t = rnd(); let p, c;
      if (t < .42) { const u = rnd() * 2 - 1, a = rnd() * 6.283, s = Math.sqrt(1 - u * u); p = [R * s * Math.cos(a), R * u, R * s * Math.sin(a)]; c = mixC(C.d, C.c, .25).multiplyScalar(.55); }
      else if (t < .74) { const lat = rnd() < .5 ? (Math.round(rnd() * 8) - 4) * 20 : rnd() * 180 - 90, lon = rnd() < .5 ? rnd() * 360 : Math.round(rnd() * 18) * 20; p = ll(lat, lon); c = C.c; }
      else if (t < .93) { const s = rnd(), v = A.clone().multiplyScalar(Math.sin((1 - s) * om)).add(B.clone().multiplyScalar(Math.sin(s * om))).divideScalar(Math.sin(om)).normalize().multiplyScalar(R + Math.sin(s * Math.PI) * .55 + (rnd() - .5) * .04); p = [v.x, v.y, v.z]; c = mixC(C.a, C.m, s); }
      else { const k = rnd() < .5 ? KOL : BON, base = new THREE.Vector3(...ll(...k)), dir = base.clone().normalize(); const v = base.add(dir.multiplyScalar(rnd() * .45)).add(new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(.12)); p = [v.x, v.y, v.z]; c = k === KOL ? C.a : C.m; }
      pos.set(p, i * 3); cl.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, cl };
  }

  const ORDER = ["name", "face", "arm", "drone", "globe"];
  const INFO = {
    name: () => (de ? `${fmt(N)} Punkte, aus Schrift abgetastet` : `${fmt(N)} points sampled from type`),
    face: () => (de ? "Tiefe aus Helligkeit geschätzt. Ja, das bin ich." : "depth estimated from luminance. yes, that is me."),
    arm: () => (de ? "Manipulator, Oberflächen als Punktwolke abgetastet" : "manipulator, surfaces sampled as a point cloud"),
    drone: () => (de ? "Quad-X-Rahmen, 4 Rotoren" : "quad-X frame, 4 rotors"),
    globe: () => (de ? `Kolkata → Bonn, ${fmt(KM)} km Großkreis` : `Kolkata → Bonn, ${fmt(KM)} km great circle`)
  };

  /* ---------- GPU points ---------- */
  const geo = new THREE.BufferGeometry();
  const aA = new Float32Array(S.galaxy.pos), aB = new Float32Array(S.galaxy.pos), cA = new Float32Array(S.galaxy.cl), cB = new Float32Array(S.galaxy.cl), aR = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) aR[i] = rnd();
  geo.setAttribute("position", new THREE.BufferAttribute(aB, 3));
  geo.setAttribute("aA", new THREE.BufferAttribute(aA, 3));
  geo.setAttribute("aB", new THREE.BufferAttribute(aB, 3));
  geo.setAttribute("cA", new THREE.BufferAttribute(cA, 3));
  geo.setAttribute("cB", new THREE.BufferAttribute(cB, 3));
  geo.setAttribute("aR", new THREE.BufferAttribute(aR, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
  const U = {
    uT: { value: 0 }, uP: { value: 1 }, uSize: { value: mobile ? 26 : 22 }, uPR: { value: PR }, uScan: { value: -9 }, uMouse: { value: new THREE.Vector2(9, 9) },
    uAsp: { value: 1 }, uShO: { value: new THREE.Vector3() }, uShT: { value: -99 }, uOD: { value: 0 }, uBurst: { value: 1.6 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uT,uP,uSize,uPR,uScan,uAsp,uShT,uOD,uBurst; uniform vec2 uMouse; uniform vec3 uShO;
      attribute vec3 aA,aB,cA,cB; attribute vec4 aR;
      varying vec3 vC; varying float vA;
      void main(){
        float p=clamp((uP-aR.x*.4)/.6,0.,1.); p=p*p*(3.-2.*p);
        vec3 pos=mix(aA,aB,p);
        vec3 n=vec3(sin(aR.y*61.+uT*1.3+pos.y),sin(aR.z*53.+uT*1.1+pos.z),sin(aR.w*47.+uT*1.7+pos.x));
        float burst=sin(p*3.14159);
        pos+=n*(burst*(uBurst+aR.x*1.6)+.012+uOD*(.5+aR.y*1.4));
        float age=uT-uShT, sd=distance(pos,uShO);
        float ring=exp(-pow((sd-age*7.)*1.4,2.))*exp(-age*1.1);
        pos+=normalize(pos-uShO+vec3(1e-4))*ring*1.1;
        vec4 mv=modelViewMatrix*vec4(pos,1.);
        vec4 cp=projectionMatrix*mv;
        vec2 dm=cp.xy/cp.w-uMouse; dm.x*=uAsp;
        float f=smoothstep(.3,0.,length(dm));
        cp.xy+=normalize(dm+1e-5)*f*.2*cp.w;
        float band=exp(-pow((pos.y-uScan)*4.,2.));
        vC=mix(cA,cB,p);
        vC=mix(vC,vec3(1.),band*.5)+vec3(.1,.9,1.)*f*.5+vec3(1.,.25,.8)*ring*.8;
        vA=.62+band*.5+f*.3+ring*.4;
        gl_Position=cp;
        gl_PointSize=uSize*uPR*(.75+aR.y*.5+band*.8+ring)/-mv.z;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){ vec2 c=gl_PointCoord-.5; float r=length(c); if(r>.5) discard; gl_FragColor=vec4(vC,smoothstep(.5,.05,r)*vA*.85); }`
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);

  /* ---------- morphing ---------- */
  let cur = "galaxy", mT0 = -1, mDur = 2.4, clock = 0;
  const cpu = (src, dst, p) => { for (let i = 0; i < dst.length; i++) dst[i] = src[i]; };
  function morph(name, dur = 2.4) {
    if (!S[name]) return;
    // freeze the current visual state (approximately) as the new start
    const p = U.uP.value;
    if (p < 1) for (let i = 0; i < N * 3; i++) { aA[i] += (aB[i] - aA[i]) * p; cA[i] += (cB[i] - cA[i]) * p; }
    else { cpu(aB, aA); cpu(cB, cA); }
    aB.set(S[name].pos); cB.set(S[name].cl);
    ["aA", "aB", "cA", "cB"].forEach(k => geo.attributes[k].needsUpdate = true);
    U.uP.value = 0; mT0 = clock; mDur = dur; U.uBurst.value = cur === "galaxy" ? 2.6 : 1.5; cur = name;
    tabs.forEach(b => b.classList.toggle("on", b.dataset.s === name));
    modeEl.textContent = T[name].toUpperCase();
    infoEl.textContent = INFO[name]();
    root.dataset.mode = name;
  }

  /* ---------- HUD ---------- */
  const tabBox = root.querySelector(".ldr-tabs"), modeEl = root.querySelector("#ldm"), infoEl = root.querySelector("#ldi"), fpsEl = root.querySelector("#ldf");
  root.querySelector("#ldn").textContent = fmt(N) + (de ? " Pkt" : " pts");
  tabBox.innerHTML = ORDER.map((k, i) => `<button class="bt" data-s="${k}"><i>0${i + 1}</i>${T[k]}</button>`).join("");
  const tabs = [...tabBox.querySelectorAll("button")];
  let idle = 0;
  tabs.forEach(b => b.onclick = () => { idle = -6; if (b.dataset.s !== cur) morph(b.dataset.s); });

  /* ---------- build shapes (face waits for the photo) ---------- */
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load("700 190px 'Chakra Petch'").catch(() => {}) : Promise.resolve();
  S.arm = makeArm(); S.drone = makeDrone(); S.globe = makeGlobe();
  fontReady.then(() => { S.name = makeName(); if (started && cur === "galaxy") morph("name", 3); });
  if (opt.photo) { const im = new Image(); im.onload = () => { try { S.face = makeFace(im); } catch (e) { } }; im.src = opt.photo; }

  /* ---------- interaction ---------- */
  let rotY = 0, rotX = 0, vY = 0, vX = 0, drag = null, moved = 0;
  const el = ren.domElement;
  const ndc = e => { const r = el.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1]; };
  el.addEventListener("pointermove", e => {
    const [x, y] = ndc(e);
    if (e.pointerType !== "touch") U.uMouse.value.set(x, y);
    if (drag) { const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; moved += Math.abs(dx) + Math.abs(dy); vY = dx * .006; vX = dy * .004; rotY += vY; rotX = Math.max(-.7, Math.min(.7, rotX + vX)); drag = [e.clientX, e.clientY]; idle = -4; }
  });
  el.addEventListener("pointerleave", () => U.uMouse.value.set(9, 9));
  el.addEventListener("pointerdown", e => { drag = [e.clientX, e.clientY]; moved = 0; });
  let taps = [];
  addEventListener("pointerup", e => {
    if (!drag) return; drag = null;
    if (moved < 8 && e.target === el) {
      shock(...ndc(e));
      const now = performance.now(); taps = taps.filter(t => now - t < 2200); taps.push(now);
      if (taps.length >= 5 && window.SPFX) { taps = []; SPFX.overdrive(); }
    }
  });
  addEventListener("pointercancel", () => { drag = null; });
  const rc = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  function shock(x, y) {
    rc.setFromCamera(new THREE.Vector2(x, y), cam);
    if (!rc.ray.intersectPlane(plane, hit)) return;
    pts.updateMatrixWorld(); U.uShO.value.copy(pts.worldToLocal(hit.clone())); U.uShT.value = clock;
    root.classList.remove("hitfx"); void root.offsetWidth; root.classList.add("hitfx");
  }

  // OVERDRIVE easter egg (fired by fx.js)
  let od = 0;
  addEventListener("sp-overdrive", () => { od = 7; });

  /* ---------- sizing, visibility, loop ---------- */
  function size() {
    const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
    ren.setSize(w, h, false); cam.aspect = w / h; U.uAsp.value = w / h;
    const need = 7.4 / (2 * Math.tan(22.5 * Math.PI / 180));
    cam.position.set(0, 0, Math.max(need * 1.18, need / Math.min(1, cam.aspect) * 1.02)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }
  addEventListener("resize", size); size();
  let vis = false, started = false;
  new IntersectionObserver(es => {
    vis = es[0].isIntersecting;
    if (vis && !started && es[0].intersectionRatio > .35) { started = true; if (S.name) morph("name", 3); }
  }, { threshold: [0, .35, .6] }).observe(root);

  let last = performance.now(), fAcc = 0, fN = 0, scanT = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!vis || document.hidden) return;
    clock += dt; U.uT.value = clock;
    if (mT0 >= 0) U.uP.value = Math.min(1, (clock - mT0) / mDur);
    // lidar sweep
    scanT += dt; U.uScan.value = -4.5 + ((scanT % 3.2) / 3.2) * 9;
    // rotation: gentle sway + user drag with inertia
    if (!drag) { vY *= .94; vX *= .9; rotY += vY; rotY *= .985; rotX *= .97; }
    const st = clock - Math.max(0, mT0), sway = cur === "globe" ? Math.sin(st * .3) * .7 : Math.sin(st * .35) * (cur === "name" || cur === "face" ? .3 : .55);
    pts.rotation.set(rotX + (cur === "drone" ? .35 : cur === "globe" ? .3 : 0), rotY + sway, 0);
    // overdrive
    if (od > 0) { od -= dt; U.uOD.value = Math.min(1, od / 2) * (0.6 + .4 * Math.sin(clock * 20)); if (Math.random() < .06) { U.uShO.value.set((rnd() - .5) * 5, (rnd() - .5) * 4, 0); U.uShT.value = clock; } }
    else U.uOD.value = 0;
    // auto-cycle when nobody touches it
    if (started && cur !== "galaxy" && U.uP.value >= 1) { idle += dt; if (idle > 6.5) { idle = 0; let i = ORDER.indexOf(cur); let nx = ORDER[(i + 1) % ORDER.length]; if (!S[nx]) nx = ORDER[(i + 2) % ORDER.length]; morph(nx); } }
    ren.render(scene, cam);
    fAcc += dt; fN++; if (fAcc > .5) { fpsEl.textContent = Math.round(fN / fAcc) + " fps"; fAcc = 0; fN = 0; }
  })(last);
};
