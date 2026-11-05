const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    link.classList.add('active');
    sidebar.classList.remove('open');
  });
});
// Highlight the navigation item that matches the section currently in view.
const sections = [...document.querySelectorAll('main section[id]')];
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (active) {
        document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
        active.classList.add('active');
      }
    }
  });
}, { rootMargin: '-25% 0px -65% 0px' });
sections.forEach(section => observer.observe(section));
