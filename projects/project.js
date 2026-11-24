/* Shared behaviour for the project detail pages:
   arrival animation, title decode, scroll reveals, counters, meters, timeline line,
   lightbox, background particles, exit animation back to the portfolio. */
(()=>{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const AC=getComputedStyle(document.body).getPropertyValue("--ac").trim()||"25,240,255";

/* ---------- arrival: the bands that covered the screen on the portfolio slide away ---------- */
const warp=$("#warp");
const GL="01<>/\\|#$%&*+=?ABCDEFXYZ";
function decode(el,ms){const t=el.dataset.text||el.textContent;el.dataset.text=t;if(RM){el.textContent=t;return}
 const t0=performance.now();(function f(n){const k=Math.min(1,(n-t0)/ms);let s="";for(let i=0;i<t.length;i++){const c=t[i];s+=c===" "||i/t.length<k?c:GL[Math.random()*GL.length|0]}el.textContent=s;if(k<1)requestAnimationFrame(f)})(t0)}
function arrive(){
 try{sessionStorage.removeItem("pjwarp")}catch(e){}
 const h=$(".hero h1");
 if(RM||!warp){if(warp)warp.classList.add("gone");return}
 setTimeout(()=>{warp.classList.add("out");decode(h,900);
  $$(".hero .rv").forEach((e,i)=>setTimeout(()=>e.classList.add("in"),250+i*90))},260);
 setTimeout(()=>warp.classList.add("gone"),1300)}
if(RM)$$(".rv").forEach(e=>e.classList.add("in"));
addEventListener("pageshow",e=>{if(e.persisted&&warp){document.body.classList.remove("exiting");warp.classList.add("out","gone")}});
document.readyState==="loading"?addEventListener("DOMContentLoaded",arrive):arrive();

/* ---------- exit: bands slam back in, then navigate ---------- */
function leave(href,label){if(RM||!warp){location.href=href;return}
 const hb=warp.querySelector(".hd b");if(hb&&label){hb.textContent=label}
 warp.classList.remove("gone");void warp.offsetWidth;document.body.classList.add("exiting");
 warp.classList.remove("out");setTimeout(()=>{location.href=href},780)}
document.addEventListener("click",e=>{const a=e.target.closest("a[data-leave]");if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
 e.preventDefault();if(a.dataset.leave==="pj"){try{sessionStorage.setItem("pjwarp","1")}catch(x){}}leave(a.href,a.dataset.label)});

/* ---------- scroll reveal, counters, meters, step line ---------- */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;el.classList.add("in");io.unobserve(el);
 if(el.matches(".stat")){const b=el.querySelector("b"),v=+b.dataset.v,d=+(b.dataset.d||0),p=b.dataset.p||"",s=b.dataset.s||"";if(RM){b.textContent=p+v.toFixed(d)+s;return}
  const t0=performance.now();(function f(n){const k=Math.min(1,(n-t0)/1500),q=1-Math.pow(1-k,3);b.textContent=p+(v*q).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})+s;if(k<1)requestAnimationFrame(f)})(t0)}
 if(el.matches(".meters"))el.querySelectorAll("i[data-w]").forEach((i,k)=>setTimeout(()=>{i.style.width=i.dataset.w+"%"},k*90))
}),{threshold:.18,rootMargin:"0px 0px -6% 0px"});
$$(".doc .rv,.blk,.stat,.meters,.step").forEach(e=>io.observe(e));
setTimeout(()=>$$(".stats .rv").forEach(e=>e.classList.add("in")),RM?0:900);

/* timeline line grows with scroll */
const stepsEls=$$(".steps");
function stepLine(){stepsEls.forEach(s=>{const r=s.getBoundingClientRect(),l=s.querySelector(".line");if(!l)return;
 const p=Math.min(1,Math.max(0,(innerHeight*.7-r.top)/r.height));l.style.height=(p*(r.height-12))+"px"})}

/* progress bar + active section in nav/toc */
const bar=$("#bar"),secs=$$(".blk[id]"),links=$$(".ph nav a,.toc a");
function onScroll(){const m=document.documentElement.scrollHeight-innerHeight;bar.style.width=(m>0?scrollY/m*100:0)+"%";stepLine();
 let cur="";for(const s of secs){if(s.getBoundingClientRect().top<innerHeight*.35)cur=s.id}
 links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+cur))}
/* safety net: anything still hidden is shown once the reader reaches the end of the page */
function revealRest(){if(innerHeight+scrollY>=document.documentElement.scrollHeight-80)$$(".rv:not(.in),.blk:not(.in),.step:not(.in)").forEach(e=>{e.classList.add("in");io.unobserve(e)})}
addEventListener("scroll",revealRest,{passive:true});
addEventListener("scroll",onScroll,{passive:true});addEventListener("resize",onScroll);onScroll();

/* feature cards: glow follows the cursor */
$$(".feat").forEach(f=>f.addEventListener("pointermove",e=>{const r=f.getBoundingClientRect();f.style.setProperty("--mx",(e.clientX-r.left)+"px");f.style.setProperty("--my",(e.clientY-r.top)+"px")}));

/* hero frame tilt */
const fr=$(".frame");if(fr&&!RM&&matchMedia("(pointer:fine)").matches){
 fr.addEventListener("pointermove",e=>{const r=fr.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;fr.style.transform=`perspective(1000px) rotateY(${x*10}deg) rotateX(${-y*10}deg)`});
 fr.addEventListener("pointerleave",()=>{fr.style.transform=""})}

/* ---------- lightbox ---------- */
const lb=$("#lbx"),imgs=$$(".fig .im img, .frame .fi img");let li=0;
function show(i){li=(i+imgs.length)%imgs.length;const im=imgs[li],cap=im.closest("figure")?.querySelector("figcaption");
 const big=lb.querySelector("img");big.src=im.dataset.full||im.src;big.alt=im.alt;lb.querySelector("p").textContent=cap?cap.textContent:im.alt;
 lb.querySelector(".c").textContent=`${li+1} / ${imgs.length}`;lb.classList.add("on");document.body.classList.add("lock")}
function hide(){lb.classList.remove("on");document.body.classList.remove("lock")}
imgs.forEach((im,i)=>(im.closest(".im")||im.closest(".fi")).addEventListener("click",()=>show(i)));
lb.addEventListener("click",e=>{if(e.target.closest(".p"))return show(li-1);if(e.target.closest(".n"))return show(li+1);if(e.target.tagName!=="IMG")hide()});
addEventListener("keydown",e=>{if(!lb.classList.contains("on"))return;if(e.key==="Escape")hide();if(e.key==="ArrowLeft")show(li-1);if(e.key==="ArrowRight")show(li+1)});

/* ---------- background: drifting particles with links, in the page accent ---------- */
const cv=$("#fx");if(cv&&!RM){const c=cv.getContext("2d");let w,h,P=[];
 const rs=()=>{const d=Math.min(devicePixelRatio,2);w=innerWidth;h=innerHeight;cv.width=w*d;cv.height=h*d;c.setTransform(d,0,0,d,0,0);
  P=Array.from({length:Math.min(90,Math.round(w*h/16000))},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3}))};
 rs();addEventListener("resize",rs);let mx=-999,my=-999;addEventListener("pointermove",e=>{mx=e.clientX;my=e.clientY});
 (function f(){requestAnimationFrame(f);if(document.hidden)return;c.clearRect(0,0,w,h);
  for(const p of P){const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);if(d<120){p.vx+=dx/d*.05;p.vy+=dy/d*.05}p.vx*=.985;p.vy*=.985;
   if(Math.hypot(p.vx,p.vy)<.12){p.vx+=(Math.random()-.5)*.05;p.vy+=(Math.random()-.5)*.05}p.x=(p.x+p.vx+w)%w;p.y=(p.y+p.vy+h)%h}
  for(let i=0;i<P.length;i++){const a=P[i];c.fillStyle=`rgba(${AC},.5)`;c.fillRect(a.x-1,a.y-1,2,2);
   for(let j=i+1;j<P.length;j++){const b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<110){c.strokeStyle=`rgba(${AC},${.13*(1-d/110)})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()}}}})()}
})();
