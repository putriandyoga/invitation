/* =====================================================================
   CONFIG — edit everything about your wedding here
   ===================================================================== */
const CONFIG = {
  bride: "Putri",
  groom: "Yoga",
  brideFull: "Putri Nabella",
  groomFull: "Muhammad Yoga Adha Pratama",
  brideParents: "Putri Sulung dari Bapak Samsi dan Ibu Rusinah",
  groomParents: "Putra Bungsu dari Bapak Priyo Gunawan dan Ibu Nani Elliawati",

  date: "2027-01-17", // YYYY-MM-DD
  time: "08:00", // ceremony start, 24h, used for the countdown
  tz: "+08:00", // timezone offset of the venue, e.g. "+07:00", "-05:00", "Z"
  ceremonyTime: "06:00 AM", // shown on the card
  receptionTime: "08:00 AM",
  rsvpBy: "1 Desember 2026",

  venue: "Kediaman Mempelai Wanita",
  address: "Pondok Rumbia Mas No.2, Jl. Pemanjatan",
  mapQuery: "Komplek Rumbian Mas 2", // optional: exact text to search on Google Maps (defaults to venue + address)
  mapLink: "https://maps.app.goo.gl/AVx4ErswcTkPjEbaA", // optional: paste a Google Maps share link to use for the button
  musicSrc: "music/goddess.mp3", // your own licensed audio file, e.g. "music/our-song.mp3"
  // couplePortraitSrc: "picture/ilustration.png", // your own illustration/photo for the cover, e.g. "img/couple.png"
  couplePortraitSrc: "gallery/our-akad.png", // your own illustration/photo for the cover, e.g. "img/couple.png"
  groomGlasses: false, // quick character tweak for the drawn groom

  rsvpEndpoint:
    "https://script.google.com/macros/s/AKfycbwBrpEi49tOqIv7X3Tpyd2b_ZSM8LL9eQIPBppsdjWXsMDUdLBhTU2eju2DyvVtxTvehw/exec", // Google Apps Script Web App URL (see setup notes in the RSVP section)
  whatsapp: "6281522792976", // optional, digits with country code, e.g. "6281234567890"
};

/* =====================================================================
   HELPERS
   ===================================================================== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) =>
  new Promise((r) => setTimeout(r, RM ? Math.min(ms, 60) : ms));
const NS = "http://www.w3.org/2000/svg";
const icon = (id, cls = "") => {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  if (cls) s.setAttribute("class", cls);
  const u = document.createElementNS(NS, "use");
  u.setAttribute("href", "#" + id);
  s.appendChild(u);
  return s;
};
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("show"), 3200);
}

/* =====================================================================
   FILL TEXT FROM CONFIG
   ===================================================================== */
const dateObj = new Date(CONFIG.date + "T00:00:00Z");
const V = Object.assign({}, CONFIG, {
  dateLong: dateObj.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }),
  weekday: dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }),
});
V.weekdayCaps = V.weekday.toUpperCase();
V.dateFull = V.weekday + ", " + V.dateLong;
$$("[data-cfg]").forEach((el) => {
  el.textContent = V[el.dataset.cfg] ?? "";
});
document.title = `${CONFIG.bride} & ${CONFIG.groom} Wedding \u2665`;
if (CONFIG.groomGlasses) $$(".glasses").forEach((g) => (g.style.display = ""));

/* optional replacement of the drawn portrait with your own image */
if (CONFIG.couplePortraitSrc) {
  const img = new Image();
  img.src = CONFIG.couplePortraitSrc;
  img.alt = `${CONFIG.bride} and ${CONFIG.groom}`;
  $("#portrait").replaceChildren(img);
}

/* =====================================================================
   WORD-BY-WORD TEXT
   ===================================================================== */
function splitWords(el) {
  const text = (el.dataset.words || el.textContent).trim();
  el.setAttribute("aria-label", text);
  el.textContent = "";
  text.split(/\s+/).forEach((word, i, arr) => {
    const s = document.createElement("span");
    s.className = "w";
    s.style.setProperty("--i", i);
    s.setAttribute("aria-hidden", "true");
    s.textContent = word;
    if (el.dataset.base) s.style.setProperty("--base", el.dataset.base);
    el.appendChild(s);
    if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
  });
}
$$(".rv-words, #introTitle").forEach(splitWords);
$$("#closeH").forEach((el) => {
  if (!el.querySelector(".w")) splitWords(el);
});

/* =====================================================================
   POLAROIDS (story + gallery) — shows a pastel placeholder until data-src is set
   ===================================================================== */
const PH_COLORS = ["var(--lav)", "var(--blush)", "var(--butter)"];
const PH_ICONS = ["i-heart", "i-sparkle", "i-heart"];
function buildPolaroid(el, i) {
  const media = document.createElement("div");
  media.className = "media";
  if (el.dataset.src) {
    const img = new Image();
    img.src = el.dataset.src;
    img.alt = el.dataset.cap;
    img.loading = "lazy";
    media.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "ph";
    ph.style.setProperty("--ph", PH_COLORS[i % 3]);
    ph.appendChild(icon(PH_ICONS[i % 3]));
    const t = document.createElement("span");
    t.textContent = "your photo here";
    ph.appendChild(t);
    media.appendChild(ph);
    media.setAttribute("role", "img");
    media.setAttribute("aria-label", "Photo placeholder: " + el.dataset.cap);
  }
  const cap = document.createElement(
    el.tagName === "FIGURE" ? "figcaption" : "span",
  );
  if (cap.tagName === "SPAN") cap.className = "cap";
  cap.textContent = el.dataset.cap;
  el.append(media, cap);
}
$$(".polaroid").forEach(buildPolaroid);

/* =====================================================================
   FLOATING HEARTS (light: a handful, CSS-only motion)
   ===================================================================== */
(function hearts() {
  if (RM) return;
  const layer = $("#hearts"),
    colors = ["#DDA6AD", "#F3D5D8", "#E8DFF0", "#E7CF7A", "#DDA6AD"];
  const n = innerWidth < 600 ? 7 : 12;
  for (let i = 0; i < n; i++) {
    const h = icon(i % 4 === 3 ? "i-sparkle" : "i-heart", "fl");
    h.style.cssText = `--x:${Math.random() * 96}%;--s:${12 + Math.random() * 14}px;--c:${colors[i % colors.length]};--d:${18 + Math.random() * 14}s;--dl:-${Math.random() * 30}s`;
    layer.appendChild(h);
  }
})();

/* =====================================================================
   SCROLL REVEALS, PARALLAX, COUNTDOWN, LIGHTBOX, MUSIC, RSVP — started after the intro
   ===================================================================== */
function startSite() {
  /* scroll-triggered reveals */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add("in");
        io.unobserve(el);
        if (el.classList.contains("pop")) {
          const sib = $$(".pop", el.parentElement).indexOf(el);
          el.style.transitionDelay = `${(sib % 3) * 0.12}s`;
          setTimeout(() => (el.style.transitionDelay = ""), 1400);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -6% 0px" },
  );
  $$(".rv-words, .rv, .pop, .scribble").forEach((el) => io.observe(el));
  RM &&
    $$(".rv-words,.rv,.pop,.scribble").forEach((el) => el.classList.add("in"));

  /* gentle parallax (rAF throttled) */
  if (!RM) {
    const items = $$(".plx");
    let ticking = false;
    const update = () => {
      const vh = innerHeight;
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const c = r.top + r.height / 2 - vh / 2;
        el.style.setProperty(
          "--py",
          (-c * parseFloat(el.dataset.speed || 0.04)).toFixed(1) + "px",
        );
      });
      ticking = false;
    };
    addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true },
    );
    update();
  }

  /* lazy map */
  const q = encodeURIComponent(
    CONFIG.mapQuery || `${CONFIG.venue} ${CONFIG.address}`,
  );
  $("#mapBtn").href =
    CONFIG.mapLink || `https://www.google.com/maps/search/?api=1&query=${q}`;
  new IntersectionObserver(
    (es, o) => {
      if (es[0].isIntersecting) {
        $("#mapFrame").src = `https://www.google.com/maps?q=${q}&output=embed`;
        o.disconnect();
      }
    },
    { rootMargin: "400px" },
  ).observe($("#location"));

  /* closing "fade-out": after the ending has been in view for a while, the scene softly fades */
  let finTimer;
  const closing = $("#closing");
  new IntersectionObserver(
    (es) => {
      clearTimeout(finTimer);
      if (es[0].isIntersecting)
        finTimer = setTimeout(
          () => closing.classList.add("fin"),
          RM ? 0 : 7000,
        );
      else closing.classList.remove("fin");
    },
    { threshold: 0.6 },
  ).observe(closing);
  $("#replayBtn").addEventListener("click", () =>
    scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }),
  );
}

/* ---- countdown ---- */
const target = new Date(`${CONFIG.date}T${CONFIG.time}:00${CONFIG.tz}`);
const cdEls = {
  d: $("#cd-d"),
  h: $("#cd-h"),
  m: $("#cd-m"),
  s: $("#cd-s"),
};
function setNum(el, val) {
  const t = String(val);
  if (el.textContent !== t) {
    el.textContent = t;
    if (!RM) {
      el.classList.remove("tick");
      void el.offsetWidth;
      el.classList.add("tick");
    }
  }
}
function updateCountdown() {
  const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
  setNum(cdEls.d, Math.floor(left / 86400));
  setNum(cdEls.h, Math.floor((left % 86400) / 3600));
  setNum(cdEls.m, Math.floor((left % 3600) / 60));
  setNum(cdEls.s, left % 60);
  $("#cdMsg").textContent =
    left > 0
      ? "every little moment brings us closer"
      : "today is the day. We said I do!";
}
updateCountdown();
setInterval(updateCountdown, 1000);

/* ---- lightbox ---- */
const lb = $("#lightbox"),
  gallery = $$("#grid .polaroid");
let lbIndex = 0,
  lbOpener = null;
function showPhoto(i) {
  lbIndex = (i + gallery.length) % gallery.length;
  const src = gallery[lbIndex],
    media = $("#lbMedia");
  media.style.opacity = 0;
  setTimeout(
    () => {
      media.replaceChildren($(".media", src).firstElementChild.cloneNode(true));
      $("#lbCap").textContent = src.dataset.cap;
      media.style.opacity = 1;
    },
    RM ? 0 : 180,
  );
}
function openLb(i) {
  lbOpener = document.activeElement;
  showPhoto(i);
  lb.classList.add("open");
  $(".lb-close").focus();
}
function closeLb() {
  lb.classList.remove("open");
  lbOpener && lbOpener.focus();
}
gallery.forEach((b, i) => b.addEventListener("click", () => openLb(i)));
$(".lb-close").onclick = closeLb;
$(".lb-prev").onclick = () => showPhoto(lbIndex - 1);
$(".lb-next").onclick = () => showPhoto(lbIndex + 1);
lb.addEventListener("click", (e) => {
  if (e.target === lb) closeLb();
});
addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") showPhoto(lbIndex - 1);
  if (e.key === "ArrowRight") showPhoto(lbIndex + 1);
});
let tx = 0;
lb.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), {
  passive: true,
});
lb.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
});

/* ---- music (autoplays when invitation is opened) ---- */
const bgm = $("#bgm"),
  mbtn = $("#music");

async function playMusic() {
  if (!CONFIG.musicSrc) return;
  if (!bgm.src) bgm.src = CONFIG.musicSrc;
  try {
    await bgm.play();
    mbtn.classList.add("playing");
    mbtn.setAttribute("aria-pressed", "true");
    mbtn.setAttribute("aria-label", "Pause background music");
  } catch {
    console.log("Autoplay ditolak oleh browser, menunggu interaksi pengguna.");
  }
}

mbtn.addEventListener("click", async () => {
  if (!CONFIG.musicSrc) {
    toast("No music yet. Add your audio file to CONFIG.musicSrc.");
    return;
  }
  if (!bgm.src) bgm.src = CONFIG.musicSrc;
  if (bgm.paused) {
    try {
      await bgm.play();
      mbtn.classList.add("playing");
      mbtn.setAttribute("aria-pressed", "true");
      mbtn.setAttribute("aria-label", "Pause background music");
    } catch {
      toast("Could not play the music file. Check the file path.");
    }
  } else {
    bgm.pause();
    mbtn.classList.remove("playing");
    mbtn.setAttribute("aria-pressed", "false");
    mbtn.setAttribute("aria-label", "Play background music");
  }
});

/* ---- RSVP ---- */
let guests = 1;
const gCount = $("#gCount");
$("#gMinus").onclick = () => {
  guests = Math.max(1, guests - 1);
  gCount.textContent = guests;
};
$("#gPlus").onclick = () => {
  guests = Math.min(10, guests + 1);
  gCount.textContent = guests;
};
const form = $("#rsvpForm"),
  status = $("#status");
if (CONFIG.rsvpEndpoint) $("#devNote").remove();
if (CONFIG.whatsapp) $("#waBtn").hidden = false;
function readForm() {
  const name = $("#gName").value.trim(),
    att = form.querySelector("input[name=attendance]:checked");
  if (!name) {
    status.className = "";
    status.textContent = "Please tell us your name.";
    $("#gName").focus();
    return null;
  }
  if (!att) {
    status.className = "";
    status.textContent =
      "Please choose Joyfully Accept or Regretfully Decline.";
    return null;
  }
  return {
    name,
    attendance: att.value,
    guests: att.value === "Joyfully Accept" ? guests : 0,
    wishes: $("#gWish").value.trim(),
  };
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = readForm();
  if (!data) return;
  if (!CONFIG.rsvpEndpoint) {
    status.className = "warn";
    status.textContent =
      "This form is not connected to a backend yet, so your reply was NOT saved. Please contact the couple directly for now.";
    return;
  }
  status.className = "";
  status.textContent = "Sending...";
  try {
    // Apps Script web apps do not return CORS headers, so "no-cors" is used and the response cannot be read.
    await fetch(CONFIG.rsvpEndpoint, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(data),
    });
    status.textContent = "Thank you! Your reply has been sent.";
    form.reset();
    guests = 1;
    gCount.textContent = 1;
  } catch {
    status.textContent =
      "Something went wrong while sending. Please check your connection and try again.";
  }
});
$("#waBtn").addEventListener("click", () => {
  const d = readForm();
  if (!d) return;
  const msg = `Hello! RSVP for ${CONFIG.bride} & ${CONFIG.groom}'s wedding.\nName: ${d.name}\nReply: ${d.attendance}\nGuests: ${d.guests}${d.wishes ? "\nWishes: " + d.wishes : ""}`;
  open(
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener",
  );
});

/* =====================================================================
   INTRO SEQUENCE: words appear -> button -> envelope opens -> couple hops up -> iris reveals the site
   ===================================================================== */
const intro = $("#intro");
requestAnimationFrame(() =>
  setTimeout(() => {
    intro.classList.add("ready");
    $("#introTitle").classList.add("in");
  }, 300),
);
// $("#openBtn").addEventListener("click", async function () {
//   this.disabled = true;
//   intro.classList.add("opening"); // flap swings open
//   await wait(450);
//   intro.classList.add("flap-back");
//   await wait(350);
//   intro.classList.add("rise"); // couple pops out
//   const stage = $("#stage");
//   if (!RM)
//     for (let i = 0; i < 9; i++) {
//       const h = icon("i-heart", "burst");
//       const a = (i / 9) * Math.PI * 2,
//         r = 90 + Math.random() * 70;
//       h.style.setProperty("--dx", Math.cos(a) * r + "px");
//       h.style.setProperty("--dy", Math.sin(a) * r - 40 + "px");
//       stage.appendChild(h);
//     }
//   await wait(1500);
//   intro.classList.add("leaving"); // iris closes on the heart
//   document.body.classList.remove("locked");
//   scrollTo(0, 0);
//   playMusic();
//   startSite();
//   await wait(1500);
//   intro.style.display = "none";
//   mbtn.classList.add("show");
// });

$("#openBtn").addEventListener("click", async function () {
  this.disabled = true;
  intro.classList.add("opening"); // flap swings open
  await wait(450);
  intro.classList.add("flap-back");
  await wait(350);
  intro.classList.add("rise"); // couple pops out

  // Efek burst love-love sudah dihapus bersih dari sini

  await wait(1500);
  intro.classList.add("leaving"); // iris closes
  document.body.classList.remove("locked");
  scrollTo(0, 0);
  playMusic();
  startSite();
  await wait(1500);
  intro.style.display = "none";
  mbtn.classList.add("show");
});

function copyToClipboard(button) {
  const textToCopy = button.getAttribute("data-clipboard");

  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      const originalText = button.textContent;
      button.textContent = "Copied!";
      button.style.background = "#d4edda"; // Warna hijau lembut penanda sukses
      button.style.borderColor = "#c3e6cb";

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = "";
        button.style.borderColor = "";
      }, 2000); // Tombol akan kembali normal setelah 2 detik
    })
    .catch((err) => {
      console.error("Gagal menyalin teks: ", err);
    });
}
// Menangkap nama tamu dari URL (contoh: ?to=Putri+dan+Partner)
const urlParams = new URLSearchParams(window.location.search);
const guestParam = urlParams.get("to");

if (guestParam) {
  const decodedName = guestParam.replace(/\+/g, " ");
  const guestElement = document.getElementById("guestName");
  if (guestElement) {
    guestElement.textContent = decodedName;
  }
}
