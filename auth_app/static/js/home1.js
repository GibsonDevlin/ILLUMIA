// --- Unique id-based dropdown logic for two dropdowns ---
function setupDropdown(dropdownId) {
  const drop = document.getElementById(dropdownId);
  if (!drop) return;
  const parent = drop.parentElement;
  if (!parent) return;
  // Hover
  parent.addEventListener('mouseenter', () => {
    closeAllIdDropdowns();
    drop.classList.add('open');
  });
  parent.addEventListener('mouseleave', () => {
    drop.classList.remove('open');
  });
  // Click
  parent.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = drop.classList.contains('open');
    closeAllIdDropdowns();
    if (!isOpen) drop.classList.add('open');
  });
  drop.addEventListener('click', e => e.stopPropagation());
}
  
function closeAllIdDropdowns() {
  ['link-dropdown-1', 'link-dropdown-2'].forEach(id => {
    const d = document.getElementById(id);
    if (d) d.classList.remove('open');
  });
}

setupDropdown('link-dropdown-1');
setupDropdown('link-dropdown-2');
// --- Clean link-dropdown logic ---
document.querySelectorAll('.dropdown-parent').forEach(parent => {
  const drop = parent.querySelector('.link-dropdown');
  if (!drop) return;
  // Hover
  parent.addEventListener('mouseenter', () => {
    closeAllLinkDropdowns();
    drop.classList.add('open');
  });
  parent.addEventListener('mouseleave', () => {
    drop.classList.remove('open');
  });
  // Click
  parent.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = drop.classList.contains('open');
    closeAllLinkDropdowns();
    if (!isOpen) drop.classList.add('open');
  });
  // Prevent click inside dropdown from closing it
  drop.addEventListener('click', e => e.stopPropagation());
});

function closeAllLinkDropdowns() {
  document.querySelectorAll('.link-dropdown.open').forEach(d => d.classList.remove('open'));
}

// Close all on outside click
document.addEventListener('click', () => closeAllLinkDropdowns());
// --- Sign-in dropdown logic ---
const signInBtn = document.getElementById('sign-in');
const signinDropdown = document.getElementById('signin-dropdown');
const signinContainer = document.getElementById('signin-dropdown-container');

if (signInBtn && signinDropdown && signinContainer) {
  signInBtn.addEventListener('click', () => {
    signinDropdown.style.display = signinDropdown.style.display === 'flex' ? 'none' : 'flex';
  });
  signinContainer.addEventListener('mouseleave', () => {
    signinDropdown.style.display = 'none';
  });
  signinContainer.addEventListener('mouseenter', () => {
    signinDropdown.style.display = 'flex';
  });
}
// JS (put in a script tag or login.js / main.js)
// Clears the prefilled word "search" on focus and restores it on blur if empty.
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');

if (searchInput) {
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().toLowerCase() === 'search') searchInput.value = '';
  });

  searchInput.addEventListener('blur', () => {
    if (searchInput.value.trim() === '') searchInput.value = 'search';
  });
}

// Handle search: redirect to category page with search query
searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q || q.toLowerCase() === 'search') {
    // show a tiny shake to indicate empty search
    searchInput.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 200 });
    return;
  }
  // Redirect to category page with search query
  window.location.href = `/catergory/?q=${encodeURIComponent(q)}`;
});

// Also search on Enter key
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});





const dropdown = document.getElementById("dropdown");
const dropdownHeader = document.getElementById("dropdown-header");
const radios = document.querySelectorAll('#language-form input[type="radio"]');
const selectedLang = document.getElementById("selected-language");
const dropdownArrow = document.getElementById("dropdown-arrow");

// Open dropdown on click or hover
if (dropdownHeader && dropdown) {
  dropdownHeader.setAttribute('tabindex','0');
  dropdownHeader.addEventListener("click", () => {
    dropdown.classList.toggle("open");
  });
  dropdownHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropdown.classList.toggle('open'); }
    if (e.key === 'Escape') dropdown.classList.remove('open');
  });
  dropdown.addEventListener("mouseenter", () => {
    dropdown.classList.add("open");
  });
  dropdown.addEventListener("mouseleave", () => {
    dropdown.classList.remove("open");
  });
}

// When a radio is selected, show in header
const langFlagMap = {
  'English': '🇬🇧',
  'French': '🇫🇷',
  'Spanish': '🇪🇸',
  'German': '🇩🇪',
  'Italian': '🇮🇹'
};

// Update header display when radios change
if (radios && radios.length){
  radios.forEach(r => r.addEventListener('change', (e)=>{
    const v = e.target.value;
    const flag = langFlagMap[v] || '';
    if (flag && selectedLang) selectedLang.innerHTML = flag;
  }));
}

// --- Link dropdown logic ---
document.querySelectorAll('.link-dropdown').forEach(drop => {
  const parent = drop.parentElement;
  if (parent) {
    // Open on hover
    parent.addEventListener('mouseenter', () => {
      closeAllLinkDropdowns();
      drop.classList.add('open');
    });
    parent.addEventListener('mouseleave', () => {
      drop.classList.remove('open');
    });
    // Open/close on click
    parent.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.classList.contains('open');
      closeAllLinkDropdowns();
      if (!isOpen) drop.classList.add('open');
    });
  }
  // Prevent click inside dropdown from closing it
  drop.addEventListener('click', e => e.stopPropagation());
});
// Optional: close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove("open");
  }
});

// Mobile menu toggle: accessible drawer with overlay + focus trap
(function(){
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const page2 = document.getElementById('page2');
  if (!mobileBtn || !page2) return;

  // Make button accessible
  mobileBtn.setAttribute('role', 'button');
  mobileBtn.setAttribute('aria-controls', 'page2');
  mobileBtn.setAttribute('aria-expanded', 'false');

  // Create overlay element (reused)
  let overlay = document.createElement('div');
  overlay.className = 'page-overlay';
  document.body.appendChild(overlay);

  // Create mobile drawer wrapper for page2 content when open
  function openMobileNav(){
    document.body.classList.add('mobile-nav-open');
    mobileBtn.setAttribute('aria-expanded', 'true');
    overlay.classList.add('open');
    // move focus to first link inside page2
    const firstFocusable = page2.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
    trapFocus(page2);
  }

  function closeMobileNav(){
    document.body.classList.remove('mobile-nav-open');
    mobileBtn.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('open');
    releaseFocusTrap();
    mobileBtn.focus();
  }

  mobileBtn.addEventListener('click', function(e){
    e.stopPropagation();
    if (document.body.classList.contains('mobile-nav-open')) closeMobileNav(); else openMobileNav();
  });

  overlay.addEventListener('click', closeMobileNav);

  // Close when resizing to larger screens
  window.addEventListener('resize', function(){
    if (window.innerWidth > 860) closeMobileNav();
  });

  // Close when any nav link is clicked (navigate)
  page2.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));

  // Close on Escape key
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      if (document.body.classList.contains('mobile-nav-open')) closeMobileNav();
      // close any open dropdowns
      document.querySelectorAll('.link-dropdown.open, #dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });

  // Focus trap helpers
  let lastFocused = null;
  function trapFocus(container){
    lastFocused = document.activeElement;
    const focusable = Array.from(container.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length-1];
    function handleTab(e){
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    container._trapHandler = handleTab;
    document.addEventListener('keydown', handleTab);
  }
  function releaseFocusTrap(){
    const container = page2;
    if (container._trapHandler) document.removeEventListener('keydown', container._trapHandler);
    if (lastFocused) lastFocused.focus();
    lastFocused = null;
  }
})();

// Swipe support for slides (page3a and page4b)
(function(){
  function addSwipe(el, onLeft, onRight){
    let startX = 0; let startY = 0; let startTime = 0;
    const threshold = 40; // required min distance (px)
    const restraint = 100; // max vertical displacement
    el.addEventListener('touchstart', function(e){
      const t = e.changedTouches[0]; startX = t.pageX; startY = t.pageY; startTime = Date.now();
    }, {passive:true});
    el.addEventListener('touchend', function(e){
      const t = e.changedTouches[0]; const distX = t.pageX - startX; const distY = t.pageY - startY; const elapsed = Date.now() - startTime;
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint && elapsed < 1000){
        if (distX < 0) onLeft(); else onRight();
      }
    });
  }

  const slidesContainer = document.querySelector('#page3a #slides');
  if (slidesContainer){
    addSwipe(slidesContainer, function(){ document.getElementById('next-btn')?.click(); }, function(){ document.getElementById('prev-btn')?.click(); });
  }

  const slides4b = document.getElementById('page4b-slides');
  if (slides4b){
    addSwipe(slides4b, function(){ document.getElementById('next-btn')?.click(); }, function(){ document.getElementById('prev-btn')?.click(); });
  }
})();



// for slide show page3a
document.addEventListener('DOMContentLoaded', function() {
  const slideshow = document.getElementById("page3a");
  if (!slideshow) return;
 const images = [
   // Museum art landscape (public domain, The Met)
   "https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg", // Van Gogh, Wheat Field with Cypresses
   "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80", // Classic sculpture
   "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80", // Gallery with paintings
   "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=80"  // Abstract art in museum
 ];
  const slidesContainer = slideshow.querySelector('#slides');
  // Clear any existing slides
  slidesContainer.innerHTML = '';
  images.forEach((img, idx) => {
    const slide = document.createElement('div');
    slide.id = 'slide';
    slide.style.backgroundImage = `url('${img}')`;
    slide.style.minWidth = '100%';
    slide.style.height = '100%';
    slide.style.position = 'relative';
    // Add the [ILLUMIA] overlay
    const overlay = document.createElement('div');
    overlay.id = 'page3a-name';
    overlay.textContent = '[ILLUMIA]';
    slide.appendChild(overlay);
    slidesContainer.appendChild(slide);
  });
  let i = 0;
  function showSlide(idx) {
    slidesContainer.style.transform = `translateX(-${idx * 100}%)`;
  }
  showSlide(i);
  setInterval(() => {
    i = (i + 1) % images.length;
    showSlide(i);
  }, 9000);
});




// for 2nd search (page3c) -- restore value/blur/focus logic
const lookupInput = document.getElementById('page3c-search-input');
const lookupBtn = document.getElementById('search-btn2');

if (lookupInput && lookupBtn) {
  lookupInput.removeAttribute('readonly');

  lookupInput.addEventListener('focus', () => {
    if (lookupInput.value.trim() === 'What Are You Curious About?') lookupInput.value = '';
  });

  lookupInput.addEventListener('blur', () => {
    if (lookupInput.value.trim() === '') lookupInput.value = 'What Are You Curious About?';
  });

  lookupBtn.addEventListener('click', () => {
    const q = lookupInput.value.trim();
    if (!q || q === 'What Are You Curious About?') {
      // show a tiny shake to indicate empty search
      lookupInput.animate([
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(6px)' },
        { transform: 'translateX(0)' }
      ], { duration: 200 });
      return;
    }
      // Redirect to category page with search query
    window.location.href = `/catergory/?q=${encodeURIComponent(q)}`;
  });
}

// AJAX loader removed per user request — page2 links will navigate to /catergory/?q=... for server-rendered results



// home.js

// document.addEventListener('DOMContentLoaded', () => {
//   // For #page3 slides (assuming one at a time, full width)
//   const page3Slides = document.querySelector('#page3a #slides');
//   if (page3Slides) {
//     let page3Index = 0;
//     const page3SlideCount = page3Slides.children.length;
//     setInterval(() => {
//       page3Index = (page3Index + 1) % page3SlideCount;
//       page3Slides.style.transform = `translateX(-${page3Index * 100}%)`;
//     }, 5000);
//   }

  // For #page4b slideshow (groups of 4 for grid)
  const slidesContainer4b = document.getElementById('page4b-slides');
  if (slidesContainer4b) {
    let currentIndex = 0;
    const slides = slidesContainer4b.querySelectorAll('.slide');
    const slideCount = slides.length;
    const groupSize = 3;

    function showSlides(idx) {
      slidesContainer4b.style.transition = 'transform 0.5s ease-in-out';
      slidesContainer4b.style.transform = `translateX(-${idx * 100}%)`;
    }

    function nextSlide() {
      currentIndex = (currentIndex + 1) % Math.ceil(slideCount / groupSize);
      showSlides(currentIndex);
    }

    function prevSlide() {
      currentIndex = (currentIndex - 1 + Math.ceil(slideCount / groupSize)) % Math.ceil(slideCount / groupSize);
      showSlides(currentIndex);
    }

    // Auto-slide every 5 seconds
    let autoSlideInterval = setInterval(nextSlide, 5000);

    // Pause on hover
    slidesContainer4b.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
    slidesContainer4b.addEventListener('mouseleave', () => {
      autoSlideInterval = setInterval(nextSlide, 5000);
    });

    // Buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    // Initial display
    showSlides(currentIndex);
  }

  // Dropdown handling
  const dropdowns = document.querySelectorAll('#dropdown, #course');
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('click', () => dropdown.classList.toggle('open'));
  });

  document.addEventListener('click', (e) => {
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
    });
  });

  const button1 = document.getElementById('faq-question-1');
button1.addEventListener('click', () => {
    const faqItem = button1.parentElement;
    const isActive = faqItem.classList.toggle('active');
    const icon = button1.querySelector('span');
    icon.textContent = isActive ? '-' : '+';
    button1.setAttribute('aria-expanded', isActive ? 'true' : 'false');
});

const button2 = document.getElementById('faq-question-2');
button2.addEventListener('click', () => {
    const faqItem = button2.parentElement;
    const isActive = faqItem.classList.toggle('active');
    const icon = button2.querySelector('span');
    icon.textContent = isActive ? '-' : '+';
    button2.setAttribute('aria-expanded', isActive ? 'true' : 'false');
});

const button3 = document.getElementById('faq-question-3');
button3.addEventListener('click', () => {
    const faqItem = button3.parentElement;
    const isActive = faqItem.classList.toggle('active');
    const icon = button3.querySelector('span');
    icon.textContent = isActive ? '-' : '+';
    button3.setAttribute('aria-expanded', isActive ? 'true' : 'false');
});

// Repeat for additional items, e.g., const button4 = document.getElementById('faq-question-4'); ...

// Testimonial rotator: accessible, keyboard-friendly, respects reduced-motion
document.addEventListener('DOMContentLoaded', () => {
  const rotator = document.querySelector('.testimonial-rotator');
  if (!rotator) return;
  const items = Array.from(rotator.querySelectorAll('.testimonial-item'));
  const prevBtn = document.querySelector('.testimonial-prev');
  const nextBtn = document.querySelector('.testimonial-next');
  let idx = items.findIndex(i => i.classList.contains('active'));
  if (idx < 0) idx = 0;

  function show(i) {
    items.forEach((it, k) => {
      const active = k === i;
      it.classList.toggle('active', active);
      it.classList.toggle('visually-hidden', !active);
      it.setAttribute('aria-hidden', String(!active));
    });
  }

  show(idx);
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let interval = null;

  function start() {
    if (prefersReduced || items.length < 2) return;
    stop();
    interval = setInterval(() => {
      idx = (idx + 1) % items.length;
      show(idx);
    }, 5000);
  }
  function stop() { if (interval) { clearInterval(interval); interval = null; } }

  if (nextBtn) nextBtn.addEventListener('click', () => { idx = (idx + 1) % items.length; show(idx); stop(); start(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { idx = (idx - 1 + items.length) % items.length; show(idx); stop(); start(); });

  rotator.addEventListener('mouseenter', stop);
  rotator.addEventListener('mouseleave', start);
  rotator.addEventListener('focusin', stop);
  rotator.addEventListener('focusout', start);

  rotator.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { idx = (idx - 1 + items.length) % items.length; show(idx); stop(); start(); }
    if (e.key === 'ArrowRight') { idx = (idx + 1) % items.length; show(idx); stop(); start(); }
  });

  // Start autoplay if allowed
  start();
});