/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
(function initCustomCursor() {
  // Only on desktop
  if (window.matchMedia('(pointer: coarse)').matches) return;
  
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  
  if (!cursor || !follower) return;
  
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let followerX = 0, followerY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  // Smooth animation
  function animate() {
    // Cursor follows immediately
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    
    // Follower has delay for smooth effect
    followerX += (mouseX - followerX) * 0.1;
    followerY += (mouseY - followerY) * 0.1;
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    
    requestAnimationFrame(animate);
  }
  animate();
  
  // Hover effects on interactive elements
  const interactiveElements = document.querySelectorAll('a, button, .btn, .rcard__dl-btn, .lang-btn, .mobile-nav__link');
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hover');
      follower.classList.add('hover');
    });
    
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hover');
      follower.classList.remove('hover');
    });
  });
  
  // Click effects
  document.addEventListener('mousedown', () => {
    cursor.classList.add('click');
    follower.classList.add('click');
  });
  
  document.addEventListener('mouseup', () => {
    cursor.classList.remove('click');
    follower.classList.remove('click');
  });
})();

/* ============================================================
   DATES — auto mark past shows & interactive filters
   ============================================================ */
(function initDates() {
  const MONTH_MAP = {
    enero:0, ene:0, febrero:1, feb:1, marzo:2, mar:2,
    abril:3, abr:3, mayo:4, junio:5, jun:5,
    julio:6, jul:6, agosto:7, ago:7, septiembre:8, sep:8,
    octubre:9, oct:9, noviembre:10, nov:10, diciembre:11, dic:11
  };

  const MONTH_ABBR = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

  function parseDate(raw) {
    const text = String(raw).trim();
    // ISO format (from dates.json, editable via /admin.html)
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    // Legacy "25 abril 2026" format (static HTML fallback rows)
    m = text.toLowerCase().match(/^(\d{1,2})\s+([a-záéíóúüñ]+)\s+(\d{4})$/i);
    if (!m) return null;
    const day = Number(m[1]);
    const month = MONTH_MAP[m[2].normalize('NFD').replace(/[̀-ͯ]/g,'')];
    const year = Number(m[3]);
    if (month === undefined) return null;
    return new Date(year, month, day, 12, 0, 0);
  }

  const list = document.getElementById('datesList');
  const today = new Date();
  today.setHours(0,0,0,0);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
    ));
  }

  // Build rows from dates.json data; static HTML rows stay as fallback
  function renderRows(dates) {
    if (!list || !Array.isArray(dates)) return;
    const sorted = dates.slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    list.innerHTML = sorted.map(d => {
      const parsed = parseDate(d.date);
      const label = parsed
        ? String(parsed.getDate()).padStart(2, '0') + ' ' + MONTH_ABBR[parsed.getMonth()] + ' ' + parsed.getFullYear()
        : esc(d.date);
      return '<div class="dates__row" data-date="' + esc(d.date) + '">' +
        '<span class="dates__date">' + label + '</span>' +
        '<span class="dates__city">' + esc(d.city || '') + '</span>' +
        '<span class="dates__venue">' + esc(d.venue || '') + '</span>' +
        '<span class="dates__status dates__status--upcoming" data-i18n="dates.upcoming">Upcoming</span>' +
      '</div>';
    }).join('');
  }

  // Auto detect past shows; returns how many upcoming remain
  function markPast() {
    let upcomingCount = 0;
    document.querySelectorAll('.dates__row').forEach(row => {
      const parsed = parseDate(row.dataset.date);
      const statusEl = row.querySelector('.dates__status');
      if (parsed && parsed.getTime() < today.getTime()) {
        row.classList.add('dates__row--past');
        if (statusEl) {
          statusEl.textContent = 'Past';
          statusEl.setAttribute('data-i18n', 'dates.past');
          statusEl.classList.remove('dates__status--upcoming');
          statusEl.classList.add('dates__status--past');
        }
      } else {
        upcomingCount++;
      }
    });
    return upcomingCount;
  }

  // Interactive UI Filtering
  const filterBtns = document.querySelectorAll('.dates__filter-btn');

  function applyFilter(filter) {
    document.querySelectorAll('.dates__row').forEach(row => {
      const isPast = row.classList.contains('dates__row--past');
      if (filter === 'all') {
        row.style.display = '';
      } else if (filter === 'upcoming') {
        row.style.display = isPast ? 'none' : '';
      } else if (filter === 'past') {
        row.style.display = isPast ? '' : 'none';
      }
    });

    // Track analytics event
    if (typeof window !== 'undefined' && window.Analytics) {
      window.Analytics.track('dates_filter', { filter: filter });
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.filter);
    });
  });

  function finalize() {
    const upcoming = markPast();

    // If every show already happened, add a booking-open note
    if (upcoming === 0 && list && !list.querySelector('.dates__note')) {
      const note = document.createElement('div');
      note.className = 'dates__note';
      note.innerHTML = '<a href="#contact" data-i18n="dates.none">Nuevas fechas próximamente — bookings abiertos</a>';
      list.appendChild(note);
    }

    // Re-apply current language to freshly rendered nodes
    if (typeof window.applyLang === 'function') {
      window.applyLang(localStorage.getItem('kexxy-lang') || 'es');
    }

    applyFilter('all');
  }

  fetch('dates.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('fetch failed'))))
    .then(data => renderRows(data.dates || data))
    .catch(() => { /* keep static fallback rows */ })
    .finally(finalize);
})();

/* ============================================================
   PARALLAX
   ============================================================ */
const heroBg = document.getElementById('heroBg');

let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const factor  = 0.35;
      if (heroBg) {
        heroBg.style.transform = `translateY(${scrollY * factor}px)`;
      }
      ticking = false;
    });
    ticking = true;
  }
});

/* ============================================================
   PARTICLES
   ============================================================ */
(function initParticles() {
  const canvas  = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');
  let W, H, particles;

  const CONFIG = {
    count:      60,
    minSize:    0.5,
    maxSize:    2,
    minSpeed:   0.08,
    maxSpeed:   0.35,
    minOpacity: 0.03,
    maxOpacity: 0.18,
    colors:     ['#c8c8c8', '#aaaaaa', '#888888', '#ffffff'],
  };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createParticle() {
    return {
      x:       rand(0, W),
      y:       rand(0, H),
      size:    rand(CONFIG.minSize, CONFIG.maxSize),
      speedX:  rand(-CONFIG.maxSpeed, CONFIG.maxSpeed),
      speedY:  rand(-CONFIG.maxSpeed, -CONFIG.minSpeed),
      opacity: rand(CONFIG.minOpacity, CONFIG.maxOpacity),
      color:   CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
      pulse:   rand(0, Math.PI * 2),
      pulseSpeed: rand(0.005, 0.02),
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: CONFIG.count }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.pulse += p.pulseSpeed;
      const alpha = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < -10)        p.y = H + 10;
      if (p.x < -10)        p.x = W + 10;
      if (p.x > W + 10)     p.x = -10;
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
  });

  init();
  draw();
})();

/* ============================================================
   SCROLL INDICATOR — smooth scroll on click
   ============================================================ */
const scrollIndicator = document.getElementById('scrollIndicator');
if (scrollIndicator) {
  scrollIndicator.addEventListener('click', () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  });
}

/* ============================================================
   SUBTLE MOUSE PARALLAX on hero content
   ============================================================ */
(function mouseParallax() {
  const content = document.querySelector('.hero__content');
  if (!content) return;

  let mouseX = 0, mouseY = 0;
  let curX   = 0, curY   = 0;
  const strength = 8;

  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * strength;
    mouseY = (e.clientY / window.innerHeight - 0.5) * strength;
  });

  function animate() {
    curX += (mouseX - curX) * 0.06;
    curY += (mouseY - curY) * 0.06;
    content.style.transform = `translate(${curX * 0.4}px, ${curY * 0.4}px)`;
    requestAnimationFrame(animate);
  }

  animate();
})();

/* ============================================================
   BIO — SCROLL REVEAL (IntersectionObserver)
   ============================================================ */
(function bioReveal() {
  const revealEls = document.querySelectorAll('.reveal-left, .reveal-right');
  const borderLines = document.querySelectorAll('.bio__border-line--animated');

  if (!('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('in-view'));
    borderLines.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  const borderObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        borderObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  revealEls.forEach(el => observer.observe(el));
  borderLines.forEach(el => borderObserver.observe(el));
})();

/* ============================================================
   BIO — IMAGE PARALLAX on scroll
   ============================================================ */
(function bioParallax() {
  const bioImg = document.querySelector('.bio__img');
  if (!bioImg) return;

  let bioTicking = false;

  function updateBioParallax() {
    const section = document.getElementById('bio');
    if (!section) return;

    const rect     = section.getBoundingClientRect();
    const viewH    = window.innerHeight;
    const progress = (viewH - rect.top) / (viewH + rect.height);
    const offset   = (progress - 0.5) * 60;

    bioImg.style.transform = `translateY(${offset}px) scale(1.08)`;
    bioTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!bioTicking) {
      requestAnimationFrame(updateBioParallax);
      bioTicking = true;
    }
  });

  updateBioParallax();
})();

/* ============================================================
   RIDER — SCROLL REVEAL for reveal-up elements
   ============================================================ */
(function riderReveal() {
  const upEls = document.querySelectorAll('.reveal-up');
  if (!upEls.length) return;

  if (!('IntersectionObserver' in window)) {
    upEls.forEach(el => el.classList.add('in-view'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  upEls.forEach(el => obs.observe(el));
})();

/* ============================================================
   RIDER — WAVEFORM bar generator
   ============================================================ */
(function buildWaveform() {
  const container = document.getElementById('waveBars');
  if (!container) return;

  const count = 48;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const bar = document.createElement('div');
    bar.className = 'rcard__wave-bar';
    const h = Math.random() * 80 + 20;
    const dur = (Math.random() * 0.8 + 0.7).toFixed(2);
    const del = (Math.random() * 1.2).toFixed(2);
    bar.style.cssText = `height:${h}%;--dur:${dur}s;--del:${del}s`;
    fragment.appendChild(bar);
  }

  container.appendChild(fragment);
})();

/* ============================================================
   RIDER — background subtle parallax
   ============================================================ */
(function riderParallax() {
  const riderBg = document.getElementById('riderBg');
  if (!riderBg) return;

  let rTicking = false;

  function update() {
    const section = document.getElementById('rider');
    if (!section) return;
    const rect     = section.getBoundingClientRect();
    const viewH    = window.innerHeight;
    const progress = (viewH - rect.top) / (viewH + rect.height);
    const offset   = (progress - 0.5) * 50;
    riderBg.style.transform = `translateY(${offset}px)`;
    rTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!rTicking) {
      requestAnimationFrame(update);
      rTicking = true;
    }
  });

  update();
})();

/* ============================================================
   LIVE — background parallax
   ============================================================ */
(function liveParallax() {
  const liveBg  = document.getElementById('liveBg');
  const liveImg = document.querySelector('.live__img');
  if (!liveBg) return;

  let lTicking = false;

  function update() {
    const section = document.getElementById('live');
    if (!section) return;
    const rect     = section.getBoundingClientRect();
    const viewH    = window.innerHeight;
    const progress = (viewH - rect.top) / (viewH + rect.height);
    const offset   = (progress - 0.5) * 60;

    liveBg.style.transform = `translateY(${offset}px)`;

    if (liveImg) {
      liveImg.style.transform = `translateY(${offset * 0.3}px) scale(1.05)`;
    }

    lTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!lTicking) {
      requestAnimationFrame(update);
      lTicking = true;
    }
  });

  update();
})();

/* ============================================================
   MOBILE NAV — toggle on logo click
   ============================================================ */
(function mobileNav() {
  const toggle = document.getElementById('menuToggle');
  const nav    = document.getElementById('mobileNav');
  const close  = document.getElementById('menuClose');
  if (!toggle || !nav) return;

  function openNav() {
    nav.classList.add('is-open');
    nav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    nav.classList.remove('is-open');
    nav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  const mobileQuery = window.matchMedia('(max-width: 768px)');

  // On mobile the logo opens the menu; on desktop (where the nav is
  // already visible) it scrolls back to the top.
  function handleToggle() {
    if (mobileQuery.matches) {
      openNav();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggle.addEventListener('click', handleToggle);
  toggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); });
  close.addEventListener('click', closeNav);

  nav.querySelectorAll('.mobile-nav__link').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });
})();

/* ============================================================
   I18N — Translations & Language Switcher
   ============================================================ */
(function i18n() {

  const translations = {
    en: {
      'nav.bio':        'Bio',
      'nav.dates':      'Dates',
      'nav.rider':      'Rider',
      'nav.live':       'Live',
      'nav.about':      'About',
      'nav.contact':    'Contact',
      'dates.label':    'Upcoming Shows',
      'dates.upcoming': 'Upcoming',
      'dates.past':     'Past',
      'dates.all':      'All',
      'dates.none':     'New dates coming soon — bookings open',
      'listen.label':   'Latest Sets',
      'listen.link':    'See all sets on SoundCloud →',
      'live.festTitle': 'Promoters',
      'live.ctaBtn2':   'View Rider',
      'video.label':    'Media Showcase',
      'video.title':    'Live Action',
      'video.v1Label':  'Featured Live Set',
      'video.v1Title':  'KEXXY @ HAPPY SOUNDS',
      'video.v1Desc':   'Live performance video captured during HAPPY SOUNDS. A display of fast-paced hardgroove energy, dense layering, and drive. Personally, it was an enriching experience with a notably professional production. I like to highlight the attention of the "Happy Sounds" team who gave me great hospitality, allowing a better development of the set and my creativity.',
      'video.v2Label':  'DJ Set',
      'video.v2Title':  'KEXXY — Hard Techno Set',
      'video.v2Desc':   'A hard techno set with fast mixing and heavy structures. 100% CDJ mixing recorded in a private studio.',
      'video.v3Label':  'DJ Set',
      'video.v3Title':  'KEXXY — Hardgroove Set',
      'video.v3Desc':   'A hardgroove set with fast mixing and raw energy. 100% CDJ mixing recorded in a private studio.',
      'video.watchBtn': 'Watch on YouTube ↗',
      'hero.tag':       'Mendoza · Argentina',
      'hero.subtitle':  'TECHNO. HARD-TECHNO. HARD-GROOVE. RAW. BOUNCE.',
      'hero.desc':      'DJ from Argentina. Raw sound, fast mixing, dense layers.',
      'hero.cta1':      'Listen Now',
      'hero.cta2':      'Book KEXXY',
      'hero.stat1':     'Years of Experience',
      'hero.stat2':     'Cities',
      'bio.label':      'Biography',
      'bio.title':      'Biography.',
      'bio.p1':         "I'm a DJ and producer from Mendoza, Argentina; originated during the pandemic in 2020. This project began as a personal exploration of electronic music alongside my friends, in a creative space that quickly became a serious commitment to music.",
      'bio.p2':         "I seek to define my sound through fast mixing, dense layering, and heavy textures — an impulse inspired by Techno, Industrial, Schranz, Hardgroove and Raw. I'm obsessed with building physical and intense sets that prioritize energy and precision above all, reflected in reading the crowd.",
      'bio.p3':         "Over 6 years of trajectory, I've had the pleasure of presenting my sets in different parts of Mendoza and Buenos Aires. As well as sharing the booth with references of the Argentine scene like Dist, Raptis, Shodnan Ref, Uma Scheffer and West Code.",
      'rider.title':    'Artist Specifications',
      'rider.subtitle': 'Everything a promoter or booker needs to know.',
      'rider.label':    'Technical Rider & Profile',
      'rider.diagramCaption': 'Technical Setup — 2024',
      'rider.card1Title': 'Equipment',
      'rider.cdjSetup': 'CDJ Setup',
      'rider.mixer': 'Mixer',
      'rider.monitoring': 'Monitoring',
      'rider.card2Title': 'Performance',
      'rider.setDuration': 'Set Duration',
      'rider.bpmRange': 'BPM Range',
      'rider.format': 'Format',
      'rider.media': 'Media',
      'rider.formatsAccepted': 'Formats Accepted',
      'rider.stageSharing': 'Stage Sharing',
      'rider.soundcheck': 'Soundcheck',
      'rider.lighting': 'Lighting',
      'rider.stageSharingValue': 'No B2B unless pre-arranged',
      'rider.soundcheckValue': 'Required · Min 45 min prior',
      'rider.lightingValue': 'Dark stage preferred',
      'rider.card3Title': 'Music Profile',
      'rider.card4Title': 'Hospitality',
      'rider.hotel': 'Hotel',
      'rider.travel': 'Travel',
      'rider.catering': 'Catering',
      'rider.hotelValue': 'Single room · Night of show',
      'rider.travelValue': 'To be arranged with management',
      'rider.cateringValue': 'Water · Snacks backstage',
      'rider.card5Title': 'Press Downloads',
      'rider.pressKit': 'Full Press Kit',
      'rider.pressPhotos': 'Press Photos',
      'rider.techRiderBtn': 'Technical Rider',
      'rider.djMix': 'DJ Mix / Demo',
      'rider.viewOnPage': 'View on page',
      'live.label':     'Live Performance',
      'live.status':    'Available for booking',
      'live.stat1':     'Live Shows',
      'live.stat2':     'Cities',
      'live.stat3':     'Longest Set',
      'live.stat4':     'Avg Capacity',
      'live.ctaLabel':  'Ready to book me?',
      'live.ctaSub':    'Contact management for availability and fees.',
      'live.ctaBtn':    'Book a Show',
      'about.label':       'About Me',
      'about.title':       'The person behind the decks.',
      'about.p1':          "Beyond music and performances, I'm someone deeply curious about the world. I find inspiration in everyday moments, in connections with people, and in the constant pursuit of growth.",
      'about.p2':          "When I'm not behind a deck, I do programming work, sculpture and digital art (audio-reactive visuals, video editing, 3D modeling and rendering). I also enjoy photography and composition as hobbies.",
      'about.p3highlight': "I believe that authenticity is everything — both in life and in art.",
      'about.p3':          "This project is an extension of who I am: intense, passionate, and always seeking new experiences that challenge my perspective. My name is Enzo Díaz Zingaretti and I'm 24 years old.",
      'about.portfolioBtn':  'View My Portfolio',
      'about.ctaHint':       'Programming · Sculpture · Digital Art',
      'contact.label':       'Contact & Booking',
      'contact.title':       "Let's Connect.",
      'contact.subtitle':    'For bookings, press inquiries, and collaborations — reach out to me directly or use the form below.',
      'contact.fieldName':   'Name',
      'contact.fieldEmail':  'Email',
      'contact.fieldSubject':'Inquiry Type',
      'contact.fieldMsg':    'Message',
      'contact.fieldVenue':  'Venue / Event (optional)',
      'contact.optDefault':  'Select inquiry type',
      'contact.optBooking':  'Booking Request',
      'contact.optPress':    'Press / Media',
      'contact.optCollab':   'Collaboration',
      'contact.optOther':    'Other',
      'contact.placeholderName': 'Your name',
      'contact.placeholderVenue':'Venue name, city, date',
      'contact.placeholderMsg':  'Tell us about the event, expected attendance, lineup context...',
      'contact.formNote':    'We typically respond within 48 hours.',
      'contact.send':        'Send Message',
      'footer.copy':         '© 2026 KEXXY. All rights reserved. Unauthorized use prohibited.',
      'footer.privacy':      'Privacy',
      'footer.presskit':     'Press Kit',
      'footer.epk':          'EPK',
      'lightbox.download':   'Download High-Res',
    },
    es: {
      'nav.bio':        'Bio',
      'nav.dates':      'Fechas',
      'nav.rider':      'Rider',
      'nav.live':       'En Vivo',
      'nav.about':      'Sobre Mí',
      'nav.contact':    'Contacto',
      'dates.label':    'Próximas Fechas',
      'dates.upcoming': 'Próxima',
      'dates.past':     'Pasada',
      'dates.all':      'Todas',
      'dates.none':     'Nuevas fechas próximamente — bookings abiertos',
      'listen.label':   'Últimos Sets',
      'listen.link':    'Ver todos los sets en SoundCloud →',
      'live.festTitle': 'Productoras',
      'live.ctaBtn2':   'Ver Rider',
      'video.label':    'Galería de Sets',
      'video.title':    'En Acción',
      'video.v1Label':  'Set en Vivo Destacado',
      'video.v1Title':  'KEXXY @ HAPPY SOUNDS',
      'video.v1Desc':   'Video de la sesión capturada en vivo durante HAPPY SOUNDS. Una exhibición de energía hardgroove, mezclas rápidas y groove. En lo personal, fue una experiencia enriquecedora con una producción notablemente profesional. Me gusta destacar la atención del equipo "Happy Sounds" quienes me brindaron gran hospitalidad, permitiendo un mejor desarrollo del set y mi creatividad.',
      'video.v2Label':  'DJ Set',
      'video.v2Title':  'KEXXY — Hard Techno Set',
      'video.v2Desc':   'Un set de hard techno con mezclas rápidas y estructuras pesadas. 100% mezcla con CDJ grabado en un estudio privado.',
      'video.v3Label':  'DJ Set',
      'video.v3Title':  'KEXXY — Hardgroove Set',
      'video.v3Desc':   'Un set de hardgroove con mezclas rápidas y energía cruda. 100% mezcla con CDJ grabado en un estudio privado.',
      'video.watchBtn': 'Ver en YouTube ↗',
      'hero.tag':       'Mendoza · Argentina',
      'hero.subtitle':  'TECHNO. HARD-TECHNO. HARD-GROOVE. RAW. BOUNCE.',
      'hero.desc':      'DJ de Argentina. Sonido crudo, mezclas rápidas, capas densas.',
      'hero.cta1':      'Escuchar',
      'hero.cta2':      'Contratar KEXXY',
      'hero.stat1':     'Años de experiencia',
      'hero.stat2':     'Ciudades',
      'bio.label':      'Biografía',
      'bio.title':      'Biografía.',
      'bio.p1':         'Soy un DJ y productor de Mendoza, Argentina; originado durante la pandemia en 2020. Este proyecto comenzó como una exploración personal de la música electrónica junto a mis amigos, en un espacio creativo que, rápidamente, se convirtió en un compromiso serio con la música.',
      'bio.p2':         'Busco que mi sonido se defina por mezclas rápidas, layering denso y texturas pesadas — un impulso inspirado en el Techno, Industrial, Schranz, Hardgroove y Raw. Me obsesiona construir sets físicos e intensos que prioricen la energía y la precisión por encima de todo, reflejado en la lectura del público.',
      'bio.p3':         'En más de 6 años de trayectoria, he tenido el gusto de presentar mis sets en diferentes partes de Mendoza y Buenos Aires. Además de compartir cabina con referentes de la escena argentina como Dist, Raptis, Shodnan Ref, Uma Scheffer y West Code.',
      'rider.title':    'Especificaciones del Artista',
      'rider.subtitle': 'Todo lo que un promotor o booker necesita saber.',
      'rider.label':    'Rider Técnico y Perfil',
      'rider.diagramCaption': 'Setup Técnico — 2024',
      'rider.card1Title': 'Equipamiento',
      'rider.cdjSetup': 'Setup CDJ',
      'rider.mixer': 'Mixer',
      'rider.monitoring': 'Monitoreo',
      'rider.card2Title': 'Performance',
      'rider.setDuration': 'Duración del Set',
      'rider.bpmRange': 'Rango BPM',
      'rider.format': 'Formato',
      'rider.media': 'Medio',
      'rider.formatsAccepted': 'Formatos Aceptados',
      'rider.stageSharing': 'Compartir Escenario',
      'rider.soundcheck': 'Prueba de Sonido',
      'rider.lighting': 'Iluminación',
      'rider.stageSharingValue': 'Sin B2B salvo acuerdo previo',
      'rider.soundcheckValue': 'Obligatorio · Mín 45 min antes',
      'rider.lightingValue': 'Escenario oscuro preferido',
      'rider.card3Title': 'Perfil Musical',
      'rider.card4Title': 'Hospitalidad',
      'rider.hotel': 'Hotel',
      'rider.travel': 'Viaje',
      'rider.catering': 'Catering',
      'rider.hotelValue': 'Habitación individual · Noche del show',
      'rider.travelValue': 'A coordinar con management',
      'rider.cateringValue': 'Agua · Snacks backstage',
      'rider.card5Title': 'Descargas de Prensa',
      'rider.pressKit': 'Press Kit Completo',
      'rider.pressPhotos': 'Fotos de Prensa',
      'rider.techRiderBtn': 'Rider Técnico',
      'rider.djMix': 'DJ Mix / Demo',
      'rider.viewOnPage': 'Ver en página',
      'live.label':     'En Vivo',
      'live.status':    'Disponible para contratación',
      'live.stat1':     'Shows en Vivo',
      'live.stat2':     'Ciudades',
      'live.stat3':     'Set más largo',
      'live.stat4':     'Cap. Promedio',
      'live.ctaLabel':  '¿Listo para contratarme?',
      'live.ctaSub':    'Contactá al management para disponibilidad y tarifas.',
      'live.ctaBtn':    'Contratar Show',
      'about.label':       'Sobre Mí',
      'about.title':       'La persona detrás de los decks.',
      'about.p1':          'Más allá de la música y las presentaciones, soy alguien profundamente curioso sobre el mundo. Encuentro inspiración en los momentos cotidianos, en las conexiones con las personas y en la búsqueda constante de crecimiento.',
      'about.p2':          'Cuando no estoy detrás de un deck, realizo trabajos de programación, escultura y arte digital (visuales audiorítmicas, edición de video, modelado y renderizado 3D). Además disfruto hobbiealmente de la fotografía y composición.',
      'about.p3highlight': 'Creo que la autenticidad lo es todo — tanto en la vida como en el arte.',
      'about.p3':          'Este proyecto es una extensión de quien soy: intenso, apasionado, y siempre buscando nuevas experiencias que desafíen mi perspectiva. Mi nombre es Enzo Díaz Zingaretti y tengo 24 años.',
      'about.portfolioBtn':  'Ver Mi Portfolio',
      'about.ctaHint':       'Programación · Escultura · Arte Digital',
      'contact.label':       'Contacto y Contratación',
      'contact.title':       "Conectemos.",
      'contact.subtitle':    'Para contrataciones, consultas de prensa y colaboraciones — escribime directo o podes usar el formulario.',
      'contact.fieldName':   'Nombre',
      'contact.fieldEmail':  'Email',
      'contact.fieldSubject':'Tipo de consulta',
      'contact.fieldMsg':    'Mensaje',
      'contact.fieldVenue':  'Venue / Evento (opcional)',
      'contact.optDefault':  'Seleccioná el tipo de consulta',
      'contact.optBooking':  'Solicitud de contratación',
      'contact.optPress':    'Prensa / Medios',
      'contact.optCollab':   'Colaboración',
      'contact.optOther':    'Otro',
      'contact.placeholderName': 'Tu nombre',
      'contact.placeholderVenue':'Nombre del venue, ciudad, fecha',
      'contact.placeholderMsg':  'Contanos sobre el evento, capacidad estimada, contexto del lineup...',
      'contact.formNote':    'Respondemos en un máximo de 48 horas.',
      'contact.send':        'Enviar Mensaje',
      'footer.copy':         '© 2026 KEXXY. Todos los derechos reservados.',
      'footer.privacy':      'Privacidad',
      'footer.presskit':     'Press Kit',
      'footer.epk':          'EPK',
      'lightbox.download':   'Descargar Alta Res.',
    },
    pt: {
      'nav.bio':        'Bio',
      'nav.dates':      'Datas',
      'nav.rider':      'Rider',
      'nav.live':       'Ao Vivo',
      'nav.about':      'Sobre Mim',
      'nav.contact':    'Contato',
      'dates.label':    'Próximas Datas',
      'dates.upcoming': 'Em breve',
      'dates.past':     'Passada',
      'dates.all':      'Todas',
      'dates.none':     'Novas datas em breve — bookings abertos',
      'listen.label':   'Últimos Sets',
      'listen.link':    'Ver todos os sets no SoundCloud →',
      'live.festTitle': 'Produtoras',
      'live.ctaBtn2':   'Ver Rider',
      'video.label':    'Galeria de Sets',
      'video.title':    'Em Ação',
      'video.v1Label':  'Set ao Vivo em Destaque',
      'video.v1Title':  'KEXXY @ HAPPY SOUNDS',
      'video.v1Desc':   'Vídeo da sessão capturada ao vivo durante HAPPY SOUNDS. Uma exibição de energia hardgroove, mixagens rápidas e groove. Pessoalmente, foi uma experiência enriquecedora com uma produção notavelmente profissional. Gosto de destacar a atenção da equipe "Happy Sounds" que me proporcionou grande hospitalidade, permitindo um melhor desenvolvimento do set e minha criatividade.',
      'video.v2Label':  'DJ Set',
      'video.v2Title':  'KEXXY — Hard Techno Set',
      'video.v2Desc':   'Um set de hard techno com mixagens rápidas e estruturas pesadas. 100% mixagem com CDJ gravado em um estúdio privado.',
      'video.v3Label':  'DJ Set',
      'video.v3Title':  'KEXXY — Hardgroove Set',
      'video.v3Desc':   'Um set de hardgroove com mixagens rápidas e energia crua. 100% mixagem com CDJ gravado em um estúdio privado.',
      'video.watchBtn': 'Assistir no YouTube ↗',
      'hero.tag':       'Mendoza · Argentina',
      'hero.subtitle':  'TECHNO. HARD-TECHNO. HARD-GROOVE. RAW. BOUNCE.',
      'hero.desc':      'DJ da Argentina. Som cru, mixagens rápidas, camadas densas.',
      'hero.cta1':      'Ouvir Agora',
      'hero.cta2':      'Contratar KEXXY',
      'hero.stat1':     'Anos de experiência',
      'hero.stat2':     'Cidades',
      'bio.label':      'Biografia',
      'bio.title':      'Biografia.',
      'bio.p1':         'Sou um DJ e produtor de Mendoza, Argentina; originado durante a pandemia em 2020. Este projeto começou como uma exploração pessoal da música eletrônica junto com meus amigos, num espaço criativo que, rapidamente, se tornou um compromisso sério com a música.',
      'bio.p2':         'Busco definir meu som por meio de mixagens rápidas, layering denso e texturas pesadas — um impulso inspirado no Techno, Industrial, Schranz, Hardgroove e Raw. Me obceciona construir sets físicos e intensos que priorizem energia e precisão acima de tudo, refletido na leitura do público.',
      'bio.p3':         'Em mais de 6 anos de trajetória, tive o prazer de apresentar meus sets em diferentes partes de Mendoza e Buenos Aires. Além de dividir a cabine com referências da cena argentina como Dist, Raptis, Shodnan Ref, Uma Scheffer e West Code.',
      'rider.title':    'Especificações do Artista',
      'rider.subtitle': 'Tudo que um promotor ou booker precisa saber.',
      'rider.label':    'Rider Técnico e Perfil',
      'rider.diagramCaption': 'Setup Técnico — 2024',
      'rider.card1Title': 'Equipamento',
      'rider.cdjSetup': 'Setup CDJ',
      'rider.mixer': 'Mixer',
      'rider.monitoring': 'Monitoramento',
      'rider.card2Title': 'Performance',
      'rider.setDuration': 'Duração do Set',
      'rider.bpmRange': 'Faixa BPM',
      'rider.format': 'Formato',
      'rider.media': 'Mídia',
      'rider.formatsAccepted': 'Formatos Aceitos',
      'rider.stageSharing': 'Compartir Palco',
      'rider.soundcheck': 'Passagem de Som',
      'rider.lighting': 'Iluminação',
      'rider.stageSharingValue': 'Sem B2B exceto acordo prévio',
      'rider.soundcheckValue': 'Obrigatório · Mín 45 min antes',
      'rider.lightingValue': 'Palco escuro preferido',
      'rider.card3Title': 'Perfil Musical',
      'rider.card4Title': 'Hospitalidade',
      'rider.hotel': 'Hotel',
      'rider.travel': 'Viagem',
      'rider.catering': 'Catering',
      'rider.hotelValue': 'Quarto individual · Noite do show',
      'rider.travelValue': 'A combinar com management',
      'rider.cateringValue': 'Água · Snacks backstage',
      'rider.card5Title': 'Downloads de Imprensa',
      'rider.pressKit': 'Press Kit Completo',
      'rider.pressPhotos': 'Fotos de Imprensa',
      'rider.techRiderBtn': 'Rider Técnico',
      'rider.djMix': 'DJ Mix / Demo',
      'rider.viewOnPage': 'Ver na página',
      'live.label':     'Ao Vivo',
      'live.status':    'Disponível para contratação',
      'live.stat1':     'Shows ao Vivo',
      'live.stat2':     'Cidades',
      'live.stat3':     'Maior Set',
      'live.stat4':     'Cap. Média',
      'live.ctaLabel':  'Pronto para me contratar?',
      'live.ctaSub':    'Entre em contato com o management para disponibilidade e cachês.',
      'live.ctaBtn':    'Contratar Show',
      'about.label':       'Sobre Mim',
      'about.title':       'A pessoa por trás dos decks.',
      'about.p1':          'Além da música e das apresentações, sou alguém profundamente curioso sobre o mundo. Encontro inspiração nos momentos cotidianos, nas conexões com as pessoas e na busca constante por crescimento.',
      'about.p2':          'Quando não estou atrás de um deck, realizo trabalhos de programação, escultura e arte digital (visuais audiorítmicas, edição de vídeo, modelagem e renderização 3D). Além disso, aproveito a fotografia e composição como hobbies.',
      'about.p3highlight': 'Acredito que a autenticidade é tudo — tanto na vida quanto na arte.',
      'about.p3':          'Este projeto é uma extensão de quem eu sou: intenso, apaixonado, e sempre buscando novas experiências que desafiem minha perspectiva. Meu nome é Enzo Díaz Zingaretti e tenho 24 anos.',
      'about.portfolioBtn':  'Ver Meu Portfolio',
      'about.ctaHint':       'Programação · Escultura · Arte Digital',
      'contact.label':       'Contato e Contratação',
      'contact.title':       "Conectemos.",
      'contact.subtitle':    'Para contratações, assessoria de imprensa e colaborações — fale comigo diretamente ou use o formulário.',
      'contact.fieldName':   'Nome',
      'contact.fieldEmail':  'E-mail',
      'contact.fieldSubject':'Tipo de consulta',
      'contact.fieldMsg':    'Mensagem',
      'contact.fieldVenue':  'Venue / Evento (opcional)',
      'contact.optDefault':  'Selecione o tipo de consulta',
      'contact.optBooking':  'Solicitação de contratação',
      'contact.optPress':    'Imprensa / Mídia',
      'contact.optCollab':   'Colaboração',
      'contact.optOther':    'Outro',
      'contact.placeholderName': 'Seu nome',
      'contact.placeholderVenue':'Nome do venue, cidade, data',
      'contact.placeholderMsg':  'Conte-nos sobre o evento, capacidade esperada, contexto do lineup...',
      'contact.formNote':    'Respondemos em até 48 horas.',
      'contact.send':        'Enviar Mensagem',
      'footer.copy':         '© 2026 KEXXY. Todos los direitos reservados.',
      'footer.privacy':      'Privacidade',
      'footer.presskit':     'Press Kit',
      'footer.epk':          'EPK',
      'lightbox.download':   'Baixar Alta Res.',
    }
  };

  // Remote content (content.json) overrides these built-in defaults.
  // Built-ins stay as the offline/fetch-failure fallback.
  let remote = null;

  function dict(lang) {
    const base = translations[lang] || translations['en'];
    const over = remote && remote.i18n && remote.i18n[lang];
    return over ? Object.assign({}, base, over) : base;
  }

  function applyLang(lang) {
    const t = dict(lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) {
        // Use innerHTML only when translation contains HTML markup (e.g. contact.title)
        if (/<[a-z][\s\S]*>/i.test(t[key])) {
          el.innerHTML = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.placeholder = t[key];
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('kexxy-lang', lang);
  }

  /* --- Language-independent artist data from content.json --- */
  function setText(sel, value) {
    if (value == null) return;
    document.querySelectorAll(sel).forEach(el => { el.textContent = value; });
  }

  function applyArtist(data) {
    const a = data.artist || {};

    if (a.name) {
      const word = document.querySelector('.hero__name-word');
      if (word) {
        word.textContent = a.name;
        word.setAttribute('data-text', a.name);
      }
      setText('.contact__info-name, .contact__footer-logo', a.name);
    }

    if (a.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
        const showsEmail = /@/.test(el.textContent);
        el.setAttribute('href', 'mailto:' + a.email);
        if (showsEmail) el.textContent = a.email;
      });
    }

    setText('.contact__info-phone', a.location);

    const s = a.socials || {};
    const socialMap = { Instagram: s.instagram, SoundCloud: s.soundcloud, YouTube: s.youtube };
    Object.keys(socialMap).forEach(label => {
      if (!socialMap[label]) return;
      document.querySelectorAll('.contact__social[aria-label="' + label + '"]').forEach(el => {
        el.setAttribute('href', socialMap[label]);
      });
    });

    // Links that repeat across the page (CTAs, footer, rider downloads)
    if (s.soundcloud) {
      document.querySelectorAll('a[href*="soundcloud.com"]').forEach(el => {
        el.setAttribute('href', s.soundcloud);
      });
    }
    if (a.pressKit) {
      document.querySelectorAll('a[href*="drive.google.com"]').forEach(el => {
        el.setAttribute('href', a.pressKit);
      });
    }
    // NOTE: .footer-credit is deliberately excluded — that link is the
    // template author's signature and stays put for every artist.
    if (a.portfolio) {
      document.querySelectorAll('.about__portfolio-btn').forEach(el => {
        el.setAttribute('href', a.portfolio);
      });
    }

    // Stats — hero pair and live column (live values keep their unit span)
    const st = data.stats || {};
    const heroNums = document.querySelectorAll('.hero__stat-num');
    if (heroNums[0] && st.heroYears) heroNums[0].textContent = st.heroYears;
    if (heroNums[1] && st.heroCities) heroNums[1].textContent = st.heroCities;

    const liveVals = document.querySelectorAll('.live__stat-val');
    [st.liveShows, st.liveCities, st.liveLongestSet].forEach((raw, i) => {
      if (!raw || !liveVals[i]) return;
      const m = String(raw).match(/^(\d+)(.*)$/);
      const num = m ? m[1] : String(raw);
      const unit = m ? m[2] : '';
      liveVals[i].innerHTML = '';
      liveVals[i].appendChild(document.createTextNode(num));
      if (unit) {
        const span = document.createElement('span');
        span.className = 'live__stat-unit';
        span.textContent = unit;
        liveVals[i].appendChild(span);
      }
    });

    // Genre chips (bio tag strip + rider music card)
    if (Array.isArray(data.genres) && data.genres.length) {
      const bioTags = document.querySelector('.bio__tags');
      if (bioTags) {
        bioTags.innerHTML = '';
        data.genres.forEach(g => {
          const el = document.createElement('span');
          el.className = 'bio__tag';
          el.textContent = g;
          bioTags.appendChild(el);
        });
      }
      const riderGenres = document.querySelector('.rcard__genres');
      if (riderGenres) {
        riderGenres.innerHTML = '';
        data.genres.forEach((g, i) => {
          const el = document.createElement('span');
          el.className = 'rcard__genre' + (i === 0 ? ' rcard__genre--primary' : '');
          el.textContent = g;
          riderGenres.appendChild(el);
        });
      }
    }

    // Promoters list
    if (Array.isArray(data.promoters) && data.promoters.length) {
      const list = document.querySelector('.live__fest-list');
      if (list) {
        list.innerHTML = '';
        data.promoters.forEach(p => {
          const li = document.createElement('li');
          li.className = 'live__fest-item';
          const name = document.createElement('span');
          name.className = 'live__fest-name';
          name.textContent = p.name || '';
          const meta = document.createElement('span');
          meta.className = 'live__fest-meta';
          meta.textContent = p.meta || '';
          li.appendChild(name);
          li.appendChild(meta);
          list.appendChild(li);
        });
      }
    }
  }

  const USER_LANG_KEY = 'kexxy-lang-user';

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      localStorage.setItem(USER_LANG_KEY, lang);
      applyLang(lang);
    });
  });

  const saved = localStorage.getItem(USER_LANG_KEY) || localStorage.getItem('kexxy-lang') || 'es';
  applyLang(saved);

  // Expose for external modules (language auto-detection)
  window.applyLang = applyLang;

  /* --- Which languages the artist offers (content.json > languages) --- */
  const ALL_LANGS = ['es', 'en', 'pt'];

  function resolveLanguages(data) {
    const cfg = (data && data.languages) || {};
    let enabled = Array.isArray(cfg.enabled)
      ? cfg.enabled.filter(l => ALL_LANGS.indexOf(l) !== -1)
      : ALL_LANGS.slice();
    if (!enabled.length) enabled = ['es'];

    const fallback = enabled.indexOf(cfg.default) !== -1 ? cfg.default : enabled[0];

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.style.display = enabled.indexOf(btn.getAttribute('data-lang')) !== -1 ? '' : 'none';
    });
    // A single language needs no switcher at all
    document.querySelectorAll('.lang-switcher, .mobile-nav__lang').forEach(el => {
      el.style.display = enabled.length > 1 ? '' : 'none';
    });

    window.__kexxyLangs = enabled;

    const chosen = localStorage.getItem(USER_LANG_KEY);
    return enabled.indexOf(chosen) !== -1 ? chosen : fallback;
  }

  fetch('content.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error('no content.json'))))
    .then(data => {
      remote = data;
      applyArtist(data);
      applyLang(resolveLanguages(data));
    })
    .catch(() => { /* built-in text stays */ });

})();

/* ============================================================
   CONTACT — image parallax
   ============================================================ */
(function contactParallax() {
  const wrap = document.getElementById('contactImgWrap');
  if (!wrap) return;

  let cTicking = false;

  function update() {
    const section = document.getElementById('contact');
    if (!section) return;
    const rect     = section.getBoundingClientRect();
    const viewH    = window.innerHeight;
    const progress = (viewH - rect.top) / (viewH + rect.height);
    const offset   = (progress - 0.5) * 50;
    wrap.style.transform = `translateY(${offset}px)`;
    cTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!cTicking) {
      requestAnimationFrame(update);
      cTicking = true;
    }
  });

  update();
})();

/* ============================================================
   TOAST NOTIFICATIONS SYSTEM
   ============================================================ */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(message, type = 'info', duration = 5000) {
    if (!this.container) this.init();
    if (!this.container) return;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="#c8c8c8" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type]}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Close notification">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    toast.querySelector('.toast__close').addEventListener('click', () => {
      this.hide(toast);
    });

    this.container.appendChild(toast);
    setTimeout(() => this.hide(toast), duration);
  },

  hide(toast) {
    toast.style.animation = 'toastFadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }
};

document.addEventListener('DOMContentLoaded', () => Toast.init());

/* ============================================================
   BACK TO TOP BUTTON
   ============================================================ */
(function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  const scrollThreshold = 500;

  function toggleVisibility() {
    if (window.scrollY > scrollThreshold) {
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    requestAnimationFrame(toggleVisibility);
  });

  toggleVisibility();
})();

/* ============================================================
   READING PROGRESS INDICATOR
   ============================================================ */
(function initReadingProgress() {
  const progressBar = document.getElementById('readingProgress');
  if (!progressBar) return;

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  window.addEventListener('scroll', () => {
    requestAnimationFrame(updateProgress);
  });

  updateProgress();
})();

/* ============================================================
   LANGUAGE AUTO-DETECTION
   ============================================================ */
(function initLangDetection() {
  if (localStorage.getItem('kexxy-lang')) return;

  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();

  const langMap = {
    'es': 'es',
    'en': 'en',
    'pt': 'pt',
    'br': 'pt'
  };

  const targetLang = langMap[langCode] || 'en';

  const allowed = window.__kexxyLangs;
  if (allowed && allowed.indexOf(targetLang) === -1) return;

  if (targetLang !== 'es' && typeof window.applyLang === 'function') {
    window.applyLang(targetLang);
  }
})();

/* ============================================================
   ANALYTICS - Simple Event Tracking
   ============================================================ */
const Analytics = {
  events: [],
  maxEvents: 100,

  track(eventName, eventData = {}) {
    const event = {
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    };

    this.events.push(event);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[Analytics]', event);
    }

    // Send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, eventData);
    }

    // Send to Plausible if available
    if (typeof plausible !== 'undefined') {
      plausible(eventName, { props: eventData });
    }
  },

  trackClick(element, eventName) {
    element.addEventListener('click', () => {
      this.track(eventName, {
        element: element.tagName,
        href: element.href || null,
        text: element.textContent?.trim().substring(0, 50) || null
      });
    });
  },

  getEvents() {
    return [...this.events];
  }
};

// Track important interactions
document.addEventListener('DOMContentLoaded', () => {
  // Track CTA buttons
  document.querySelectorAll('.btn--primary').forEach(btn => {
    Analytics.trackClick(btn, 'cta_click');
  });

  // Track navigation
  document.querySelectorAll('.hero__nav a, .mobile-nav__link').forEach(link => {
    Analytics.trackClick(link, 'nav_click');
  });

  // Track downloads
  document.querySelectorAll('.rcard__dl-btn').forEach(btn => {
    Analytics.trackClick(btn, 'download_click');
  });

  // Track social links
  document.querySelectorAll('.contact__social').forEach(link => {
    Analytics.trackClick(link, 'social_click');
  });

  // Track form submission
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      Analytics.track('form_submit', { form: 'contact' });
    });

    // Real-time Validation input listeners
    const inputs = contactForm.querySelectorAll('.contact__input');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        input.parentElement.classList.remove('contact__field--error');
      });
      input.addEventListener('blur', () => {
        if (input.required || input.id === 'cf-email') {
          if (input.value.trim() === '') {
            input.parentElement.classList.add('contact__field--error');
          } else if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value.trim())) {
              input.parentElement.classList.add('contact__field--error');
            }
          }
        }
      });
    });
  }

  // Track language changes
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Analytics.track('language_change', { lang: btn.dataset.lang });
    });
  });

  // Track scroll depth
  let maxScroll = 0;
  const scrollMilestones = [25, 50, 75, 90];
  const reachedMilestones = new Set();

  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    maxScroll = Math.max(maxScroll, scrollPercent);

    scrollMilestones.forEach(milestone => {
      if (scrollPercent >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone);
        Analytics.track('scroll_depth', { depth: milestone });
      }
    });
  });

  // Track time on page
  const pageLoadTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
    Analytics.track('page_exit', { time_on_page_seconds: timeOnPage });
  });

  // Make Analytics available globally
  window.Analytics = Analytics;
});

/* ============================================================
   LIGHTBOX GALLERY INTERACTION
   ============================================================ */
(function initLightbox() {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const downloadBtn = document.getElementById('lightboxDownload');
  const closeBtn = document.getElementById('lightboxClose');

  if (!modal || !img) return;

  // Select all zoomable images in the site
  const targets = document.querySelectorAll('.bio__img, .live__img, .contact__img');

  targets.forEach(target => {
    target.addEventListener('click', () => {
      const src = target.src;
      const alt = target.alt || 'KEXXY press photo';
      
      // Update modal content
      img.src = src;
      img.alt = alt;
      caption.textContent = alt;
      downloadBtn.href = src;

      // Open Modal
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Analytics
      if (typeof window !== 'undefined' && window.Analytics) {
        window.Analytics.track('lightbox_open', { image: src });
      }
    });
  });

  function closeLightbox() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Clear heavy sources after animation closes
    setTimeout(() => {
      img.src = '';
    }, 300);
  }

  // Close Event Listeners
  closeBtn.addEventListener('click', closeLightbox);
  modal.addEventListener('click', (e) => {
    // Close if clicking outside the main image / download button
    if (e.target === modal) {
      closeLightbox();
    }
  });

  // Keyboard support (Escape key)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeLightbox();
    }
  });
})();


/* ============================================================
   ADMIN EASTER EGG — type "kexxy" anywhere to open the panel
   ============================================================ */
(function adminShortcut() {
  const SECRET = 'kexxy';
  let buffer = '';

  document.addEventListener('keydown', e => {
    // Ignore typing inside form fields
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (!e.key || e.key.length !== 1) return;

    buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
    if (buffer === SECRET) {
      window.location.href = 'admin.html';
    }
  });
})();

/* ============================================================
   TEMPLATE CREDIT — kept in the footer for every artist
   ============================================================ */
(function footerCredit() {
  const CREDIT_URL = 'https://portfolio-kexxy.vercel.app';
  const CREDIT_NAME = 'Enzo Díaz Zingaretti';

  function ensure() {
    const holder = document.querySelector('.contact__footer-copy');
    if (!holder || holder.querySelector('.footer-credit')) return;

    const span = document.createElement('span');
    span.className = 'footer-credit';
    span.id = 'footerCredit';
    span.appendChild(document.createTextNode('Website by '));

    const link = document.createElement('a');
    link.href = CREDIT_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = CREDIT_NAME;

    span.appendChild(link);
    holder.appendChild(span);
  }

  ensure();
  // Language switches re-render footer text; re-check afterwards
  document.addEventListener('click', e => {
    if (e.target.closest('.lang-btn')) setTimeout(ensure, 0);
  });
})();
