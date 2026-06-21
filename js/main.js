const swiper = new Swiper('.reviews--slider', {

  slidesPerView: 2,
  spaceBetween: 60,

  breakpoints: {
    0: {
      slidesPerView: 1,
      spaceBetween: 20,
    },
    570: {
      slidesPerView: 1,
      spaceBetween: 20,
    },
    680: {
      slidesPerView: 2,
      spaceBetween: 40,
    },
    900: {
      slidesPerView: 2,
      spaceBetween: 60,
    }
  },
  
    // Navigation arrows
    navigation: {
      nextEl: '.reviews--item-next',
      prevEl: '.reviews--item-prev',
    },
  });

 const menuBtn = document.querySelector('.menu-btn');
 const menuList = document.querySelector('.menu__list');

menuBtn.addEventListener('click', () => {
menuList.classList.toggle('menu--open');
 });



