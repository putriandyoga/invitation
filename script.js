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
  couplePortraitSrc: "gallery/our-akad.webp", // your own illustration/photo for the cover, e.g. "img/couple.png"
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

  // Berikan pengecekan elemen (?) agar tidak error jika elemen belum siap/ada
  if (cdEls.d) setNum(cdEls.d, Math.floor(left / 86400));
  if (cdEls.h) setNum(cdEls.h, Math.floor((left % 86400) / 3600));
  if (cdEls.m) setNum(cdEls.m, Math.floor((left % 3600) / 60));
  if (cdEls.s) setNum(cdEls.s, left % 60);

  const msgEl = $("#cdMsg");
  if (msgEl) {
    msgEl.textContent =
      left > 0
        ? "every little moment brings us closer"
        : "today is the day. We said I do!";
  }
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
/* =====================================================================
   RSVP & GUEST BOOK SCRIPT (ENGLISH)
   ================================================================     */

let guests = 1;
const gCount = $("#gCount");
if ($("#gMinus")) {
  $("#gMinus").onclick = () => {
    guests = Math.max(1, guests - 1);
    gCount.textContent = guests;
  };
}
if ($("#gPlus")) {
  $("#gPlus").onclick = () => {
    guests = Math.min(10, guests + 1);
    gCount.textContent = guests;
  };
}

const form = $("#rsvpForm"),
  status = $("#status");

if (CONFIG.rsvpEndpoint && $("#devNote")) $("#devNote").remove();
if (CONFIG.whatsapp && $("#waBtn")) $("#waBtn").hidden = false;

function readForm() {
  const nameField = $("#gName"),
    att = form.querySelector("input[name=attendance]:checked"),
    wishesField = $("#gWish");

  const name = nameField ? nameField.value.trim() : "";
  const wishes = wishesField ? wishesField.value.trim() : "";

  if (!name) {
    status.className = "error"; // Beri kelas error agar stylenya ikut cantik
    status.textContent = "Please provide your guest name.";
    if (nameField) nameField.focus();
    return null;
  }
  if (!att) {
    status.className = "error"; // Beri kelas error agar stylenya ikut cantik
    status.textContent =
      "Please choose Joyfully Accept or Regretfully Decline.";
    return null;
  }
  if (!wishes) {
    status.className = "error"; // Beri kelas error agar stylenya ikut cantik
    status.textContent = "Please leave your sweet wishes for us.";
    if (wishesField) wishesField.focus();
    return null;
  }

  return {
    name,
    attendance: att.value,
    guests: att.value === "Joyfully Accept" ? guests : 0,
    wishes: wishes,
  };
}

// --- FITUR DINAMIS: Sembunyikan jumlah tamu jika memilih Decline ---
const attendanceRadios = document.querySelectorAll('input[name="attendance"]');
const guestWrapper = document.getElementById("guestFieldWrapper");

attendanceRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "Regretfully Decline") {
      // Sembunyikan field jumlah tamu dan set nilainya jadi 0 di memori logika
      guestWrapper.style.display = "none";
      guests = 0;
      if ($("#gCount")) $("#gCount").textContent = 0;
    } else {
      // Munculkan kembali jika memilih Accept
      guestWrapper.style.display = "block";
      guests = 1;
      if ($("#gCount")) $("#gCount").textContent = 1;
    }
  });
});

// Event listener saat form dikirim
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = readForm();
  if (!data) return;

  if (!CONFIG.rsvpEndpoint) {
    status.className = "warn";
    status.textContent =
      "This form is not connected to a backend yet, so your reply was NOT saved.";
    return;
  }

  status.className = "";
  status.textContent = "Sending...";

  try {
    await fetch(CONFIG.rsvpEndpoint, {
      method: "POST",
      mode: "no-cors",
      body: new URLSearchParams(data),
    });

    status.className = "success";
    status.textContent = "Thank you! Your reply has been sent.";

    // 1. Amankan nama dari URL, lalu reset form
    const currentName = $("#gName").value;
    form.reset();
    $("#gName").value = currentName;

    // Reset stepper kembali ke angka 1
    guests = 1;
    gCount.textContent = 1;

    // 2. SOLUSI: Langsung muat ulang daftar ucapan dari Google Sheet secara otomatis!
    // Ini membuat list-nya terupdate real-time tanpa perlu refresh halaman atau kehilangan list lama.
    await loadRsvpEntries();
  } catch (err) {
    status.className = "error";
    status.textContent =
      "Something went wrong while sending. Please check your connection and try again.";
  }
});

if ($("#waBtn")) {
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
}

// Fungsi pembantu untuk langsung menampilkan kartu ucapan baru secara instan di atas/bawah list
function appendNewEntryToDOM(data) {
  const container = document.getElementById("rsvpEntries");
  if (!container) return;

  // Jika sebelumnya ada teks "Loading..." atau "No RSVPs...", hapus dulu
  const placeholderText = container.querySelector("p");
  if (placeholderText) {
    container.innerHTML = "";
  }

  const card = document.createElement("div");
  card.className = "rsvp-card";
  card.style.animation = "fadeIn 0.5s ease-out"; // Efek animasi muncul

  const isAccept = data.attendance === "Joyfully Accept";
  const badgeClass = isAccept ? "badge-accept" : "badge-decline";
  const badgeText = isAccept ? "Attending" : "Declined";

  card.innerHTML = `
    <div class="rsvp-card-header">
      <span class="rsvp-card-name">${escapeHtml(data.name)}</span>
      <span class="rsvp-card-badge ${badgeClass}">${badgeText}</span>
    </div>
    ${data.wishes ? `<p class="rsvp-card-wish">"${escapeHtml(data.wishes)}"</p>` : ""}
  `;

  // Masukkan ke urutan paling atas dari daftar ucapan
  container.prepend(card);
}

/* =====================================================================
   INTRO SEQUENCE
   ================================================================     */
const intro = $("#intro");
requestAnimationFrame(() =>
  setTimeout(() => {
    intro.classList.add("ready");
    $("#introTitle").classList.add("in");
  }, 300),
);

$("#openBtn").addEventListener("click", async function () {
  this.disabled = true;
  intro.classList.add("opening"); // flap swings open
  await wait(450);
  intro.classList.add("flap-back");
  await wait(350);
  intro.classList.add("rise"); // couple pops out

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
      button.style.background = "#d4edda";
      button.style.borderColor = "#c3e6cb";

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = "";
        button.style.borderColor = "";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}

// Fungsi pengaman kecil untuk mencegah karakter HTML asing
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* =====================================================================
   LOAD RSVP ENTRIES & LOCKED URL NAME ON STARTUP
   ================================================================     */
async function loadRsvpEntries() {
  const container = document.getElementById("rsvpEntries");
  if (!CONFIG.rsvpEndpoint || !container) return;

  try {
    const response = await fetch(CONFIG.rsvpEndpoint);
    const result = await response.json();

    if (result && result.length > 0) {
      container.innerHTML = "";
      // Urutkan dari yang terbaru dan ambil maksimal 30 data teratas
      result
        .reverse()
        .slice(0, 30)
        .forEach((item) => {
          if (!item.name) return; // Lewatkan jika data kosong

          const card = document.createElement("div");
          card.className = "rsvp-card";

          const isAccept = item.attendance === "Joyfully Accept";
          const badgeClass = isAccept ? "badge-accept" : "badge-decline";
          const badgeText = isAccept ? "Attending" : "Declined";

          card.innerHTML = `
          <div class="rsvp-card-header">
            <span class="rsvp-card-name">${escapeHtml(item.name)}</span>
            <span class="rsvp-card-badge ${badgeClass}">${badgeText}</span>
          </div>
          ${item.wishes ? `<p class="rsvp-card-wish">"${escapeHtml(item.wishes)}"</p>` : ""}
        `;
          container.appendChild(card);
        });
    } else {
      container.innerHTML =
        "<p style='text-align: center; color: var(--text-light); font-style: italic;'>No RSVPs or wishes yet. Be the first!</p>";
    }
  } catch (err) {
    console.error("Failed to load RSVP entries:", err);
    container.innerHTML =
      "<p style='text-align: center; color: var(--text-light); font-style: italic;'>Failed to load wishes.</p>";
  }
}

// Gabungkan penangkapan URL & pemuatan data saat halaman dimuat
// document.addEventListener("DOMContentLoaded", () => {
//   // 1. Menangkap nama tamu dari URL (contoh: ?to=Dinda+dan+Partner)
//   const urlParams = new URLSearchParams(window.location.search);
//   let guestParam = urlParams.get("to");

//   if (!guestParam) {
//     const queryString = window.location.search.substring(1);
//     if (queryString) {
//       guestParam = decodeURIComponent(queryString.replace(/\+/g, " "));
//     }
//   } else {
//     guestParam = guestParam.replace(/\+/g, " ");
//   }

//   const gNameInput = document.getElementById("gName");
//   const guestElement = document.getElementById("guestName");

//   if (guestParam) {
//     if (guestElement) guestElement.textContent = guestParam;
//     if (gNameInput) gNameInput.value = guestParam;
//   } else {
//     if (gNameInput) {
//       gNameInput.value = "Our Beloved Guest";
//       gNameInput.removeAttribute("readonly");
//     }
//   }

//   // 2. Memuat daftar ucapan dari Google Sheet
//   loadRsvpEntries();
// });
// Gabungkan penangkapan URL, validasi anti-forward, & pemuatan data saat halaman dimuat
// Gabungkan penangkapan URL, validasi keamanan ketat & anti-forward, serta pemuatan data
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  let guestParam = urlParams.get("to");

  if (!guestParam) {
    const queryString = window.location.search.substring(1);
    if (queryString) {
      guestParam = decodeURIComponent(queryString.replace(/\+/g, " "));
    }
  } else {
    guestParam = guestParam.replace(/\+/g, " ");
  }

  const gNameInput = document.getElementById("gName");
  const guestElement = document.getElementById("guestName");

  const REQUIRE_GUEST_NAME = true;

  if (REQUIRE_GUEST_NAME && !guestParam) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 1.25rem; background: var(--cream);">
            <div class="card" style="text-align: center; width: 100%;">
                <div style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--burg);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:100%; height:100%;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h2 class="script" style="color: var(--burg); margin-bottom: 1rem; font-size: 2.2rem;">Tautan Tidak Valid</h2>
                <p style="color: var(--text); font-size: 1.05rem; line-height: 1.6;">
                    Maaf, tautan undangan yang Anda akses tidak lengkap atau tidak memiliki identitas tamu. Silakan gunakan tautan resmi yang dikirimkan kepada Anda.
                </p>
            </div>
        </div>
    `;
    return;
  }

  if (guestParam) {
    if (guestElement) guestElement.textContent = guestParam;
    if (gNameInput) gNameInput.value = guestParam;
  } else {
    if (gNameInput) {
      gNameInput.value = "Valued Guest";
      gNameInput.removeAttribute("readonly");
    }
  }

  if (guestParam && CONFIG.rsvpEndpoint) {
    let deviceId = localStorage.getItem("invitation_device_id");
    if (!deviceId) {
      deviceId =
        "dev_" + Math.random().toString(36).substring(2, 9) + Date.now();
      localStorage.setItem("invitation_device_id", deviceId);
    }

    try {
      const response = await fetch(
        `${CONFIG.rsvpEndpoint}?to=${encodeURIComponent(guestParam)}&device_id=${deviceId}`,
      );
      const result = await response.json();

      if (result.access === "denied") {
        let errorTitle = "Akses Undangan Terbatas";
        let errorMsg = `Maaf, tautan undangan atas nama <strong>${escapeHtml(guestParam)}</strong> ini sudah dibuka dan terkunci di perangkat lain. Setiap undangan personal hanya dapat diakses dari satu perangkat.`;

        if (result.reason === "unregistered") {
          errorTitle = "Tamu Tidak Terdaftar";
          errorMsg = `Maaf, nama <strong>${escapeHtml(guestParam)}</strong> tidak terdaftar di dalam daftar tamu undangan kami.`;
        }

        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; padding: 1.25rem; background: var(--cream);">
                <div class="card" style="text-align: center; width: 100%;">
                    <div style="width: 48px; height: 48px; margin: 0 auto 1rem; color: var(--burg);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:100%; height:100%;">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 class="script" style="color: var(--burg); margin-bottom: 1rem; font-size: 2.2rem;">${errorTitle}</h2>
                    <p style="color: var(--text); font-size: 1.05rem; line-height: 1.6;">
                        ${errorMsg}
                    </p>
                </div>
            </div>
        `;
        return;
      }
    } catch (err) {
      console.warn("Gagal memvalidasi perangkat:", err);
    }
  }

  loadRsvpEntries();
});
