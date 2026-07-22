// Theme toggle: dark/light mode with persistence
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const lightIcon = document.getElementById('theme-light-icon');
  const darkIcon = document.getElementById('theme-dark-icon');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply saved theme on load
  if (savedTheme === 'dark') {
    html.classList.add('dark-mode');
    themeToggle.setAttribute('aria-pressed', 'true');
    lightIcon.style.display = 'none';
    darkIcon.style.display = 'block';
  }

  // Theme toggle handler
  themeToggle.addEventListener('click', () => {
    html.classList.toggle('dark-mode');
    const isDark = html.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    lightIcon.style.display = isDark ? 'none' : 'block';
    darkIcon.style.display = isDark ? 'block' : 'none';
  });

  // Keyboard support
  themeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      themeToggle.click();
    }
  });
});
