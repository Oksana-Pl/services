const language = document.documentElement.lang;
const messages = {
  en: {
    next: 'Next testimonial', previous: 'Previous testimonial', first: 'First slide', last: 'Last slide',
    slide: 'Slide {{index}} of {{slidesLength}}', pagination: 'Go to slide {{index}}',
    sending: 'Sending your message…',
    error: 'Your message could not be sent. Please try again or email oksana1.1pleshkan@gmail.com.',
    timeout: 'Delivery could not be confirmed. Please try again or email oksana1.1pleshkan@gmail.com.'
  },
  uk: {
    next: 'Наступний відгук', previous: 'Попередній відгук', first: 'Перший слайд', last: 'Останній слайд',
    slide: 'Слайд {{index}} із {{slidesLength}}', pagination: 'Перейти до слайда {{index}}',
    sending: 'Надсилання повідомлення…',
    error: 'Не вдалося надіслати повідомлення. Спробуйте ще раз або напишіть на oksana1.1pleshkan@gmail.com.',
    timeout: 'Не вдалося підтвердити доставку. Спробуйте ще раз або напишіть на oksana1.1pleshkan@gmail.com.'
  },
  ru: {
    next: 'Следующий отзыв', previous: 'Предыдущий отзыв', first: 'Первый слайд', last: 'Последний слайд',
    slide: 'Слайд {{index}} из {{slidesLength}}', pagination: 'Перейти к слайду {{index}}',
    sending: 'Отправка сообщения…',
    error: 'Не удалось отправить сообщение. Попробуйте ещё раз или напишите на oksana1.1pleshkan@gmail.com.',
    timeout: 'Не удалось подтвердить доставку. Попробуйте ещё раз или напишите на oksana1.1pleshkan@gmail.com.'
  }
};
const text = messages[language] || messages.en;
const a11y = {
  prevSlideMessage: text.previous,
  nextSlideMessage: text.next,
  firstSlideMessage: text.first,
  lastSlideMessage: text.last,
  slideLabelMessage: text.slide,
  paginationBulletMessage: text.pagination
};

/** Mobile navigation */
const menuBtn = document.querySelector('.menu-btn');
const menuList = document.querySelector('.menu__list');
const mobileMenu = matchMedia('(max-width: 840px)');

function setMenu(open) {
  menuList.classList.toggle('menu--open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuList.inert = mobileMenu.matches && !open;
}
setMenu(false);
menuBtn.addEventListener('click', () => {
  setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
});
menuList.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
mobileMenu.addEventListener('change', () => {
  if (mobileMenu.matches && menuList.contains(document.activeElement)) menuBtn.focus();
  setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menuBtn.focus();
  }
});

/** Language selection: pointer, keyboard and touch */
const dropdown = document.querySelector('.dropdown');
const languageBtn = dropdown.querySelector('.dropbtn');
const languageOptions = dropdown.querySelector('.dropdown-content');

function setLanguage(open) {
  dropdown.classList.toggle('language--open', open);
  languageBtn.setAttribute('aria-expanded', String(open));
}
languageBtn.addEventListener('click', () => {
  setLanguage(!dropdown.classList.contains('language--open'));
});
dropdown.addEventListener('mouseenter', () => setLanguage(true));
dropdown.addEventListener('mouseleave', () => {
  if (!dropdown.contains(document.activeElement)) setLanguage(false);
});
dropdown.addEventListener('focusout', event => {
  if (!dropdown.contains(event.relatedTarget)) setLanguage(false);
});
dropdown.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setLanguage(false);
    languageBtn.focus();
  } else if (event.key === 'ArrowDown' && event.target === languageBtn) {
    event.preventDefault();
    setLanguage(true);
    languageOptions.querySelector('a').focus();
  }
});
document.addEventListener('click', event => {
  if (!dropdown.contains(event.target)) setLanguage(false);
});

/** Contact form */
const form = document.getElementById('contact-form');
const successMessage = document.getElementById('success-message');
const formStatus = document.getElementById('form-status');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  if (submitBtn.disabled || !form.reportValidity()) return;

  submitBtn.disabled = true;
  form.setAttribute('aria-busy', 'true');
  formStatus.textContent = text.sending;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Submission failed');

    formStatus.textContent = '';
    form.style.display = 'none';
    successMessage.classList.add('active');
    successMessage.focus();
    form.reset();
  } catch (error) {
    formStatus.textContent = error.name === 'AbortError' ? text.timeout : text.error;
  } finally {
    clearTimeout(timeout);
    submitBtn.disabled = false;
    form.removeAttribute('aria-busy');
  }
});

/** Galleries remain readable if the external slider library cannot load. */
if (typeof Swiper !== 'undefined') {
  const swiper = new Swiper('.reviews--slider', {
    slidesPerView: 2,
    spaceBetween: 60,
    a11y,
    breakpoints: {
      0: { slidesPerView: 1, spaceBetween: 20 },
      570: { slidesPerView: 1, spaceBetween: 20 },
      680: { slidesPerView: 2, spaceBetween: 40 },
      900: { slidesPerView: 2, spaceBetween: 60 }
    },
    navigation: {
      nextEl: '.reviews--item-next',
      prevEl: '.reviews--item-prev'
    }
  });

  const gallerySwiper = new Swiper('.gallery-swiper', {
    slidesPerView: 'auto',
    spaceBetween: 20,
    freeMode: true,
    mousewheel: { forceToAxis: true },
    watchSlidesProgress: true,
    observer: true,
    observeParents: true,
    a11y,
    pagination: {
      el: '.gallery-pagination',
      clickable: true
    }
  });

  /** Arrow keys operate only the focused carousel. */
  document.querySelectorAll('.gallery-swiper, .reviews--slider').forEach(slider => {
    slider.addEventListener('keydown', event => {
      if (event.target !== slider || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'ArrowRight') slider.swiper.slideNext();
      else slider.swiper.slidePrev();
    });
  });
}

/** Muted motion previews: click, Enter or Space toggles playback. */
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const videos = document.querySelectorAll('.gallery video');
videos.forEach(video => {
  const control = video.closest('.gallery-motion');
  function updatePlayback() {
    control.setAttribute('aria-pressed', String(!video.paused));
  }
  function togglePlayback() {
    if (video.paused) video.play().catch(() => updatePlayback());
    else video.pause();
  }
  if (reducedMotion.matches) {
    video.autoplay = false;
    video.pause();
  }
  updatePlayback();
  video.addEventListener('play', updatePlayback);
  video.addEventListener('pause', updatePlayback);
  control.addEventListener('click', togglePlayback);
});
reducedMotion.addEventListener('change', event => {
  if (event.matches) videos.forEach(video => video.pause());
});
