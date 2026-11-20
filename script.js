/* =====================================================================
   ★ EASY EDIT AREA — change everything about YOUR wedding right here ★
   =====================================================================

   RSVP BACKEND: the RSVP form and the wishes list talk to a Google Apps
   Script Web App. Its source lives in apps-script/Code.gs. Deploy it as a
   Web app (Execute as: Me, Who has access: Anyone) and paste the Web app
   URL into CONFIG.rsvp.endpoint below. Guests need no link parameters:
   anyone can open the invitation and RSVP by typing their own name.

   - The wishes list is read with JSONP (a <script> tag), because Apps Script
     responses cannot be read cross-origin with fetch().
   - The form posts in "no-cors" mode (required for Apps Script), so the page
     cannot read the reply and treats the RSVP as sent when the network request
     succeeds. Always double-check your Sheet.
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
    address: "Jl. A. Yani KM.14.400, Gang 99 (Samping DHL Express) ",
    mapsLink: "https://maps.app.goo.gl/ThpTaCDKbWuzcJEy5", // paste a Google Maps share/directions link; leave "" to auto-search by address
    embedMap: true, // true = show a live Google Map instead of the drawn map (needs a real address)
  },

  /* --- Love story (4 chapters). photo: "" shows a placeholder; or paste a URL / "images/us1.jpg" --- */

  story: [
    {
      title: "We Met",
      date: "December 27, 2020",
      text: "New to college and completely lost, I called out to him to ask for directions as he walked past. He walked away as I approached. Two years later, we returned to that spot in the same outfits and took a photo to remember it.",
      shortText:
        "Lost in my first year of college, I called to him for directions. He walked away as I approached. Two years later, we returned to that spot in the same outfits and took a photo to remember it.",
      caption: "Our first encounter",
      photo: "gallery/our-first-meet.webp",
    },
    {
      title: "Our First Date",
      date: "February 20, 2022",
      text: "It was my birthday, 15 days after we started dating. We had a quick meal at the mall, but time was running out and there were still plenty of fries left, so I kept feeding them to him until we could finally head home.",
      shortText:
        "On my birthday, 15 days after we started dating, we had a quick meal at the mall. Time was running out and the fries weren't finished, so I fed them to him as fast as I could.",
      caption: "Rushing through fries",
      photo: "gallery/our-date.webp",
    },
    {
      title: "We Graduated",
      date: "July 3, 2024",
      text: "After a lot of ups and downs along the way, we both graduated on the same day, just as we had always hoped. It was a day we had been working toward for years, and we finally got to celebrate it together.",
      shortText:
        "After many ups and downs, we both graduated on the same day, just as we had hoped. We had worked toward it for years, and finally got to celebrate it together.",
      caption: "Graduating together",
      photo: "gallery/our-graduation.webp",
    },
    {
      title: "Our Wedding Day",
      date: "January 17, 2027",
      text: "We were serious about each other from the start, and since 2022 we have been building our future step by step. Now we are ready for the next one: starting married life together. We can't wait to celebrate it with our families and loved ones.",
      shortText:
        "We were serious from the start, and since 2022 we have built our future step by step. Now we begin married life together, and we can't wait to celebrate it with our families and loved ones.",
      caption: "The next chapter",
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
  audio: { src: "music/best-part.mp3", title: "[SONG TITLE]" },

  /* --- RSVP --- */
  rsvp: {
    endpoint:
      "https://script.google.com/macros/s/AKfycbzDIgOmtC486aFMch3oB_vDOTeET141J9Es5UucN4tdfifpOl8F19kgEhceGhulw69D/exec",
    maxGuests: 10,
    listTimeoutMs: 12000, // JSONP timeout for loading the wishes list
    postTimeoutMs: 20000, // network timeout for sending an RSVP
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
  const ATTEND_YES = "Joyfully Accept";
  const ATTEND_NO = "Regretfully Decline";
  const MAX_NAME = 80;

  /* ---- Reusable JSONP loader ----------------------------------------
     Apps Script web apps answer with a redirect to
     script.googleusercontent.com and cannot send CORS headers, so
     fetch() cannot read GET responses cross-origin. A <script> tag is
     not subject to CORS, so the backend wraps its JSON in callback(...).

     jsonp(url, { params, timeoutMs }) -> Promise<data>
     - unique callback name per request
     - rejects on script error or timeout
     - always removes the <script> and the temporary global callback
     - a late reply after timeout hits a harmless no-op, never a
       duplicate callback                                              */
  let jsonpSeq = 0;
  function jsonp(url, opts) {
    opts = opts || {};
    const timeoutMs = opts.timeoutMs || 12000;
    const params = opts.params || {};

    return new Promise((resolve, reject) => {
      const cbName = `__rsvpCb_${Date.now().toString(36)}_${++jsonpSeq}`;
      const script = document.createElement("script");
      let settled = false;
      let timer = null;

      const cleanup = (lateReplyPossible) => {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        if (lateReplyPossible) {
          // Script may still answer after a timeout: swallow it, then free the name.
          window[cbName] = function () {};
          setTimeout(() => {
            try {
              delete window[cbName];
            } catch (e) {
              window[cbName] = undefined;
            }
          }, 60000);
        } else {
          try {
            delete window[cbName];
          } catch (e) {
            window[cbName] = undefined;
          }
        }
      };

      const finish = (fn, value, late) => {
        if (settled) return;
        settled = true;
        cleanup(late);
        fn(value);
      };

      window[cbName] = (data) => finish(resolve, data, false);

      script.onerror = () =>
        finish(reject, new Error("JSONP script failed to load"), false);
      // If the script loaded but never called back (e.g. error page), fail quickly.
      script.onload = () =>
        setTimeout(() => {
          finish(reject, new Error("JSONP callback was not invoked"), false);
        }, 0);

      timer = setTimeout(
        () => finish(reject, new Error("JSONP request timed out"), true),
        timeoutMs,
      );

      const q = new URLSearchParams(params);
      q.set("callback", cbName);
      q.set("_", Date.now().toString(36)); // cache buster
      script.async = true;
      script.src = url + (url.indexOf("?") === -1 ? "?" : "&") + q.toString();
      document.head.appendChild(script);
    });
  }

  function setupRSVP() {
    const form = $("#rsvpForm");
    const guestsInput = $("#gCount");
    if (!form || !guestsInput) return;

    const max = CONFIG.rsvp.maxGuests || 10;
    guestsInput.max = max;
    const devNote = $("#devNote");
    if (CONFIG.rsvp.endpoint && devNote) devNote.hidden = true;

    const nameInput = $("#gName");
    const wishesInput = $("#gWishes");
    const guestsField = $("#guestsField");
    const errName = $("#errName");
    const errAtt = $("#errAtt");
    const errSend = $("#errSend");
    // Wishes are required. The error span is created here if index.html lacks one.
    let errWishes = $("#errWishes");
    if (!errWishes && wishesInput) {
      errWishes = document.createElement("span");
      errWishes.className = "err";
      errWishes.id = "errWishes";
      errWishes.setAttribute("role", "alert");
      wishesInput.insertAdjacentElement("afterend", errWishes);
    }
    if (wishesInput) {
      wishesInput.required = true;
      wishesInput.addEventListener("input", () => {
        errWishes.textContent = "";
      });
    }
    const btn = $("#rsvpBtn");
    const btnLabel = btn ? btn.textContent.trim() : "Send My RSVP";

    const clamp = (v) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? Math.max(1, Math.min(max, n)) : 1;
    };
    const step = (d) => {
      guestsInput.value = clamp(+guestsInput.value + d);
    };

    const gMinus = $("#gMinus");
    const gPlus = $("#gPlus");
    if (gMinus) gMinus.addEventListener("click", () => step(-1));
    if (gPlus) gPlus.addEventListener("click", () => step(1));
    guestsInput.addEventListener("change", () => {
      guestsInput.value = clamp(guestsInput.value);
    });

    $$("input[name=attendance]", form).forEach((r) =>
      r.addEventListener("change", () => {
        if (guestsField)
          guestsField.hidden = r.value === ATTEND_NO && r.checked;
        if (errAtt) errAtt.textContent = "";
      }),
    );
    if (nameInput && errName) {
      nameInput.addEventListener("input", () => {
        errName.textContent = "";
      });
    }

    /* POST strategy: "no-cors" + text/plain is a CORS "simple request", so
       no preflight is sent and Apps Script receives the body. The response is
       opaque: we cannot read status or body. So a resolved fetch only means the
       request left the browser; it is NOT confirmation that the row was saved.
       A rejected fetch means a network failure. We never retry automatically,
       because a retry could create a duplicate row. */
    async function postRsvp(payload) {
      if (!CONFIG.rsvp.endpoint) throw new Error("RSVP endpoint is not set");
      const ctrl = new AbortController();
      const t = setTimeout(
        () => ctrl.abort(),
        CONFIG.rsvp.postTimeoutMs || 20000,
      );
      try {
        await fetch(CONFIG.rsvp.endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
    }

    let sending = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (sending) return;
      if (errSend) errSend.textContent = "";

      const name = nameInput.value.replace(/\s+/g, " ").trim();
      const checked = form.querySelector("input[name=attendance]:checked");
      const att = checked ? checked.value : "";
      const wishes = wishesInput ? wishesInput.value.trim() : "";

      let bad = false;
      if (!name) {
        errName.textContent = "Please tell us your name.";
        bad = true;
      } else if (name.length > MAX_NAME) {
        errName.textContent = `Please keep your name under ${MAX_NAME} characters.`;
        bad = true;
      }
      if (!att) {
        errAtt.textContent = "Please choose one of the options above.";
        bad = true;
      }
      if (!wishes) {
        errWishes.textContent = "Please leave us a wish or a prayer.";
        bad = true;
      }
      if (bad) {
        (!name || name.length > MAX_NAME
          ? nameInput
          : !att
            ? $("input[name=attendance]", form)
            : wishesInput
        ).focus();
        return;
      }

      const attending = att === ATTEND_YES;
      const payload = {
        name,
        attendance: att,
        guests: attending ? clamp(guestsInput.value) : 0,
        wishes,
      };

      sending = true;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }

      let sent = false;
      try {
        await postRsvp(payload);
        sent = true;

        const first = name.split(" ")[0];
        $("#doneTitle").textContent = attending
          ? `Yay, ${first}!`
          : `Thank you, ${first}`;
        $("#doneText").textContent = attending
          ? "Thank you for confirming your attendance. We look forward to celebrating this special day with you."
          : "Thank you for letting us know. We truly appreciate your love, prayers, and warm wishes.";

        form.hidden = true;
        const rsvpDone = $("#rsvpDone");
        rsvpDone.hidden = false;
        rsvpDone.focus({ preventScroll: true });
        const r = rsvpDone.getBoundingClientRect();
        burstPetals(r.left + r.width / 2, r.top + 60, attending ? 40 : 16);

        // Give Apps Script a moment to write the row, then refresh the list.
        setTimeout(loadRsvpEntries, 2500);
      } catch (err) {
        console.error("RSVP failed:", err);
        if (errSend) {
          errSend.textContent =
            "We couldn't send your RSVP. Please check your connection and try again.";
        }
      } finally {
        sending = false;
        // Keep the button locked once sent so a second click cannot duplicate the row.
        if (btn && !sent) {
          btn.disabled = false;
          btn.textContent = btnLabel;
        }
      }
    });
  }

  /* ---------- RSVP wishes list (JSONP) ---------- */
  let rsvpLoading = null; // in-flight request, prevents duplicate loads
  function loadRsvpEntries() {
    const container = $("#rsvpEntries");
    if (!container) return Promise.resolve();
    if (rsvpLoading) return rsvpLoading;

    const note = (msg) => {
      container.innerHTML = `<p style="text-align:center;font-style:italic">${esc(msg)}</p>`;
    };

    if (!CONFIG.rsvp || !CONFIG.rsvp.endpoint) {
      note("Wishes will appear here.");
      return Promise.resolve();
    }

    note("Loading wishes...");

    rsvpLoading = jsonp(CONFIG.rsvp.endpoint, {
      params: { action: "rsvp" },
      timeoutMs: CONFIG.rsvp.listTimeoutMs || 12000,
    })
      .then((result) => {
        if (!Array.isArray(result)) throw new Error("Unexpected response");

        const items = result
          .filter((item) => item && String(item.name || "").trim())
          .reverse()
          .slice(0, 30);
        if (!items.length) {
          note("Be the first to leave us a wish!");
          return;
        }

        container.innerHTML = items
          .map((item) => {
            const accepted = item.attendance === ATTEND_YES;
            const wish = String(item.wishes || "").trim();
            return `<div class="rsvp-card-item">
            <div class="rsvp-card-header">
              <span class="rsvp-card-name">${esc(String(item.name).trim())}</span>
              <span class="rsvp-card-badge ${accepted ? "badge-accept" : "badge-decline"}">${accepted ? "Attending" : "Declined"}</span>
            </div>
            ${wish ? `<p class="rsvp-card-wish">"${esc(wish)}"</p>` : ""}
          </div>`;
          })
          .join("");
      })
      .catch((err) => {
        console.error("Could not load RSVP list:", err);
        note("Wishes could not be loaded right now.");
      })
      .finally(() => {
        rsvpLoading = null;
      });

    return rsvpLoading;
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
  const giftGridEl = document.getElementById("giftGrid");
  if (giftGridEl)
    giftGridEl.addEventListener("click", async (e) => {
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
  function init() {
    buildSymbols();
    fillClusters();
    bindText();
    renderStory();
    renderGallery();
    splitWords();
    setupReveals();
    setupAmbient();
    setupCountdown();
    setupLightbox();
    setupRSVP();
    setupMusic();
    setupUI();
    setupIntro();
    loadRsvpEntries();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
