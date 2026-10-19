/* Optional analytics: no Google script or measurement before explicit permission. */
(() => {
  'use strict';
  const id = 'G-N81RL4CCH2';
  const key = 'services-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const lang = document.documentElement.lang;
  const copy = {
    en: ['Help me improve this website', 'With your permission, I use Google Analytics cookies to understand how visitors use this website, including pages visited, approximate location, and device type. This helps me improve the website. You can allow or reject analytics and change your choice at any time.', 'Allow Analytics', 'Reject', 'Privacy Policy', 'Analytics settings'],
    ru: ['Помогите мне улучшить этот сайт', 'С вашего разрешения я использую файлы cookie Google Analytics, чтобы понимать, как посетители используют сайт: какие страницы посещают, их примерное местоположение и тип устройства. Это помогает мне улучшать сайт. Вы можете разрешить или отклонить аналитику и изменить свой выбор в любое время.', 'Разрешить аналитику', 'Отклонить', 'Политика конфиденциальности', 'Настройки аналитики'],
    uk: ['Допоможіть мені покращити цей сайт', 'З вашого дозволу я використовую файли cookie Google Analytics, щоб розуміти, як відвідувачі користуються сайтом: які сторінки відвідують, їхнє приблизне місцеперебування та тип пристрою. Це допомагає мені покращувати сайт. Ви можете дозволити або відхилити аналітику та змінити свій вибір у будь-який час.', 'Дозволити аналітику', 'Відхилити', 'Політика конфіденційності', 'Налаштування аналітики']
  }[lang] || null;
  const t = copy || ['Help me improve this website', 'With your permission, I use Google Analytics cookies to understand how visitors use this website, including pages visited, approximate location, and device type. This helps me improve the website. You can allow or reject analytics and change your choice at any time.', 'Allow Analytics', 'Reject', 'Privacy Policy', 'Analytics settings'];
  let loaded = false;
  let expires = 0;
  let timer;
  let returnFocus;
  const disabled = 'ga-disable-' + id;
  window[disabled] = true;
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value && ['allowed', 'rejected'].includes(value.choice) && Number.isFinite(value.expires) && value.expires > Date.now() && value.expires <= Date.now() + lifetime) return value;
      localStorage.removeItem(key);
    } catch (_) { /* Unavailable storage: analytics stays opt-in for this page. */ }
    return null;
  }
  function clearCookies() {
    const host = location.hostname.split('.');
    const domains = ['', ...host.map((_, i) => host.slice(i).join('.')).flatMap(d => [d, '.' + d])];
    const paths = new Set(['/']);
    const segments = location.pathname.split('/');
    for (let i = 1; i < segments.length; i++) paths.add(segments.slice(0, i).join('/') + '/');
    document.cookie.split(';').forEach(part => {
      const name = part.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$))/.test(name)) return;
      for (const domain of domains) for (const path of paths) document.cookie = name + '=; Max-Age=0; path=' + path + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
    });
  }
  function stop() {
    window[disabled] = true;
    clearTimeout(timer);
    clearCookies();
  }
  function start() {
    window[disabled] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    window.gtag('js', new Date());
    window.gtag('config', id, {allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: Math.max(1, Math.floor((expires - Date.now()) / 1000)), cookie_update: false});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  const panel = document.createElement('section');
  panel.className = 'analytics-banner';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'analytics-title');
  panel.innerHTML = '<h2 id="analytics-title"></h2><p></p><div class="analytics-actions"><button type="button" data-choice="allowed"></button><button type="button" data-choice="rejected"></button><a href="privacy.html"></a></div>';
  panel.querySelector('h2').textContent = t[0];
  panel.querySelector('p').textContent = t[1];
  panel.querySelector('[data-choice="allowed"]').textContent = t[2];
  panel.querySelector('[data-choice="rejected"]').textContent = t[3];
  panel.querySelector('a').textContent = t[4];
  panel.querySelector('a').href = ({ru: 'privacy-ru.html', uk: 'privacy-uk.html'})[lang] || 'privacy.html';
  document.body.append(panel);
  function apply(value) {
    clearTimeout(timer);
    if (!value) {
      stop();
      if (loaded) { location.reload(); return; }
      panel.hidden = false; return;
    }
    expires = value.expires;
    panel.hidden = true;
    if (value.choice === 'allowed') start();
    else stop();
    timer = setTimeout(() => apply(read()), Math.min(expires - Date.now() + 10, 2147483647));
  }
  document.querySelectorAll('[data-analytics-settings]').forEach(button => {
    button.hidden = false;
    button.textContent = t[5];
    button.addEventListener('click', () => {
      returnFocus = button;
      panel.hidden = false;
      panel.querySelector('button').focus();
    });
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    const value = {choice: button.dataset.choice, expires: Date.now() + lifetime};
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    const wasLoaded = loaded;
    apply(value);
    if (returnFocus) returnFocus.focus();
    else document.querySelector('[data-analytics-settings]')?.focus({preventScroll: true});
    // A reload removes already-running Google code immediately after withdrawal.
    if (wasLoaded && value.choice === 'rejected') location.reload();
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    const value = read();
    if (loaded && value?.choice !== 'allowed') { stop(); location.reload(); }
    else apply(value);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const value = read();
      if (loaded && value?.choice !== 'allowed') { stop(); location.reload(); }
      else apply(value);
    }
  });
  apply(read());
})();
