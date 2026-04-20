(() => {
  'use strict';

  /** @type {any} */
  let cfg = null;
  let currentLang = 'en';

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
          if (typeof l === "string") return { code: l, label: l };
          if (l && typeof l === "object" && l.code) {
            return { code: l.code, label: l.label || l.code };
          }
          return null;
        })
        .filter(Boolean);
    }

    const keys = config?.i18n ? Object.keys(config.i18n) : [];
    if (keys.length) return keys.map((code) => ({ code, label: code }));

    return [{ code: "en", label: "EN" }];
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
    buildAbout(cfg);
  }

  function buildHeader(config) {

    const navbar = $('#navbar');
    if (!navbar) return;

    navbar.innerHTML = '<h1>hostand</h1>';

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

  function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const trigger = 250;

  const onScroll = () => {
    if (window.scrollY > trigger) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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

  function buildBusiness(config) {
    const section = $('#business');
    if (!section) return;

    const s = config.sections?.business;
    if (!s) return;

    section.innerHTML = `
      <h2 data-i18n="${s.titleKey}"></h2>
      <p data-i18n="${s.introKey}" class="section-intro business-intro"></p>

      <div class="business-layout">
        <div class="business-main">

          <div class="business-block business-problem">
            <h3 data-i18n="business_problem_title"></h3>
            <ul class="business-problem-list">
              <li data-i18n="business_problem_1"></li>
              <li data-i18n="business_problem_2"></li>
              <li data-i18n="business_problem_3"></li>
            </ul>
            <p class="business-closing" data-i18n="business_problem_closing"></p>
          </div>

          <div class="business-block business-value">
            <h3 data-i18n="business_value_title"></h3>
            <p class="business-lead" data-i18n="business_value_subtitle"></p>
            <p class="business-highlight-label" data-i18n="business_highlight_label"></p>

            <div class="business-highlights">
              <div class="business-highlight-card" data-i18n="business_highlight_1"></div>
              <div class="business-highlight-card" data-i18n="business_highlight_2"></div>
              <div class="business-highlight-card" data-i18n="business_highlight_3"></div>
              <div class="business-highlight-card" data-i18n="business_highlight_4"></div>
              <div class="business-highlight-card" data-i18n="business_highlight_5"></div>
            </div>
          </div>

          <div class="business-block business-services">
            <h3 data-i18n="business_services_title"></h3>
            <p class="business-lead" data-i18n="business_services_subtitle"></p>
            <p class="business-services-label" data-i18n="business_services_label"></p>

            <div class="business-services-grid">
              <div class="service-card" data-i18n="business_service_1"></div>
              <div class="service-card" data-i18n="business_service_2"></div>
              <div class="service-card" data-i18n="business_service_3"></div>
              <div class="service-card" data-i18n="business_service_4"></div>
              <div class="service-card" data-i18n="business_service_5"></div>
              <div class="service-card" data-i18n="business_service_6"></div>
            </div>
          </div>

          <div class="business-block business-process">
            <h3 data-i18n="business_process_title"></h3>
            <p class="business-lead" data-i18n="business_process_intro"></p>

            <div class="business-process-grid">
              <div class="process-card">
                <span class="process-number">01</span>
                <h4 data-i18n="business_process_1_title"></h4>
                <p data-i18n="business_process_1_text"></p>
              </div>
              <div class="process-card">
                <span class="process-number">02</span>
                <h4 data-i18n="business_process_2_title"></h4>
                <p data-i18n="business_process_2_text"></p>
              </div>
              <div class="process-card">
                <span class="process-number">03</span>
                <h4 data-i18n="business_process_3_title"></h4>
                <p data-i18n="business_process_3_text"></p>
              </div>
              <div class="process-card">
                <span class="process-number">04</span>
                <h4 data-i18n="business_process_4_title"></h4>
                <p data-i18n="business_process_4_text"></p>
              </div>
            </div>
          </div>

          <div class="business-block business-cta-box">
            <h3 data-i18n="business_cta_title"></h3>
            <p data-i18n="business_cta_text"></p>
            <p class="business-note strong" data-i18n="business_cta_note"></p>

            <a 
              href="mailto:info@hostand.eu?subject=Free consultation request&body=Hi, I’d like to request a free consultation."
              class="business-cta-button"
              data-i18n="business_cta_button">
            </a>
            <div class="business-urgency">
              <h4 data-i18n="business_urgency_title"></h4>
              <p data-i18n="business_urgency_text"></p>
            </div>
          </div>
        </div>

        <aside id="business-login" class="business-login-card">
          <h3 data-i18n="business-login-title"></h3>
          <p data-i18n="business-login-text" class="business-login-text"></p>
          <a
            id="loginBtn"
            class="primary-btn business-login-btn"
            href="https://hostand.eu/login"
            target="_blank"
            rel="noopener"
            data-i18n="business-login"
          ></a>
        </aside>
      </div>
    `;

    applyI18n(currentLang);
    initProcessAnimation();
  }
  function initProcessAnimation() {
  const cards = document.querySelectorAll('.process-card');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      threshold: 0.2
    }
  );

  cards.forEach(card => observer.observe(card));
}
  function buildTravel(config) {
    const section = $('#travel');
    if (!section) return;

    const s = config.sections?.travel;
    if (!s) return;

    section.innerHTML = `
      <h2 data-i18n="${s.titleKey}"></h2>
      <p data-i18n="${s.introKey}" class="section-intro"></p>
      <div class="kross-container"></div>
    `;
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

  function buildStudents(config) {
    const section = $('#students');
    if (!section) return;

    const s = config.sections?.students;
    if (!s) return;
    section.innerHTML = `
      <div class="students-centered">
        <h2 data-i18n="${s.titleKey}"></h2>
        <p data-i18n="${s.introKey}" class="section-intro"></p>

        <div class="students-form-card">
          <h3 data-i18n="students_form_title"></h3>

          <form
            action="https://formspree.io/f/xrerqggv"
            method="POST"
            class="students-form"
          >
            <input type="hidden" name="_subject" value="Hostand Students - Nuova richiesta" />
            <input type="text" name="_gotcha" class="hp-field" tabindex="-1" autocomplete="off" />

            <input
              type="text"
              name="name"
              data-i18n="form_name"
              required
            />
            <input
              type="email"
              name="email"
              data-i18n="form_email"
              required
            />

            <div class="students-period-grid">
              <div class="form-field">
                <label for="periodFrom" data-i18n="form_period_from"></label>
                <input
                  id="periodFrom"
                  type="date"
                  name="period_from"
                  required
                />
            </div>

            <div class="form-field">
              <label for="periodTo" data-i18n="form_period_to"></label>
              <input
                id="periodTo"
                type="date"
                name="period_to"
                required
              />
            </div>
          </div>

            <input
              type="text"
              name="requested_area"
              data-i18n="form_requested_area"
              required
            />

            <input
              type="tel"
              name="phone"
              data-i18n="form_phone"
              required
            />

            <textarea
              name="request_description"
              rows="5"
              data-i18n="form_request_description"
              required
            ></textarea>

            <button
              type="submit"
              class="students-form-btn"
              data-i18n="form_submit"
            ></button>
          </form>
        </div>
      </div>
    `;
    applyI18n(currentLang);
  }

  function buildAbout(config) {
    const section = $('#about');
    if (!section) return;

    const s = config.sections?.about;
    if (!s) return;
   
    const lang = currentLang || config.defaultLang || 'en';
    const reviews = config.reviews?.[lang] || config.reviews?.[config.defaultLang] || [];

    const duplicatedReviews = [...reviews, ...reviews];


    section.innerHTML = `
      <h2 data-i18n="${s.titleKey}"></h2>

      <div class="about-custom">
        <p data-i18n="about_custom_1"></p>
        <p data-i18n="about_custom_2"></p>
        <p data-i18n="about_custom_3"></p>
        <p data-i18n="about_custom_4"></p>
        <p data-i18n="about_custom_5"></p>
      </div>
      <h3 class="about-numbers-title" data-i18n="about_numbers_title"></h3>

      <div class="about-metrics">
        <div class="metric">
          <p class="metric-label" data-i18n="about_num_1"></p>
          <h4 class="metric-value counter" data-target="100">0</h4>
        </div>

        <div class="metric-divider"></div>

        <div class="metric">
          <p class="metric-label" data-i18n="about_num_2"></p>
          <h4 class="metric-value counter" data-target="3000000">0</h4>
        </div>

        <div class="metric-divider"></div>

        <div class="metric">
          <p class="metric-label" data-i18n="about_num_3"></p>
          <h4 class="metric-value counter" data-target="15000">0</h4>
        </div>
      </div>
      <h2 class="about-reviews-title" data-i18n="about_title_review"></h2>
      <div class="reviews-marquee">
        <div class="reviews-track"></div>
      </div>
    `;

    const track = section.querySelector('.reviews-track');
    if (!track) return;

    duplicatedReviews.forEach((review) => {
      const card = document.createElement('article');
      card.className = 'review-card';

      card.innerHTML = `
        <div class="review-card-inner">
          <p class="review-text">${review.text || ''}</p>
          <div class="review-meta">
            <p class="review-name">${review.name || ''}</p>
            <p class="review-role" data-i18n="${review.roleKey || ''}"></p>
          </div>
        </div>
      `;

      track.appendChild(card);
    });

    // Applica subito le traduzioni anche agli elementi appena creati
    applyI18n(lang);
    initCounters();
  }

  function buildFooter(config) {
  const footer = $('#siteFooter');
  if (!footer) return;

  footer.innerHTML = '';

  const leftKey = config?.sections?.footer?.leftKey || 'no_cookies';
  const rightKey = config?.sections?.footer?.rightKey || 'made_by';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-row';

  // P.IVA
  const vat = document.createElement('p');
  vat.textContent = 'Hostand - P.iva: IT17531271009';

  // separator
  const sep1 = document.createElement('span');
  sep1.className = 'footer-sep';

  // cookies
  const cookies = document.createElement('p');
  cookies.setAttribute('data-i18n', leftKey);

  // separator
  const sep2 = document.createElement('span');
  sep2.className = 'footer-sep';

  // developed by
  const dev = document.createElement('p');
  dev.setAttribute('data-i18n', rightKey);

  wrapper.appendChild(vat);
  wrapper.appendChild(sep1);
  wrapper.appendChild(cookies);
  wrapper.appendChild(sep2);
  wrapper.appendChild(dev);

  footer.appendChild(wrapper);
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

    if (config.hero?.position) setCssVar('--hero-position', config.hero.position);
    if (typeof config.hero?.overlayOpacity === 'number') setCssVar('--hero-overlay', config.hero.overlayOpacity);
  }
  function initCounters() {
  const counters = document.querySelectorAll('.counter');

  if (!counters.length) return;

  const formatNumber = (num) => {
    if (num >= 1000000) return Math.floor(num / 1000000) + 'M+';
    if (num >= 1000) return Math.floor(num / 1000) + 'K+';
    return Math.floor(num) + '+';
  };

  const animate = (el) => {
    if (el.dataset.animated) return;
    el.dataset.animated = "true";

    const target = +el.getAttribute('data-target');
    let current = 0;

    const update = () => {
      current += (target - current) * 0.08;

      if (current < target) {
        el.innerText = formatNumber(current);
        requestAnimationFrame(update);
      } else {
        el.innerText = formatNumber(target);
      }
    };

    update();
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        obs.unobserve(entry.target); // importante
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(counter => observer.observe(counter));
}
  function initMenu() {
    const navbar = document.getElementById('navbar');
    const menuIcon = document.getElementById('menuIcon');
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

      // Mobile: blocca scroll
      if (window.innerWidth <= 767) {
        document.body.style.overflow = 'hidden';
      }
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

    // Clicking any link closes the menu
    navbar.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      closeMenu();
    });

    // Se ridimensiono finestra, resetta menu
    window.addEventListener('resize', () => {
      if (window.innerWidth > 767) {
        document.body.style.overflow = 'auto';
        navbar.classList.remove('active');
        menuIcon.classList.remove('cross');
      }
    });
  }

  function initHero(config) {
    const heroEl = $('#hero') || document.querySelector('.hero');
    if (!heroEl) return;
    heroEl.style.backgroundImage = `url('img/hero/0.jpg')`;
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
      buildContact(cfg);
      buildFooter(cfg);
      buildBusiness(cfg);
      buildTravel(cfg);
      buildAbout(cfg);
      buildStudents(cfg);
      // Interactions
      initMenu();
      initHeaderScroll();

      // Apply initial language after building DOM
      const initialLang = cfg.defaultLang || 'en';
      setLanguage(initialLang);

      // Non-text parts
      initHero(cfg);
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
