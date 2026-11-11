/* =====================================================================
   ★ EASY EDIT AREA — change everything about YOUR wedding right here ★
   =====================================================================

   HOW TO CONNECT THE RSVP FORM TO GOOGLE SHEETS (Google Apps Script)
   -------------------------------------------------------------------
   The RSVP form in this page is a FRONTEND PLACEHOLDER. Until you do the
   steps below, nothing is saved anywhere (the page says so openly).

   1. Create a Google Sheet. In row 1 add the headers:
        Timestamp | Name | Attendance | Guests | Wishes
   2. In the Sheet: Extensions → Apps Script. Replace the code with:

        function doPost(e) {
          var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
          var d = JSON.parse(e.postData.contents);
          sheet.appendRow([d.timestamp, d.name, d.attendance, d.guests, d.wishes]);
          return ContentService.createTextOutput(JSON.stringify({ ok: true }))
                 .setMimeType(ContentService.MimeType.JSON);
        }

   3. Deploy → New deployment → type "Web app".
        Execute as: Me      Who has access: Anyone
      Authorise when asked, then copy the "Web app URL".
   4. Paste that URL into CONFIG.rsvp.endpoint below. Done!
   5. Test it yourself and check that a new row appears in the Sheet.

   Notes: the browser sends the request in "no-cors" mode (required for Apps
   Script), so the page cannot read the reply. It treats the RSVP as sent when
   the network request succeeds. Always double-check your Sheet.
   Any other backend (Formspree, Supabase, your own server…) also works: just
   adapt the fetch() call inside sendRSVP().
   ===================================================================== */
const CONFIG = {
  /* --- Names (short = big title, full = invitation card) --- */
  bride: { short: "PUTRI", full: "Putri Nabella" },
  groom: { short: "YOGA", full: "Muhammad Yoga Adha Pratama" },
  brideParents: "Putri Sulung dari Bapak Samsi dan Ibu Rusinah",
  groomParents: "Putra Bungsu dari Bapak Priyo Gunawan dan Ibu Nani Elliawati",
  /* --- Date & time ---
  weddingDate: ISO format WITH the timezone offset (+08:00 = WITA, Central Indonesia).
  Used for the countdown and for the date shown on the card.
  timeZone: the IANA zone of the venue, so every guest sees the same calendar date. */
  weddingDate: "2027-01-17T10:00:00+08:00", // ← PLACEHOLDER DATE, replace it
  timeZone: "Asia/Makassar",
  ceremonyTime: "07:00 AM", // shown on the card
  receptionTime: "08:00 AM",

  /* --- Venue --- */
  venue: {
    name: "Kediaman Keluarga Mempelai Wanita",
    address: "Jl. A. Yani KM.14.400, Gang 99",
    mapsLink: "https://maps.app.goo.gl/ThpTaCDKbWuzcJEy5", // paste a Google Maps share/directions link; leave "" to auto-search by address
    embedMap: true, // true = show a live Google Map instead of the drawn map (needs a real address)
  },

  /* --- Love story (4 chapters). photo: "" shows a placeholder; or paste a URL / "images/us1.jpg" --- */

  story: [
    {
      title: "First Meeting",
      date: "December 27, 2020",
      text: "New to college and completely lost, I called out to him simply because he happened to walk past. Looking super confused, he stopped a few feet away, and then completely walked away the moment I tried to walk over. I was left standing halfway there and honestly pretty annoyed! We actually recreated this exact photo two years later wearing the same outfits.",
      shortText:
        "Completely lost in college, I just called out because he happened to walk past, and he actually walked away! We recreated this photo two years later.",
      caption: "awkward first encounter",
      photo: "gallery/our-first-meet.webp",
    },
    {
      title: "First Date",
      date: "February 20, 2022",
      text: "It was my birthday, just 15 days after we started dating, and we grabbed a quick bite at the mall. We were running out of time and still had a massive pile of fries left, so I kept feeding them to him as fast as I could so we could finally head home.",
      shortText:
        "On my birthday just 15 days after we started dating, we had to rush through a giant mountain of fries at the mall.",
      caption: "rushing through fries",
      photo: "gallery/our-date.webp",
    },
    {
      title: "Graduation Day",
      date: "July 3, 2024",
      text: "After dealing with so much drama and a bunch of hurdles along the way, we finally made it and graduated together on the exact same day, just like we always dreamed we would.",
      shortText:
        "After getting through plenty of hurdles together, we finally managed to graduate side by side on the very same day.",
      caption: "graduating together",
      photo: "gallery/our-graduation.webp",
    },
    {
      title: "Our Love Story",
      date: "2022 and always",
      text: "We knew we were serious about each other right from day one. Ever since we started dating in 2022, we have been building our future together step by step. Now, as we step into 2027, we are ready to take that next big step and look forward to waking up side by side for the rest of our lives.",
      shortText:
        "Serious right from day one back in 2022, we are so ready to take our next big step together.",
      caption: "forever and always",
      photo: "gallery/blue-bg.webp",
    },
  ],
  /* --- Gallery: replace each src with your own image URL (leave "" to keep the placeholder) --- */
  gallery: [
    { src: "", caption: "golden hour" },
    { src: "", caption: "our little moments" },
    { src: "", caption: "sunshine & you" },
    { src: "", caption: "sweet summer" },
    { src: "", caption: "laughing together" },
    { src: "", caption: "coffee dates" },
    { src: "", caption: "the way you look at me" },
    { src: "", caption: "forever starts here" },
  ],

  /* --- Music: use YOUR OWN licensed/royalty-free audio file. --- */
  audio: { src: "music/still-into-you.mp3", title: "[SONG TITLE]" },

  /* --- RSVP --- */
  rsvp: {
    endpoint:
      "https://script.google.com/macros/s/AKfycbzMm6EN-FWbxHegq1m6-fQuUTno916eE_p249gBz5n509LiUFREDuvCHovml9AF4s5s/exec",
    maxGuests: 10,
  },
};

/* =====================================================================
Code below: you normally don't need to edit it.
===================================================================== */
(function () {
  ("use strict");

  /* ---------- tiny helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const rand = (a, b) => a + Math.random() * (b - a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.matchMedia("(max-width: 640px)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- 1. Draw the flower symbols ---------- */
  function buildSymbols() {
    const mk = (tag, attrs, parent) => {
      const el = document.createElementNS(SVGNS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      parent.appendChild(el);
      return el;
    };
    // Sunflower: two rings of petals + seeded centre
    const sf = $("#sf");
    if (!sf) return;
    const back = mk("g", { fill: "#D9A441" }, sf);
    const front = mk("g", { fill: "#F6C945" }, sf);
    for (let i = 0; i < 14; i++)
      mk(
        "ellipse",
        {
          cx: 0,
          cy: -33,
          rx: 8.2,
          ry: 17,
          transform: `rotate(${(i * 360) / 14})`,
        },
        back,
      );
    for (let i = 0; i < 14; i++)
      mk(
        "ellipse",
        {
          cx: 0,
          cy: -31,
          rx: 7.6,
          ry: 15.5,
          transform: `rotate(${((i + 0.5) * 360) / 14})`,
        },
        front,
      );
    for (let i = 0; i < 14; i++)
      mk(
        "path",
        {
          d: "M0 -20V-42",
          stroke: "#D9A441",
          "stroke-width": 0.9,
          opacity: 0.55,
          "stroke-linecap": "round",
          transform: `rotate(${((i + 0.5) * 360) / 14})`,
        },
        sf,
      );
    mk("circle", { r: 18, fill: "#76543A" }, sf);
    mk("circle", { r: 14.5, fill: "#5E4230" }, sf);
    [
      [5, "1.3 3.8"],
      [9, "1.7 4.0"],
      [12.5, "2 4.4"],
    ].forEach(([r, d]) =>
      mk(
        "circle",
        {
          r,
          fill: "none",
          stroke: "#D9A441",
          "stroke-width": 1.6,
          "stroke-linecap": "round",
          "stroke-dasharray": d,
          opacity: 0.9,
        },
        sf,
      ),
    );

    // Daisy
    const dz = $("#dz");
    if (dz) {
      for (let i = 0; i < 10; i++)
        mk(
          "ellipse",
          {
            cx: 0,
            cy: -30,
            rx: 7.2,
            ry: 17,
            fill: "#FFFDF5",
            stroke: "#E8D6A2",
            "stroke-width": 1.2,
            transform: `rotate(${i * 36})`,
          },
          dz,
        );
      mk(
        "circle",
        { r: 12, fill: "#F6C945", stroke: "#D9A441", "stroke-width": 1.5 },
        dz,
      );
      mk("circle", { r: 5, fill: "#D9A441" }, dz);
    }

    // Sun rays
    $$(".sun-rays").forEach((g) => {
      for (let i = 0; i < 16; i++) {
        const a = i * 22.5,
          long = i % 2 === 0;
        mk(
          "line",
          {
            x1: 0,
            y1: -34,
            x2: 0,
            y2: long ? -52 : -46,
            stroke: "#F6C945",
            "stroke-width": 5,
            "stroke-linecap": "round",
            transform: `rotate(${a})`,
          },
          g,
        );
      }
    });
  }

  /* Flower clusters for corners */
  function fillClusters() {
    const html = `
    <span class="c-leaf a"><svg class="ic" style="width:100%;aspect-ratio:40/28"><use href="#leaf"/></svg></span>
    <span class="c-leaf b"><svg class="ic" style="width:100%;aspect-ratio:40/28"><use href="#leaf"/></svg></span>
    <span class="c-leaf c"><svg class="ic" style="width:100%;aspect-ratio:40/28"><use href="#leaf"/></svg></span>
    <svg class="ic c-sf big spin"><use href="#sf"/></svg>
    <svg class="ic c-sf mid spin rev"><use href="#sf"/></svg>
    <svg class="ic c-sf small spin"><use href="#sf"/></svg>
    <svg class="ic c-dz d1 spin rev"><use href="#dz"/></svg>
    <svg class="ic c-dz d2 spin"><use href="#dz"/></svg>`;
    $$("[data-cluster]").forEach((el) => {
      el.innerHTML = html;
      el.setAttribute("aria-hidden", "true");
    });
  }

  /* ---------- 2. Placeholder photo generator ---------- */
  function placeholder(n, label) {
    const pal = [
      ["#FBE8A6", "#F5C6A5"],
      ["#FFF1CC", "#A8B58A"],
      ["#F5C6A5", "#FBE8A6"],
      ["#A8B58A", "#FFF1CC"],
    ];
    const [a, b] = pal[n % 4];
    let petals = "";
    for (let i = 0; i < 12; i++)
      petals += `<ellipse cx='0' cy='-36' rx='11' ry='23' fill='#F6C945' transform='rotate(${i * 30})'/>`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>
    <rect width='400' height='500' fill='url(#g)'/>
    <circle cx='320' cy='90' r='46' fill='#F6C945' opacity='.9'/>
    <path d='M0 360 Q120 300 220 350 T400 330 V500 H0Z' fill='#A8B58A' opacity='.85'/>
    <path d='M0 420 Q140 380 260 420 T400 400 V500 H0Z' fill='#68794D' opacity='.8'/>
    <g transform='translate(200 250)'><path d='M0 30 V150' stroke='#68794D' stroke-width='7'/>${petals}<circle r='22' fill='#76543A'/></g>
    <text x='200' y='462' text-anchor='middle' font-family='Georgia,serif' font-style='italic' font-size='24' fill='#FFF8E7'>${esc(label)}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  /* ---------- 3. Fill text from CONFIG ---------- */
  function dateParts() {
    const d = new Date(CONFIG.weddingDate);
    const f = (opts) =>
      new Intl.DateTimeFormat(
        "en-GB",
        Object.assign({ timeZone: CONFIG.timeZone }, opts),
      ).format(d);
    return {
      dow: f({ weekday: "long" }),
      day: f({ day: "numeric" }),
      month: f({ month: "long" }),
      year: f({ year: "numeric" }),
      valid: !isNaN(d),
    };
  }
  function bindText() {
    $$("[data-bind]").forEach((el) => {
      const val = el.dataset.bind
        .split(".")
        .reduce((o, k) => (o ? o[k] : undefined), CONFIG);
      if (typeof val === "string") el.textContent = val;
    });
    const p = dateParts();
    if (p.valid) {
      const invDow = $("#invDow");
      if (invDow) invDow.textContent = p.dow;
      const invDay = $("#invDay");
      if (invDay) invDay.textContent = p.day;
      const invMonYear = $("#invMonYear");
      if (invMonYear) invMonYear.textContent = `${p.month} ${p.year}`;
      const invShortDate = $("#invShortDate");
      if (invShortDate)
        invShortDate.textContent = `${p.day} ${p.month} ${p.year}`;
      const endDate = $("#endDate");
      if (endDate) endDate.textContent = `${p.day} ${p.month} ${p.year}`;
    }
    // Maps link
    const q = encodeURIComponent(
      `${CONFIG.venue.name} ${CONFIG.venue.address}`,
    );
    const mapBtn = $("#mapBtn");
    if (mapBtn) {
      mapBtn.href =
        CONFIG.venue.mapsLink ||
        `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    if (CONFIG.venue.embedMap) {
      const pcMap = $("#pcMap");
      if (pcMap) {
        pcMap.innerHTML = `<iframe title="Map to the venue" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${q}&output=embed"></iframe>`;
      }
    }
  }

  /* ---------- 4. Story timeline ---------- */
  // function renderStory() {
  //   const timeline = $("#timeline");
  //   if (!timeline) return;
  //   const rots = [-3, 2.5, -2, 3];
  //   timeline.innerHTML = CONFIG.story
  //     .map(
  //       (s, i) => `
  //   <article class="tl-item${i % 2 ? " flip" : ""}">
  //     <div class="badge"><svg class="ic spin"><use href="#sf"/></svg><span>${i + 1}</span></div>
  //     <figure class="polaroid reveal" style="--rot:${rots[i % 4]}deg">
  //       <span class="tape"></span>
  //       <div class="ph"><img src="${esc(s.photo || placeholder(i, "Your photo here"))}" alt="${esc(s.photo ? s.caption : "Placeholder photo: " + s.title)}" loading="lazy"></div>
  //       <figcaption class="cap">${esc(s.caption)}</figcaption>
  //       <svg class="ic stk"><use href="#sf"/></svg>
  //     </figure>
  //     <div class="note reveal">
  //       <div class="note-in">
  //         <svg class="ic mini spin"><use href="#dz"/></svg>
  //         <span class="date">${esc(s.date)}</span>
  //         <h3>${esc(s.title)}</h3>
  //         <p>${esc(s.text)}</p>
  //         <svg class="ic heart"><use href="#heart"/></svg>
  //       </div>
  //     </div>
  //   </article>`,
  //     )
  //     .join("");
  // }
  function renderStory() {
    const timeline = $("#timeline");
    if (!timeline) return;
    const rots = [-3, 2.5, -2, 3];
    timeline.innerHTML = CONFIG.story
      .map(
        (s, i) => `
    <article class="tl-item${i % 2 ? " flip" : ""}">
      <div class="badge"><svg class="ic spin"><use href="#sf"/></svg><span>${i + 1}</span></div>
      <figure class="polaroid reveal" style="--rot:${rots[i % 4]}deg">
        <span class="tape"></span>
        <div class="ph"><img src="${esc(s.photo || placeholder(i, "Your photo here"))}" alt="${esc(s.photo ? s.caption : "Placeholder photo: " + s.title)}" loading="lazy"></div>
        <figcaption class="cap">${esc(s.caption)}</figcaption>
        <svg class="ic stk"><use href="#sf"/></svg>
      </figure>
      <div class="note reveal">
        <div class="note-in">
          <svg class="ic mini spin"><use href="#dz"/></svg>
          <span class="date">${esc(s.date)}</span>
          <h3>${esc(s.title)}</h3>
          <p>
            <span class="text-mobile">${esc(s.shortText)}</span>
            <span class="text-desktop">${esc(s.text)}</span>
          </p>
          <svg class="ic heart"><use href="#heart"/></svg>
        </div>
      </div>
    </article>`,
      )
      .join("");
  }
  /* ---------- 5. Gallery + lightbox ---------- */
  const gallery = CONFIG.gallery.map((g, i) => ({
    src: g.src || placeholder(i + 1, "Your photo here"),
    caption: g.caption,
    real: !!g.src,
  }));
  function renderGallery() {
    const gGrid = $("#gGrid");
    if (!gGrid) return;
    const rots = [-3.5, 2, -1.5, 3, -2.5, 1.5, 3.5, -2];
    gGrid.innerHTML = gallery
      .map(
        (g, i) => `
    <button type="button" class="polaroid g-item reveal" data-i="${i}" style="--rot:${rots[i % rots.length]}deg" aria-label="Open photo ${i + 1}: ${esc(g.caption)}">
      <span class="ph"><img src="${esc(g.src)}" alt="${esc(g.real ? g.caption : "Placeholder photo " + (i + 1))}" loading="lazy"></span>
      <span class="cap">${esc(g.caption)}</span>
      ${i % 3 === 0 ? '<svg class="ic stk"><use href="#sf"/></svg>' : i % 3 === 1 ? '<svg class="ic stk"><use href="#dz"/></svg>' : ""}
    </button>`,
      )
      .join("");
  }
  function setupLightbox() {
    const lb = $("#lightbox"),
      img = $("#lbImg"),
      cap = $("#lbCap"),
      count = $("#lbCount");
    if (!lb || !img) return;
    let idx = 0,
      opener = null;
    const show = (i) => {
      idx = (i + gallery.length) % gallery.length;
      img.src = gallery[idx].src;
      img.alt = gallery[idx].real
        ? gallery[idx].caption
        : "Placeholder photo " + (idx + 1);
      if (cap) cap.textContent = gallery[idx].caption;
      if (count) count.textContent = `${idx + 1} / ${gallery.length}`;
    };
    const open = (i, from) => {
      opener = from;
      show(i);
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      const lbClose = $("#lbClose");
      if (lbClose) lbClose.focus();
    };
    const close = () => {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      if (opener) opener.focus();
    };
    const gGrid = $("#gGrid");
    if (gGrid) {
      gGrid.addEventListener("click", (e) => {
        const b = e.target.closest(".g-item");
        if (b) open(+b.dataset.i, b);
      });
    }
    const lbClose = $("#lbClose");
    if (lbClose) lbClose.addEventListener("click", close);
    const lbPrev = $("#lbPrev");
    if (lbPrev) lbPrev.addEventListener("click", () => show(idx - 1));
    const lbNext = $("#lbNext");
    if (lbNext) lbNext.addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", (e) => {
      if (e.target === lb) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "Tab") {
        const f = $$("button", lb),
          first = f[0],
          last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          if (last) last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          if (first) first.focus();
        }
      }
    });
    let sx = null;
    lb.addEventListener(
      "touchstart",
      (e) => {
        sx = e.touches[0].clientX;
      },
      { passive: true },
    );
    lb.addEventListener(
      "touchend",
      (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
        sx = null;
      },
      { passive: true },
    );
  }

  /* ---------- 6. Word-by-word text & scroll reveals ---------- */
  function splitWords() {
    $$("[data-words], .intro-line").forEach((el) => {
      if (el.dataset.split) return;
      const text = el.textContent.trim().replace(/\s+/g, " ");
      el.dataset.split = "1";
      const sr = document.createElement("span");
      sr.className = "sr";
      sr.textContent = text;
      el.textContent = "";
      el.appendChild(sr);
      text.split(" ").forEach((word, i) => {
        const s = document.createElement("span");
        s.className = "w";
        s.setAttribute("aria-hidden", "true");
        s.style.setProperty("--i", i);
        s.textContent = word;
        el.appendChild(s);
        el.appendChild(document.createTextNode(" "));
      });
      el.classList.add("words");
    });
  }
  function setupReveals() {
    const targets = $$(".reveal, .words:not(.intro-line), .write").filter(
      (t) => !t.closest("#title"),
    );
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- 7. Falling petals, butterflies, bees, hearts ---------- */
  function spawnPetals(container, n) {
    if (!container) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      p.style.left = rand(0, 100) + "%";
      p.style.setProperty("--dur", rand(13, 24) + "s");
      p.style.setProperty("--delay", -rand(0, 24) + "s");
      p.style.scale = rand(0.7, 1.3);
      container.appendChild(p);
    }
  }
  const BUTTERFLY = (
    c,
  ) => `<svg class="bf flip" viewBox="0 0 60 40" aria-hidden="true">
  <g class="wl"><path d="M30 20C22 4 6 2 4 12c-1 8 8 12 16 10-6 2-12 6-9 12 3 5 14 2 19-14z" fill="${c[0]}"/><circle cx="14" cy="13" r="3" fill="${c[1]}" opacity=".8"/></g>
  <g class="wr"><path d="M30 20C38 4 54 2 56 12c1 8-8 12-16 10 6 2 12 6 9 12-3 5-14 2-19-14z" fill="${c[0]}"/><circle cx="46" cy="13" r="3" fill="${c[1]}" opacity=".8"/></g>
  <path d="M30 12v18" stroke="#76543A" stroke-width="2.4" stroke-linecap="round"/><path d="M30 12q-4-7-8-8M30 12q4-7 8-8" fill="none" stroke="#76543A" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  function spawnButterflies(layer) {
    if (!layer) return;
    const palettes = [
      ["#F5C6A5", "#FFF8E7"],
      ["#FBE8A6", "#D9A441"],
      ["#A8B58A", "#FFF8E7"],
      ["#F6C945", "#76543A"],
    ];
    const n = isSmall ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      const dur = rand(38, 66);
      c.className = "critter" + (i % 2 ? " rev" : "");
      c.style.setProperty("--top", rand(8, 78) + "vh");
      c.style.setProperty("--dur", dur + "s");
      c.style.setProperty("--delay", -rand(0, dur) + "s");
      c.innerHTML = `<div class="crit-in" style="animation-duration:${rand(2, 3.4)}s">${BUTTERFLY(palettes[i % 4])}</div>`;
      layer.appendChild(c);
    }
  }
  function spawnBee(layer) {
    if (!layer || document.hidden) return;
    const b = document.createElement("div");
    b.className = "bee";
    b.style.setProperty("--top", rand(15, 75) + "vh");
    b.innerHTML = `<div class="bee-mid"><div class="bee-in"><svg viewBox="0 0 48 34" aria-hidden="true">
    <g class="bw"><ellipse cx="19" cy="9" rx="9" ry="6" fill="#fff" opacity=".75" transform="rotate(-25 19 9)"/><ellipse cx="29" cy="8" rx="9" ry="6" fill="#fff" opacity=".75" transform="rotate(15 29 8)"/></g>
    <ellipse cx="24" cy="21" rx="15" ry="9.5" fill="#F6C945" stroke="#76543A" stroke-width="1.5"/>
    <path d="M19 12.5v17M26 12.2v17.6" stroke="#5E4230" stroke-width="3.6"/><circle cx="38" cy="19" r="2" fill="#5E4230"/>
    <path d="M9 21l-5 2" stroke="#5E4230" stroke-width="2" stroke-linecap="round"/></svg></div></div>`;
    b.addEventListener("animationend", (e) => {
      if (e.target === b) b.remove();
    });
    layer.appendChild(b);
  }
  function spawnFloaters(field, n) {
    if (!field) return;
    const colors = ["#E9A88A", "#F6C945", "#D9A441", "#F5C6A5"];
    for (let i = 0; i < n; i++) {
      const s = document.createElementNS(SVGNS, "svg");
      s.setAttribute("class", "fi");
      s.innerHTML = `<use href="#${i % 3 === 0 ? "star" : "heart"}"/>`;
      s.style.left = rand(4, 94) + "%";
      s.style.setProperty("--s", rand(12, 24) + "px");
      s.style.setProperty("--c", colors[i % colors.length]);
      s.style.setProperty("--dur", rand(7, 12) + "s");
      s.style.setProperty("--delay", -rand(0, 10) + "s");
      field.appendChild(s);
    }
  }
  function setupAmbient() {
    if (reduced) return;
    spawnPetals($("#introPetals"), isSmall ? 8 : 14);
    const layer = $("#ambient");
    spawnPetals(layer, isSmall ? 8 : 14);
    spawnButterflies(layer);
    const loop = () => {
      spawnBee(layer);
      setTimeout(loop, rand(15000, 24000));
    };
    setTimeout(loop, 9000);
    spawnFloaters($("#titleFloat"), isSmall ? 8 : 14);
    spawnFloaters($("#closeFloat"), isSmall ? 8 : 14);
  }

  /* Burst of petals */
  function burstPetals(x, y, n) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      p.style.cssText = `position:fixed;left:${x}px;top:${y}px;animation:none;z-index:1200;pointer-events:none`;
      document.body.appendChild(p);
      const ang = rand(0, Math.PI * 2),
        dist = rand(80, 260);
      const dx = Math.cos(ang) * dist,
        dy = Math.sin(ang) * dist - rand(40, 140);
      const anim = p.animate(
        [
          { transform: "translate(0,0) rotate(0) scale(.6)", opacity: 1 },
          {
            transform: `translate(${dx}px,${dy}px) rotate(${rand(120, 360)}deg) scale(1.1)`,
            opacity: 1,
            offset: 0.45,
          },
          {
            transform: `translate(${dx * 1.15}px,${dy + rand(260, 520)}px) rotate(${rand(360, 720)}deg) scale(.9)`,
            opacity: 0,
          },
        ],
        {
          duration: rand(1800, 3200),
          easing: "cubic-bezier(.2,.7,.3,1)",
        },
      );
      anim.onfinish = () => p.remove();
    }
  }

  /* ---------- 8. Intro / envelope (Envelope removed safely) ---------- */
  let audio = null;

  function setupIntro() {
    const intro = $("#intro"),
      btn = $("#openBtn");
    const l1 = $("#introL1"),
      l2 = $("#introL2");
    if (!intro || !btn) return;
    const n1 = l1 ? $$(".w", l1).length : 0,
      n2 = l2 ? $$(".w", l2).length : 0;
    if (l2) l2.style.setProperty("--base", n1 * 0.13 + 0.9 + "s");

    requestAnimationFrame(() => {
      if (l1) l1.classList.add("in");
      if (l2) l2.classList.add("in");
    });
    const total = reduced ? 100 : (n1 * 0.13 + 0.9 + n2 * 0.13 + 0.8) * 1000;
    setTimeout(() => btn.classList.add("show"), total);

    let opened = false;
    btn.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      btn.disabled = true;
      intro.classList.add("open");

      startMusic(true);
      burstPetals(window.innerWidth / 2, window.innerHeight / 2, 36);

      setTimeout(
        () => {
          intro.classList.add("gone");
          document.body.classList.remove("locked");
          window.scrollTo(0, 0);
          $$("#title .words, #title .reveal").forEach((w) =>
            w.classList.add("in"),
          );
          setTimeout(() => {
            intro.style.display = "none";
          }, 1400);
        },
        reduced ? 200 : 2500,
      );
    });
  }

  /* ---------- 9. Countdown ---------- */
  function setupCountdown() {
    const target = new Date(CONFIG.weddingDate).getTime();
    const els = {
      d: $("#cdD"),
      h: $("#cdH"),
      m: $("#cdM"),
      s: $("#cdS"),
    };
    if (!els.d) return;
    const pad = (n) => String(n).padStart(2, "0");
    let timer;
    const set = (el, v) => {
      if (el && el.textContent !== v) {
        el.textContent = v;
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
      }
    };
    function tick() {
      let diff = target - Date.now();
      if (isNaN(target)) {
        clearInterval(timer);
        return;
      }
      if (diff <= 0) {
        const cdGrid = $("#cdGrid");
        const cdDone = $("#cdDone");
        if (cdGrid) cdGrid.hidden = true;
        if (cdDone) cdDone.hidden = false;
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      set(els.d, pad(Math.floor(s / 86400)));
      set(els.h, pad(Math.floor((s % 86400) / 3600)));
      set(els.m, pad(Math.floor((s % 3600) / 60)));
      set(els.s, pad(s % 60));
    }
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- 10. RSVP ---------- */
  // function setupRSVP() {
  //   const form = $("#rsvpForm"),
  //     guests = $("#gCount"),
  //     max = CONFIG.rsvp.maxGuests || 10;
  //   if (!form || !guests) return;
  //   guests.max = max;
  //   const devNote = $("#devNote");
  //   if (CONFIG.rsvp.endpoint && devNote) devNote.hidden = true;

  //   const clamp = (v) => Math.max(1, Math.min(max, v || 1));
  //   const gMinus = $("#gMinus");
  //   const gPlus = $("#gPlus");
  //   if (gMinus)
  //     gMinus.addEventListener("click", () => {
  //       guests.value = clamp(+guests.value - 1);
  //     });
  //   if (gPlus)
  //     gPlus.addEventListener("click", () => {
  //       guests.value = clamp(+guests.value + 1);
  //     });
  //   guests.addEventListener("change", () => {
  //     guests.value = clamp(+guests.value);
  //   });
  //   $$("input[name=attendance]", form).forEach((r) =>
  //     r.addEventListener("change", () => {
  //       const guestsField = $("#guestsField");
  //       const errAtt = $("#errAtt");
  //       if (guestsField)
  //         guestsField.hidden = form.attendance.value === "decline";
  //       if (errAtt) errAtt.textContent = "";
  //     }),
  //   );
  //   const gName = $("#gName");
  //   const errName = $("#errName");
  //   if (gName && errName) {
  //     gName.addEventListener("input", () => {
  //       errName.textContent = "";
  //     });
  //   }

  //   async function sendRSVP(payload) {
  //     if (!CONFIG.rsvp.endpoint) {
  //       await sleep(700);
  //       return { demo: true };
  //     }
  //     await fetch(CONFIG.rsvp.endpoint, {
  //       method: "POST",
  //       mode: "no-cors",
  //       headers: { "Content-Type": "text/plain;charset=utf-8" },
  //       body: JSON.stringify(payload),
  //     });
  //     return { demo: false };
  //   }

  //   form.addEventListener("submit", async (e) => {
  //     e.preventDefault();
  //     const errSend = $("#errSend");
  //     if (errSend) errSend.textContent = "";
  //     const name = form.guestName.value.trim(),
  //       att = form.attendance.value;
  //     let bad = false;
  //     if (!name) {
  //       if (errName) errName.textContent = "Please tell us your name ";
  //       bad = true;
  //     }
  //     const errAtt = $("#errAtt");
  //     if (!att) {
  //       if (errAtt)
  //         errAtt.textContent = "Please choose one of the options above.";
  //       bad = true;
  //     }
  //     if (bad) {
  //       (!name ? form.guestName : $("input[name=attendance]", form)).focus();
  //       return;
  //     }

  //     const payload = {
  //       timestamp: new Date().toISOString(),
  //       name,
  //       attendance: att,
  //       guests: att === "accept" ? clamp(+guests.value) : 0,
  //       wishes: form.wishes.value.trim(),
  //     };
  //     const btn = $("#rsvpBtn");
  //     if (btn) {
  //       btn.disabled = true;
  //       btn.textContent = "Sending…";
  //     }
  //     try {
  //       const res = await sendRSVP(payload);
  //       const first = name.split(" ")[0];
  //       const doneTitle = $("#doneTitle");
  //       const doneText = $("#doneText");
  //       const doneDemo = $("#doneDemo");
  //       const rsvpDone = $("#rsvpDone");

  //       if (doneTitle)
  //         doneTitle.textContent =
  //           att === "accept" ? `Yay, ${first}!` : `Thank you, ${first}`;
  //       if (doneText) {
  //         doneText.textContent =
  //           att === "accept"
  //             ? "We are so happy you will bloom with us. Your sunshine will make our day even brighter. "
  //             : "We will miss you dearly, but we are grateful for your love and prayers. You will be in our hearts on our special day.";
  //       }
  //       if (doneDemo) doneDemo.hidden = !res.demo;
  //       form.hidden = true;
  //       if (rsvpDone) {
  //         rsvpDone.hidden = false;
  //         rsvpDone.focus({ preventScroll: true });
  //         const r = rsvpDone.getBoundingClientRect();
  //         burstPetals(
  //           r.left + r.width / 2,
  //           r.top + 60,
  //           att === "accept" ? 40 : 16,
  //         );
  //       }
  //     } catch (err) {
  //       if (errSend)
  //         errSend.textContent =
  //           "Hmm, something went wrong while sending. Please check your connection and try again.";
  //       if (btn) {
  //         btn.disabled = false;
  //         btn.textContent = "Send My RSVP ";
  //       }
  //     }
  //   });
  // }
  /* ---------- 10. RSVP & GUEST VALIDATION ---------- */
  function setupRSVP() {
    const form = $("#rsvpForm");
    const guestsInput = $("#gCount");
    const max = CONFIG.rsvp.maxGuests || 10;
    if (!form || !guestsInput) return;

    guestsInput.max = max;
    let guests = parseInt(guestsInput.value) || 1;
    const devNote = $("#devNote");
    if (CONFIG.rsvp.endpoint && devNote) devNote.hidden = true;

    const clamp = (v) => Math.max(1, Math.min(max, v || 1));
    const gMinus = $("#gMinus");
    const gPlus = $("#gPlus");
    const previewText = $("#previewText");

    // Fungsi Live Preview
    function updatePreview() {
      if (!previewText) return;
      const gName = $("#gName");
      const nameVal = gName ? gName.value.trim() || "Guest" : "Guest";
      const attRadio = form.querySelector("input[name=attendance]:checked");
      const attVal = attRadio ? attRadio.value : "undecided";
      const wishesField = $("#gWishes");
      const wishesVal = wishesField ? wishesField.value.trim() : "";

      let statusDesc = "has not decided yet";
      if (attVal.includes("Accept") || attVal === "accept") {
        statusDesc = `will attend with ${guests} guest(s)`;
      } else if (attVal.includes("Decline") || attVal === "decline") {
        statusDesc = "regretfully cannot attend";
      }

      previewText.textContent = `${nameVal} ${statusDesc}. Note: "${wishesVal || "(no note yet)"}"`;
    }

    if (gMinus) {
      gMinus.addEventListener("click", () => {
        guests = clamp(guests - 1);
        guestsInput.value = guests;
        if ($("#gCountText")) $("#gCountText").textContent = guests;
        updatePreview();
      });
    }
    if (gPlus) {
      gPlus.addEventListener("click", () => {
        guests = clamp(guests + 1);
        guestsInput.value = guests;
        if ($("#gCountText")) $("#gCountText").textContent = guests;
        updatePreview();
      });
    }
    guestsInput.addEventListener("change", () => {
      guests = clamp(+guestsInput.value);
      guestsInput.value = guests;
      updatePreview();
    });

    $$("input[name=attendance]", form).forEach((r) => {
      r.addEventListener("change", (e) => {
        const guestsField = $("#guestsField");
        const errAtt = $("#errAtt");
        const isDecline =
          e.target.value === "decline" ||
          e.target.value === "Regretfully Decline";

        if (guestsField) guestsField.hidden = isDecline;
        if (isDecline) guests = 0;
        else guests = clamp(parseInt(guestsInput.value) || 1);

        if (errAtt) errAtt.textContent = "";
        updatePreview();
      });
    });

    const gName = $("#gName") || form.guestName;
    const errName = $("#errName");
    if (gName && errName) {
      gName.addEventListener("input", () => {
        errName.textContent = "";
        updatePreview();
      });
    }

    const wishesField = $("#gWishes");
    const errWishes = $("#errWishes");
    if (wishesField && errWishes) {
      wishesField.addEventListener("input", () => {
        errWishes.textContent = "";
        updatePreview();
      });
    }

    // Handle Submit Form
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errSend = $("#errSend");
      if (errSend) errSend.textContent = "";

      const name = gName ? gName.value.trim() : "";
      const attRadio = form.querySelector("input[name=attendance]:checked");
      const att = attRadio ? attRadio.value : "";
      const wishes = wishesField ? wishesField.value.trim() : "";

      let bad = false;
      const errAtt = $("#errAtt");

      if (!name) {
        if (errName) errName.textContent = "Please tell us your name ";
        bad = true;
      }
      if (!att) {
        if (errAtt)
          errAtt.textContent = "Please choose one of the options above.";
        bad = true;
      }
      if (!wishes) {
        if (errWishes)
          errWishes.textContent = "Please leave us a little note or prayer ";
        bad = true;
      }

      if (bad) {
        if (!name && gName) gName.focus();
        else if (!att && attRadio) attRadio.focus();
        else if (!wishes && wishesField) wishesField.focus();
        return;
      }

      const payload = {
        timestamp: new Date().toISOString(),
        name,
        attendance: att,
        guests:
          att === "accept" || att === "Joyfully Accept" ? clamp(guests) : 0,
        wishes: wishes,
      };

      const btn = $("#rsvpBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }

      try {
        if (!CONFIG.rsvp.endpoint) {
          await sleep(700);
        } else {
          await fetch(CONFIG.rsvp.endpoint, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
          });
        }

        const first = name.split(" ")[0];
        const doneTitle = $("#doneTitle");
        const doneText = $("#doneText");
        const doneDemo = $("#doneDemo");
        const rsvpDone = $("#rsvpDone");
        const isAccept = att === "accept" || att === "Joyfully Accept";

        if (doneTitle) {
          doneTitle.textContent = isAccept
            ? `Yay, ${first}!`
            : `Thank you, ${first}`;
        }
        if (doneText) {
          doneText.textContent = isAccept
            ? "Thank you for confirming your attendance. We look forward to celebrating this special day with you."
            : "Thank you for letting us know. We truly appreciate your love, prayers, and warm wishes.";
        }
        if (doneDemo) doneDemo.hidden = !!CONFIG.rsvp.endpoint;

        form.hidden = true;
        if (rsvpDone) {
          rsvpDone.hidden = false;
          rsvpDone.focus({ preventScroll: true });
          const r = rsvpDone.getBoundingClientRect();
          if (typeof burstPetals === "function") {
            burstPetals(r.left + r.width / 2, r.top + 60, isAccept ? 40 : 16);
          }
        }

        await loadRsvpEntries();
      } catch (err) {
        if (errSend) {
          errSend.textContent =
            "Hmm, something went wrong while sending. Please check connection.";
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Send My RSVP ";
        }
      }
    });

    initGuestUrlAndSecurity();
  }

  async function initGuestUrlAndSecurity() {
    const params = new URLSearchParams(window.location.search);
    const guestParam = (params.get("to") || "").trim();
    const introGuestElement = document.getElementById("introGuestName");
    if (introGuestElement && guestParam) {
      introGuestElement.textContent = decodeURIComponent(guestParam);
    }
    // Elemen untuk menampilkan pesan akses ditolak
    let accessDeniedShown = false;

    function denyAccess(message) {
      // Cegah tampilan dibuat berulang kali.
      if (accessDeniedShown) return;

      accessDeniedShown = true;

      document.body.innerHTML = `
    <main class="access-screen">
      <section class="access-card" role="alert" aria-live="assertive">

        <div class="access-ornament" aria-hidden="true">✿</div>


        <h1 class="access-title">
          Akses Undangan<br>
          Dibatasi
        </h1>

        <div class="access-divider" aria-hidden="true">
          <span>✦</span>
        </div>

        <p class="access-message" id="accessMessage"></p>

        <p class="access-note">
          Silakan hubungi calon pengantin untuk mendapatkan tautan
          undangan pribadi Anda.
        </p>

        <div class="access-footer">With Love</div>

      </section>
    </main>
  `;

      document.getElementById("accessMessage").textContent =
        message || "Tautan undangan ini tidak dapat diakses.";

      document.title = "Akses Undangan Dibatasi";
    }

    // Tidak ada parameter ?to= berarti langsung ditolak
    if (!guestParam) {
      denyAccess("Tautan undangan ini tidak valid atau tidak lengkap.");
      return false;
    }

    if (!CONFIG.rsvp || !CONFIG.rsvp.endpoint) {
      denyAccess(
        "Undangan tidak dapat diverifikasi. Silakan coba beberapa saat lagi.",
      );
      return false;
    }

    // Buat ID perangkat yang disimpan di browser
    let deviceId = localStorage.getItem("wedding_device_id");

    if (!deviceId) {
      deviceId =
        window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : "device-" + Date.now() + "-" + Math.random().toString(36).slice(2);

      localStorage.setItem("wedding_device_id", deviceId);
    }

    try {
      const verifyUrl = new URL(CONFIG.rsvp.endpoint);

      verifyUrl.searchParams.set("to", guestParam);
      verifyUrl.searchParams.set("device_id", deviceId);

      const response = await fetch(verifyUrl.toString(), {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Verification request failed");
      }

      const result = await response.json();

      if (result.status !== "success" || result.access !== "granted") {
        const messages = {
          unregistered: "Nama tamu ini tidak terdaftar di daftar tamu kami.",
          forwarded:
            "Undangan ini telah dibuka atau terdaftar di perangkat lain.",
          missing_parameters: "Tautan undangan tidak lengkap.",
          noguestsheet: "Daftar tamu tidak dapat ditemukan.",
        };

        denyAccess(
          messages[result.reason] ||
            "Anda tidak memiliki izin untuk mengakses undangan ini.",
        );

        return false;
      }

      // Akses berhasil
      const gNameInput = $("#gName");
      const guestElement =
        document.getElementById("targetGuestName") ||
        document.getElementById("guestName");

      if (guestElement) guestElement.textContent = guestParam;
      if (gNameInput) gNameInput.value = guestParam;

      await loadRsvpEntries();

      return true;
    } catch (error) {
      console.error("Invitation verification failed:", error);

      denyAccess(
        "Kami tidak dapat memverifikasi undangan Anda. Periksa koneksi internet Anda lalu coba lagi.",
      );

      return false;
    }
  }
  // Fungsi Memuat Daftar RSVP untuk Tes Koneksi Google Sheet
  async function loadRsvpEntries() {
    const container = document.getElementById("rsvpEntries");
    if (!container) return;

    if (!CONFIG.rsvp || !CONFIG.rsvp.endpoint) {
      container.innerHTML =
        "<p style='text-align: center; color: #8b3a3a; font-style: italic;'>CONFIG.rsvp.endpoint belum diatur di file konfigurasi.</p>";
      return;
    }

    try {
      const response = await fetch(CONFIG.rsvp.endpoint + "?action=rsvp");
      const result = await response.json();

      if (result && result.length > 0) {
        container.innerHTML = "";
        result
          .slice()
          .reverse()
          .slice(0, 30)
          .forEach((item) => {
            if (!item.name) return;

            const card = document.createElement("div");
            card.className = "rsvp-card-item"; // Menggunakan kelas gaya baru

            const isAccept =
              item.attendance === "accept" ||
              item.attendance === "Joyfully Accept";
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
          "<p style='text-align: center; color: var(--text-light); font-style: italic;'>Belum ada data RSVP di Google Sheet.</p>";
      }
    } catch (err) {
      console.error("Gagal terhubung ke Google Sheet:", err);
      container.innerHTML =
        "<p style='text-align: center; color: #a94442; font-style: italic;'>Gagal memuat data. Periksa kembali URL Endpoint Apps Script / CORS.</p>";
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  /* ---------- 11. MUSIC PLAYER & VISIBILITY CONTROL ---------- */

  function startMusic(fromIntro) {
    const audioSrc =
      CONFIG.audio && CONFIG.audio.src ? CONFIG.audio.src : CONFIG.musicSrc;
    if (!audioSrc) return false;

    if (!audio) {
      audio = new Audio(audioSrc);
      audio.loop = true;
      audio.volume = 0.6;
      audio.addEventListener("error", () => {
        toast(
          "Could not load the audio file. Please check audio configuration.",
        );
        setPlaying(false);
      });
    }
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
        if (!fromIntro)
          toast("Your browser blocked the audio. Tap play again.");
      });
    return true;
  }

  function setPlaying(on) {
    const btn = $("#music");
    if (!btn) return;
    btn.classList.toggle("playing", on);
    const icPlay = $("#icPlay");
    const icPause = $("#icPause");
    if (icPlay) icPlay.hidden = on;
    if (icPause) icPause.hidden = !on;
    btn.setAttribute("aria-pressed", on);
    btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
  }

  function setupMusic() {
    const musicBtn = $("#music");
    if (!musicBtn) return;
    musicBtn.addEventListener("click", () => {
      const audioSrc =
        CONFIG.audio && CONFIG.audio.src ? CONFIG.audio.src : CONFIG.musicSrc;
      if (!audioSrc) {
        toast("Add your own audio file to enable music 🎵");
        return;
      }
      if (audio && !audio.paused) {
        audio.pause();
        setPlaying(false);
      } else {
        startMusic(false);
      }
    });
  }

  // Auto Pause & Resume saat berganti tab atau keluar aplikasi
  document.addEventListener("visibilitychange", async () => {
    const audioSrc =
      CONFIG.audio && CONFIG.audio.src ? CONFIG.audio.src : CONFIG.musicSrc;
    if (document.hidden) {
      if (audio && !audio.paused) {
        audio.pause();
        setPlaying(false);
      }
    } else {
      const introEl = document.getElementById("intro");
      if (
        introEl &&
        getComputedStyle(introEl).display === "none" &&
        audio &&
        audioSrc
      ) {
        try {
          await audio.play();
          setPlaying(true);
        } catch (err) {
          console.log("Auto-play lanjutan diblokir oleh browser.");
        }
      }
    }
  });

  window.addEventListener("pagehide", () => {
    if (audio && !audio.paused) {
      audio.pause();
    }
  });
  /* ---------- 11. Music player (Compact round button widget) ---------- */
  // function startMusic(fromIntro) {
  //   if (!CONFIG.audio.src) return false;
  //   if (!audio) {
  //     audio = new Audio(CONFIG.audio.src);
  //     audio.loop = true;
  //     audio.volume = 0.6;
  //     audio.addEventListener("error", () => {
  //       toast("Could not load the audio file. Please check CONFIG.audio.src.");
  //       setPlaying(false);
  //     });
  //   }
  //   audio
  //     .play()
  //     .then(() => setPlaying(true))
  //     .catch(() => {
  //       setPlaying(false);
  //       if (!fromIntro)
  //         toast("Your browser blocked the audio. Tap play again.");
  //     });
  //   return true;
  // }

  // function setPlaying(on) {
  //   const btn = $("#music");
  //   if (!btn) return;
  //   btn.classList.toggle("playing", on);
  //   const icPlay = $("#icPlay");
  //   const icPause = $("#icPause");
  //   if (icPlay) icPlay.hidden = on;
  //   if (icPause) icPause.hidden = !on;
  //   btn.setAttribute("aria-pressed", on);
  //   btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  // }

  // let toastTimer;
  // function toast(msg) {
  //   const t = $("#toast");
  //   if (!t) return;
  //   t.textContent = msg;
  //   t.classList.add("show");
  //   clearTimeout(toastTimer);
  //   toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
  // }

  // function setupMusic() {
  //   const musicBtn = $("#music");
  //   if (!musicBtn) return;
  //   musicBtn.addEventListener("click", () => {
  //     if (!CONFIG.audio.src) {
  //       toast("Add your own audio file in CONFIG.audio.src to enable music 🎵");
  //       return;
  //     }
  //     if (audio && !audio.paused) {
  //       audio.pause();
  //       setPlaying(false);
  //     } else {
  //       startMusic(false);
  //     }
  //   });
  // }

  /* ---------- 12. Menu, back-to-top, parallax, cursor, closing ---------- */
  function setupUI() {
    const mb = $("#menuBtn"),
      mp = $("#menuPanel");
    if (mb && mp) {
      const setMenu = (open) => {
        mp.classList.toggle("open", open);
        mb.setAttribute("aria-expanded", open);
      };
      mb.addEventListener("click", (e) => {
        e.stopPropagation();
        setMenu(!mp.classList.contains("open"));
      });
      mp.addEventListener("click", (e) => {
        if (e.target.closest("a")) setMenu(false);
      });
      document.addEventListener("click", (e) => {
        if (!mp.contains(e.target)) setMenu(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setMenu(false);
      });
    }

    const top = $("#toTop");
    const toTop = () =>
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (top) top.addEventListener("click", toTop);
    const againBtn = $("#againBtn");
    if (againBtn) againBtn.addEventListener("click", toTop);

    const px = $$(".px");
    let ticking = false;
    function onScroll() {
      if (top) top.classList.toggle("show", window.scrollY > 700);
      if (!reduced) {
        px.forEach((el) => {
          const parent = el.parentElement;
          if (!parent) return;
          const r = parent.getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) return;
          const off =
            (r.top + r.height / 2 - innerHeight / 2) *
            parseFloat(el.dataset.speed || 0);
          el.style.translate = `0 ${off.toFixed(1)}px`;
        });
      }
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true },
    );
    onScroll();

    if (!reduced && matchMedia("(hover:hover) and (pointer:fine)").matches) {
      const cur = $("#cursor");
      if (cur) {
        let x = -100,
          y = -100,
          cx = x,
          cy = y;
        window.addEventListener(
          "mousemove",
          (e) => {
            x = e.clientX;
            y = e.clientY;
            cur.classList.add("on");
          },
          { passive: true },
        );
        document.addEventListener("mouseleave", () =>
          cur.classList.remove("on"),
        );
        document.addEventListener("mouseover", (e) =>
          cur.classList.toggle(
            "big",
            !!e.target.closest("a,button,label,input,textarea"),
          ),
        );
        (function loop() {
          cx += (x - cx) * 0.2;
          cy += (y - cy) * 0.2;
          cur.style.transform = `translate3d(${cx + 10}px,${cy + 10}px,0)`;
          requestAnimationFrame(loop);
        })();
      }
    }

    const closing = $("#closing");
    if (closing) {
      let fadeT;
      new IntersectionObserver(
        ([en]) => {
          clearTimeout(fadeT);
          if (en.isIntersecting)
            fadeT = setTimeout(
              () => closing.classList.add("fading"),
              reduced ? 300 : 7000,
            );
          else closing.classList.remove("fading");
        },
        { threshold: 0.6 },
      ).observe(closing);
    }
  }

  /* ---------- Copy Btn ---------- */
  async function copyText(t) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (e) {}
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, t.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  // Event listener untuk tombol copy di dalam giftGrid
  document.getElementById("giftGrid").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const ok = await copyText(b.dataset.copy);

    if (ok) {
      const old = b.textContent;
      b.textContent = "Copied";
      setTimeout(() => {
        b.textContent = old;
      }, 2200);
    }
  });
  /* ---------- boot ---------- */

  async function init() {
    // Tampilkan status menunggu selama pemeriksaan

    buildSymbols();
    fillClusters();
    bindText();

    // Periksa akses tamu terlebih dahulu
    const accessGranted = await initGuestUrlAndSecurity();

    // Jika tidak terdaftar, hentikan seluruh inisialisasi undangan
    if (!accessGranted) return;

    // Hanya dijalankan jika akses berhasil
    renderStory();
    renderGallery();

    splitWords();
    setupReveals();
    setupAmbient();
    setupIntro();
    setupCountdown();
    setupLightbox();

    // Inisialisasi form RSVP
    setupRSVP();

    setupMusic();
    setupUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    buildSymbols();
    fillClusters();
    bindText();

    renderStory();
    renderGallery();

    splitWords();
    setupReveals();
    setupAmbient();
    setupIntro();
    setupCountdown();
    setupLightbox();

    // Initialize guest URL and load RSVP entries independently
    initGuestUrlAndSecurity();

    // Initialize RSVP form interactions
    setupRSVP();

    setupMusic();
    setupUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

//   /* ---------- boot ---------- */
//   function init() {
//     buildSymbols();
//     fillClusters();
//     bindText();
//     renderStory();
//     renderGallery();
//     splitWords();
//     setupReveals();
//     setupAmbient();
//     setupIntro();
//     setupCountdown();
//     setupLightbox();
//     setupRSVP();
//     setupMusic();
//     setupUI();
//   }
//   if (document.readyState === "loading")
//     document.addEventListener("DOMContentLoaded", init);
//   else init();
// })();
