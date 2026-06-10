/** Charge le widget Google Translate (masqué) et bascule fr ↔ en sur tout le DOM. */

let loadPromise = null;

function ensureContainer() {
  let el = document.getElementById('google_translate_element');
  if (!el) {
    el = document.createElement('div');
    el.id = 'google_translate_element';
    el.setAttribute('aria-hidden', 'true');
    el.className = 'google-translate-host';
    document.body.appendChild(el);
  }
  return el;
}

export function loadGoogleTranslate() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.translate?.TranslateElement) return Promise.resolve();
  if (loadPromise) return loadPromise;

  ensureContainer();

  loadPromise = new Promise((resolve) => {
    window.googleTranslateElementInit = () => {
      try {
        // eslint-disable-next-line no-new
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'fr',
            includedLanguages: 'en,fr',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      } catch (e) {
        console.warn('[googleTranslate] init', e);
      }
      resolve();
    };

    if (document.querySelector('script[data-rapido-gtranslate]')) {
      const poll = setInterval(() => {
        if (window.google?.translate?.TranslateElement) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(poll);
        resolve();
      }, 8000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.dataset.rapidoGtranslate = '1';
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });

  return loadPromise;
}

function getTranslateSelect() {
  return document.querySelector('.goog-te-combo');
}

export function applyGoogleTranslate(lang) {
  if (typeof window === 'undefined') return Promise.resolve();

  const target = lang === 'en' ? 'en' : 'fr';

  return loadGoogleTranslate().then(() => {
    const tryApply = (attempt = 0) => {
      const select = getTranslateSelect();
      if (select) {
        if (select.value !== target) {
          select.value = target;
          select.dispatchEvent(new Event('change'));
        }
        return;
      }
      if (attempt < 40) {
        setTimeout(() => tryApply(attempt + 1), 100);
      }
    };
    tryApply();
  });
}

export function clearGoogleTranslateArtifacts() {
  document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
  document.body.classList.remove('translated-ltr', 'translated-rtl');
}
