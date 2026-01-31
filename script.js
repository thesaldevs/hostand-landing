(() => {
  'use strict';

  /** @type {any} */
  let cfg = null;
  let currentLang = 'en';
  /** @type {number | null} */
  let heroIntervalId = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeArray = (v) => (Array.isArray(v) ? v : []);

  function setCssVar(name, value) {
    if (value === undefined || value === null || value === '') return;
    document.documentElement.style.setProperty(name, String(value));
  }

  function normalizeLanguages(config) {
    const list = config?.languages;

    if (Array.isArray(list) && list.length) {
      return list
        .map((l) => {
          if (typeof l === 'string') return { code: l, label: l.toUpperCase() };
          if (l && typeof l === 'object' && l.code) {
            return { code: l.code, label: (l.label || l.code).toUpperCase() };
          }
          return null;
        })
        .filter(Boolean);
    }

    const keys = config?.i18n ? Object.keys(config.i18n) : [];
    if (keys.length) return keys.map((code) => ({ code, label: code.toUpperCase() }));

    return [{ code: 'en', label: 'EN' }];
  }

  function applyI18n(lang) {
    if (!cfg?.i18n) return;

    const fallbackLang = cfg.defaultLang || 'en';
    const dictionaries = cfg.i18n;
    const current = dictionaries[lang] || dictionaries[fallbackLang] || {};

    $$('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;

      const value = current[key];
      if (typeof value === 'undefined') return;

      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value;
      } else {
        el.innerHTML = value;
      }
    });

    document.documentElement.lang = lang;
  }

  function syncLanguageSelects(lang) {
    const top = $('#languageSelectTop');
    const menu = $('#languageSelectMenu');
    if (top) top.value = lang;
    if (menu) menu.value = lang;
  }

  function setLanguage(lang) {
    currentLang = lang;
    applyI18n(lang);
    syncLanguageSelects(lang);
    reloadKrossWidget(lang);
  }

  function buildHeader(config) {
    // logo
    const logo = $('#siteLogo');
    if (logo) {
      if (config.logo) logo.src = config.logo;
      logo.alt = config.siteTitle || 'Logo';
    }

    const navbar = $('#navbar');
    if (!navbar) return;

    navbar.innerHTML = '';

    // nav links
    safeArray(config.nav).forEach((item) => {
      if (!item || !item.href) return;

      const a = document.createElement('a');
      a.href = item.href;

      if (item.labelKey) a.setAttribute('data-i18n', item.labelKey);
      else a.textContent = item.label || item.href;

      navbar.appendChild(a);
    });

    // language select in the fullscreen menu (mobile)
    const langWrap = document.createElement('div');
    langWrap.className = 'language-switcher-menu';

    const menuSelect = document.createElement('select');
    menuSelect.id = 'languageSelectMenu';
    menuSelect.setAttribute('aria-label', 'Language');
    langWrap.appendChild(menuSelect);

    navbar.appendChild(langWrap);

    // populate language selects
    const languages = normalizeLanguages(config);
    const topSelect = $('#languageSelectTop');
    if (topSelect) topSelect.innerHTML = '';
    menuSelect.innerHTML = '';

    languages.forEach(({ code, label }) => {
      const optMenu = document.createElement('option');
      optMenu.value = code;
      optMenu.textContent = label;
      menuSelect.appendChild(optMenu);

      if (topSelect) {
        const optTop = document.createElement('option');
        optTop.value = code;
        optTop.textContent = label;
        topSelect.appendChild(optTop);
      }
    });

    // handlers
    if (topSelect) {
      topSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }
    menuSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  }

  function buildIntro(config) {
    const section = $('#intro');
    if (!section) return;

    section.innerHTML = '';

    const keys = safeArray(config?.sections?.intro);
    const introKeys = keys.length ? keys : ['intro_1', 'intro_2'];

    introKeys.forEach((key) => {
      const p = document.createElement('p');
      p.setAttribute('data-i18n', key);
      section.appendChild(p);
    });
  }

  function buildAmenities(config) {
    const section = $('#intro-stanze');
    if (!section) return;

    section.innerHTML = '';

    const titleKey = config?.sections?.amenities?.titleKey || 'our_apt';
    const subtitleKey = config?.sections?.amenities?.subtitleKey || 'apt_desc';

    const h2 = document.createElement('h2');
    h2.setAttribute('data-i18n', titleKey);

    const p = document.createElement('p');
    p.setAttribute('data-i18n', subtitleKey);

    section.appendChild(h2);
    section.appendChild(p);

    // IMPORTANT: keep this as the direct child <div> because CSS uses #intro-stanze > div
    const wrap = document.createElement('div');
    section.appendChild(wrap);

    safeArray(config.amenities).forEach((am) => {
      if (!am) return;

      const item = document.createElement('div');
      item.className = 'room-service';

      // icon
      if (am.icon?.type === 'fa') {
        const i = document.createElement('i');
        i.className = am.icon.class || '';
        item.appendChild(i);
      } else {
        const i = document.createElement('i');
        i.className = 'material-icons-outlined service-icon';
        i.textContent = am.icon?.name || am.icon || 'star';
        item.appendChild(i);
      }

      // title
      const h3 = document.createElement('h3');
      if (am.titleKey) h3.setAttribute('data-i18n', am.titleKey);
      else h3.textContent = am.title || '';
      item.appendChild(h3);

      // description
      const desc = document.createElement('p');
      if (am.descKey) desc.setAttribute('data-i18n', am.descKey);
      else desc.textContent = am.desc || '';
      item.appendChild(desc);

      wrap.appendChild(item);
    });
  }

  function buildRooms(config) {
    const section = $('#slider');
    if (!section) return;

    section.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'slider-container';

    const cardSlider = document.createElement('div');
    cardSlider.className = 'card-slider';
    cardSlider.id = 'cardSlider';

    container.appendChild(cardSlider);
    section.appendChild(container);

    safeArray(config.rooms).forEach((room, idx) => {
      if (!room) return;

      const card = document.createElement('div');
      card.className = 'card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');

      card.dataset.roomIndex = String(idx);
      if (room.id) card.dataset.roomId = room.id;
      if (room.coverImage) card.style.backgroundImage = `url('${room.coverImage}')`;

      const h3 = document.createElement('h3');
      if (room.titleKey) h3.setAttribute('data-i18n', room.titleKey);
      else h3.textContent = room.title || '';

      const p = document.createElement('p');
      if (room.descKey) p.setAttribute('data-i18n', room.descKey);
      else p.textContent = room.desc || '';

      card.appendChild(h3);
      card.appendChild(p);
      cardSlider.appendChild(card);
    });

    // click / keyboard open gallery (event delegation)
    cardSlider.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;

      const roomId = card.dataset.roomId;
      const roomIndex = Number.parseInt(card.dataset.roomIndex || '', 10);
      const room = roomId
        ? safeArray(cfg?.rooms).find((r) => r && r.id === roomId)
        : (Number.isFinite(roomIndex) ? safeArray(cfg?.rooms)[roomIndex] : null);
      if (room) openGallery(room);
    });

    cardSlider.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.card');
      if (!card) return;

      e.preventDefault();
      const roomId = card.dataset.roomId;
      const roomIndex = Number.parseInt(card.dataset.roomIndex || '', 10);
      const room = roomId
        ? safeArray(cfg?.rooms).find((r) => r && r.id === roomId)
        : (Number.isFinite(roomIndex) ? safeArray(cfg?.rooms)[roomIndex] : null);
      if (room) openGallery(room);
    });
  }

  function buildBooking(config) {
    const section = $('#prenota');
    if (!section) return;

    section.innerHTML = '';

    const subtitleKey = config?.sections?.booking?.subtitleKey || 'book_now';
    const titleKey = config?.sections?.booking?.titleKey || 'book';

    const p = document.createElement('p');
    p.setAttribute('data-i18n', subtitleKey);

    const h2 = document.createElement('h2');
    h2.setAttribute('data-i18n', titleKey);

    section.appendChild(p);
    section.appendChild(h2);

    // Kross container (widget is injected by JS)
    const kross = document.createElement('div');
    kross.className = 'kross-container';
    section.appendChild(kross);
  }

  function buildMapSection(config) {
    const section = $('#map');
    if (!section) return;

    section.innerHTML = '';

    const titleKey = config?.sections?.map?.titleKey || 'our_location';

    const h2 = document.createElement('h2');
    h2.setAttribute('data-i18n', titleKey);
    section.appendChild(h2);

    const mapDiv = document.createElement('div');
    mapDiv.id = 'mapid';
    section.appendChild(mapDiv);
  }

  function buildTestimonials(config) {
    const section = $('#testimonials');
    if (!section) return;

    section.innerHTML = '';

    const titleKey = config?.sections?.testimonials?.titleKey || 'exclusive_services';

    const h2 = document.createElement('h2');
    h2.setAttribute('data-i18n', titleKey);
    section.appendChild(h2);

    const wrap = document.createElement('div');
    wrap.className = 'testimonials-wrapper';
    section.appendChild(wrap);

    safeArray(config.testimonials).forEach((t) => {
      const item = document.createElement('div');
      item.className = 'testimonial-item';

      const p = document.createElement('p');
      if (typeof t === 'string') {
        p.setAttribute('data-i18n', t);
      } else if (t && typeof t === 'object') {
        if (t.key) p.setAttribute('data-i18n', t.key);
        else if (t.text) p.textContent = t.text;
      }

      item.appendChild(p);
      wrap.appendChild(item);
    });
  }

  function buildLegacyContacts(config) {
    const out = [];

    if (config.whatsapp) {
      const digits = String(config.whatsapp).replace(/[^0-9]/g, '');
      out.push({
        icon: { type: 'fa', class: 'fab fa-whatsapp' },
        label: config.whatsappLabel || config.whatsapp,
        href: `https://wa.me/${digits}`,
        target: '_blank',
        rel: 'noopener'
      });
    }

    if (config.contactEmail) {
      out.push({
        icon: { type: 'material', name: 'email' },
        label: config.contactEmail,
        href: `mailto:${config.contactEmail}`
      });
    }

    if (config.instagram) {
      out.push({
        icon: { type: 'fa', class: 'fab fa-instagram' },
        label: config.instagramLabel || config.instagram,
        href: config.instagram,
        target: '_blank',
        rel: 'noopener'
      });
    }

    return out;
  }

  function buildContact(config) {
    const section = $('#contact');
    if (!section) return;

    section.innerHTML = '';

    const titleKey = config?.sections?.contact?.titleKey || 'contact_us';

    const h2 = document.createElement('h2');
    h2.setAttribute('data-i18n', titleKey);
    section.appendChild(h2);

    const wrap = document.createElement('div');
    wrap.className = 'contact-boxes';
    section.appendChild(wrap);

    const contacts = safeArray(config.contacts);
    const list = contacts.length ? contacts : buildLegacyContacts(config);

    list.forEach((c) => {
      if (!c || !c.href) return;

      const box = document.createElement('div');
      box.className = 'contact-box';

      // icon
      if (c.icon?.type === 'fa') {
        const i = document.createElement('i');
        i.className = c.icon.class || '';
        box.appendChild(i);
      } else if (c.icon?.type === 'material') {
        const i = document.createElement('i');
        i.className = 'material-icons-outlined';
        i.textContent = c.icon.name || 'info';
        box.appendChild(i);
      }

      // link
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = c.href;
      if (c.target) a.target = c.target;
      if (c.rel) a.rel = c.rel;
      a.textContent = c.label || c.href;
      p.appendChild(a);
      box.appendChild(p);

      wrap.appendChild(box);
    });
  }

  function buildFooter(config) {
    const footer = $('#siteFooter');
    if (!footer) return;

    footer.innerHTML = '';

    const leftKey = config?.sections?.footer?.leftKey || 'no_cookies';
    const rightKey = config?.sections?.footer?.rightKey || 'made_by';

    const left = document.createElement('div');
    left.className = 'footer-section';
    const leftP = document.createElement('p');
    leftP.setAttribute('data-i18n', leftKey);
    left.appendChild(leftP);

    const right = document.createElement('div');
    right.className = 'footer-section';
    const rightP = document.createElement('p');
    rightP.setAttribute('data-i18n', rightKey);
    right.appendChild(rightP);

    // Optional credits email (comes ONLY from config)
    const creditsEmail = config?.footer?.creditsEmail || config?.credits?.email;
    if (creditsEmail) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = `mailto:${creditsEmail}`;
      a.textContent = creditsEmail;
      p.appendChild(a);
      right.appendChild(p);
    }

    footer.appendChild(left);
    footer.appendChild(right);
  }

  function applyTheme(config) {
    // Backward compatible: supports both theme.* and flat keys
    const theme = config.theme || {};

    setCssVar('--primary', theme.primaryColor ?? config.primaryColor);
    setCssVar('--accent', theme.accentColor ?? config.accentColor);
    setCssVar('--header-bg', theme.headerBg ?? config.headerBg);
    setCssVar('--header-text-color', theme.headerTextColor ?? config.headerTextColor);
    setCssVar('--nav-link-color', theme.navLinkColor ?? config.navLinkColor);
    setCssVar('--footer-bg', theme.footerBg ?? config.footerBg);
    setCssVar('--button-hover', theme.buttonHover ?? config.buttonHover);
    setCssVar('--logo-max-width', theme.logoMaxWidth ?? config.logoMaxWidth);

    if (config.hero?.position) setCssVar('--hero-position', config.hero.position);
    if (typeof config.hero?.overlayOpacity === 'number') setCssVar('--hero-overlay', config.hero.overlayOpacity);
  }

  function initMenu() {
    const navbar = $('#navbar');
    const menuIcon = $('#menuIcon');
    if (!navbar || !menuIcon) return;

    const closeMenu = () => {
      navbar.classList.remove('active');
      menuIcon.classList.remove('cross');
      menuIcon.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = 'auto';
    };

    const openMenu = () => {
      navbar.classList.add('active');
      menuIcon.classList.add('cross');
      menuIcon.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const toggleMenu = () => {
      if (navbar.classList.contains('active')) closeMenu();
      else openMenu();
    };

    menuIcon.addEventListener('click', toggleMenu);
    menuIcon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
      }
    });

    // Clicking any link inside the menu closes it
    navbar.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      closeMenu();
    });
  }

  function initHeaderScroll() {
    const header = $('#siteHeader') || document.querySelector('header');
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 0) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

function initHero(config) {
  const heroEl = $('#hero') || document.querySelector('.hero');
  if (!heroEl) return;

  let images = [];

  // NEW: folder + pattern support
  if (config.hero?.folder) {
    const start = Number.isFinite(config.hero.start) ? config.hero.start : 0;
    const count = Number.isFinite(config.hero.count) ? config.hero.count : 0;
    const pattern = config.hero.pattern || '{index}.webp';

    for (let i = start; i < start + count; i++) {
      images.push(
        `${config.hero.folder}/${pattern.replace('{index}', i)}`
      );
    }
  } else {
    // fallback (old behavior)
    images = safeArray(config?.hero?.images);
  }

  if (!images.length) return;

  // preload
  images.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  let idx = 0;

  const setImage = () => {
    heroEl.style.backgroundImage = `url('${images[idx]}')`;
    idx = (idx + 1) % images.length;
  };

  setImage();

  if (heroIntervalId) clearInterval(heroIntervalId);
  heroIntervalId = setInterval(
    setImage,
    config.hero.intervalMs || 5000
  );
}
function getRoomGalleryUrls(room) {
    if (!room) return [];
    
    // Usa direttamente l'array di immagini se presente
    if (Array.isArray(room.galleryImages) && room.galleryImages.length) {
        return room.galleryImages;
    }
    
    // Oppure costruisci l'array dal folder + count
    const gallery = room.gallery || {};
    if (gallery.folder && gallery.count) {
        const urls = [];
        for (let i = 0; i < gallery.count; i++) {
            const pattern = gallery.pattern || '{index}.jpg.webp';
            urls.push(`${gallery.folder}/${pattern.replace('{index}', i)}`);
        }
        return urls;
    }
    
    return [];
}

function openGallery(room) {
    const galleryEl = $('#gallery');
    const imagesWrap = $('#galleryImages');
    if (!galleryEl || !imagesWrap) return;

    imagesWrap.innerHTML = '';

    galleryEl.classList.add('open');
    galleryEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const urls = getRoomGalleryUrls(room);

    if (!urls.length) {
        const p = document.createElement('p');
        p.className = 'gallery-empty';
        p.setAttribute('data-i18n', 'gallery_no_images');
        imagesWrap.appendChild(p);
        applyI18n(currentLang);
        return;
    }

    // Carica TUTTE le immagini insieme
    urls.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.loading = 'lazy'; // Mantieni lazy loading per performance
        img.alt = room.titleKey ? getTranslation(room.titleKey) : 'Gallery image';
        imagesWrap.appendChild(img);
    });
}

// Funzione helper per ottenere traduzioni
function getTranslation(key) {
    if (!cfg?.i18n?.[currentLang]) return '';
    return cfg.i18n[currentLang][key] || '';
}

// Chiudi galleria rimane uguale
function closeGallery() {
    const galleryEl = $('#gallery');
    if (!galleryEl) return;

    galleryEl.classList.remove('open');
    galleryEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = 'auto';
}
  function initGallery() {
    const galleryEl = $('#gallery');
    const closeBtn = $('#galleryClose');
    if (!galleryEl || !closeBtn) return;

    closeBtn.addEventListener('click', closeGallery);

    // click outside content closes
    galleryEl.addEventListener('click', (e) => {
      const content = e.target.closest('.gallery-content');
      if (!content) closeGallery();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeGallery();
    });
  }

  function initMap(config) {
    if (typeof window.L === 'undefined') return;

    const mapEl = $('#mapid');
    if (!mapEl) return;

    // support both new and legacy map fields
    const mapCfg = config.map || {};

    const lat = (mapCfg.center && typeof mapCfg.center.lat === 'number') ? mapCfg.center.lat : config.mapLat;
    const lon = (mapCfg.center && typeof mapCfg.center.lon === 'number') ? mapCfg.center.lon : config.mapLon;
    const zoom = mapCfg.zoom || config.mapZoom || 15;

    if (typeof lat !== 'number' || typeof lon !== 'number') return;

    const map = window.L.map(mapEl).setView([lat, lon], zoom);

    const tileUrl = mapCfg.tileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = mapCfg.attribution || '&copy; OpenStreetMap contributors';

    window.L.tileLayer(tileUrl, { attribution }).addTo(map);

    const markers = Array.isArray(mapCfg.markers)
      ? mapCfg.markers
      : (Array.isArray(config.markers) ? config.markers : []);

    if (markers.length) {
      markers.forEach((m) => {
        if (!m || typeof m.lat !== 'number' || typeof m.lon !== 'number') return;
        window.L.marker([m.lat, m.lon]).addTo(map).bindPopup(m.popup || config.siteTitle || 'Location');
      });
    } else {
      window.L.marker([lat, lon]).addTo(map).bindPopup(config.siteTitle || 'Location');
    }
  }

  function reloadKrossWidget(lang) {
    if (!cfg?.krossWidget) return;

    const krossCfg = cfg.krossWidget || {};
    const src = krossCfg.src;
    if (!src) return;

    const containerSelector = krossCfg.containerSelector || '.kross-container';
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // attributes on container (including language)
    const attrs = Object.assign({}, krossCfg.containerAttributes || {});
    if (lang) attrs['data-lang'] = lang;
    Object.keys(attrs).forEach((key) => container.setAttribute(key, attrs[key]));

    // reset widget
    container.innerHTML = '';

    const oldScript = document.getElementById('kross-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'kross-script';
    script.type = 'text/javascript';
    script.defer = true;
    script.src = src;
    document.body.appendChild(script);

    // optional CSS
    if (krossCfg.css) {
      let link = document.getElementById('kross-css');
      if (link) link.remove();

      link = document.createElement('link');
      link.id = 'kross-css';
      link.rel = 'stylesheet';
      link.href = krossCfg.css;
      link.type = 'text/css';
      link.media = 'all';
      document.head.appendChild(link);
    }
  }

  async function loadConfig() {
    const res = await fetch('site-config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load site-config.json');
    return res.json();
  }

  async function init() {
    try {
      cfg = await loadConfig();

      if (cfg.siteTitle) document.title = cfg.siteTitle;

      applyTheme(cfg);
      buildHeader(cfg);

      // Sections
      buildIntro(cfg);
      buildAmenities(cfg);
      buildRooms(cfg);
      buildBooking(cfg);
      buildMapSection(cfg);
      buildTestimonials(cfg);
      buildContact(cfg);
      buildFooter(cfg);

      // Interactions
      initMenu();
      initHeaderScroll();
      initGallery();

      // Apply initial language after building DOM
      const initialLang = cfg.defaultLang || 'en';
      setLanguage(initialLang);

      // Non-text parts
      initHero(cfg);
      initMap(cfg);
    } catch (err) {
      console.error('Init error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
