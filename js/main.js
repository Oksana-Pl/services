const swiper = new Swiper('.reviews--slider', {

  slidesPerView: 2,
  spaceBetween: 50,
    // Navigation arrows
    navigation: {
      nextEl: '.reviews--item-next',
      prevEl: '.reviews--item-prev',
    },
  });