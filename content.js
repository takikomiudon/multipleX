function updateHomeLayout() {
  document.documentElement.classList.toggle('multiplex-home', location.pathname === '/home');
}

updateHomeLayout();
navigation.addEventListener('navigatesuccess', updateHomeLayout);
