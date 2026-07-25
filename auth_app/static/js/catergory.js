// catergory.js — rebuilt to use the real Django backend

let userFavouriteKeys = [];
let userBookmarkKeys = [];

// ============================================
// SEARCH BOX
// ============================================
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

if (searchBtn && searchInput) {
  searchBtn.addEventListener('click', () => {
    const q = searchInput.value.trim();
    if (!q || q.toLowerCase() === 'search') {
      searchInput.animate(
        [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 200 }
      );
      return;
    }
    window.location.href = `/accounts/catergory/?q=${encodeURIComponent(q)}`;
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });
}

// ============================================
// HELPER: get CSRF token (Django needs this for non-GET requests)
// ============================================
function getCsrfToken() {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// ============================================
// LOAD USER'S CURRENT FAVOURITES/BOOKMARKS
// (so buttons show correct state on page load)
// ============================================
async function loadUserLibraryStatus() {
  try {
    const response = await fetch('/accounts/library-status/');
    const data = await response.json();
    userFavouriteKeys = data.favourites || [];
    userBookmarkKeys = data.bookmarks || [];
  } catch (error) {
    console.error('Could not load library status:', error);
  }
}

// ============================================
// FETCH + RENDER BOOKS
// ============================================
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function loadEbooks(query = 'fantasy') {
  const listContainer = document.getElementById('ebooks-list');
  if (!listContainer) return;

  listContainer.classList.add('loading');
  const numToFetch = 20;
  const numToDisplay = 20;

  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${numToFetch}`);
    const data = await response.json();

    if (data.docs && data.docs.length > 0) {
      const shuffledBooks = shuffleArray(data.docs);
      const randomBooks = shuffledBooks.slice(0, numToDisplay);
      listContainer.innerHTML = '';

      randomBooks.forEach(book => {
        const key = book.key || '';
        const title = book.title || 'Untitled';
        const author = book.author_name ? book.author_name.join(', ') : 'Unknown';
        const coverUrl = book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : 'https://via.placeholder.com/300x400/131c2e/4a5568?text=No+Cover';

        const isFavourited = userFavouriteKeys.includes(key);
        const isBookmarked = userBookmarkKeys.includes(key);
        const year = book.first_publish_year || '\u2014';

        const bookItem = document.createElement('div');
        bookItem.className = 'book-card';
        bookItem.innerHTML = `
          <div class="book-cover-wrap">
            <img src="${coverUrl}" alt="Cover">
            <span class="year-badge">${year}</span>
            <div class="book-card-buttons" data-key="${key}" data-title="${title}" data-author="${author}">
              <button class="bookmark-btn ${isBookmarked ? 'is-active' : ''}" aria-label="Bookmark">&#128278;</button>
              <button class="favorite-btn ${isFavourited ? 'is-active' : ''}" aria-label="Favourite">&#9733;</button>
            </div>
          </div>
         <a href="https://openlibrary.org${key}" target="_blank" class="view-book-link download-btn" data-key="${key}">
            <span class="download-icon">&#8595;</span> Download
          </a>
          <button onclick="openReader('${key}')" class="read-btn">📖 Read</button>
          <button onclick="summarizeBook('${key}')" class="summarize-btn">📝 Summary</button>
          </div>
        `;

        listContainer.appendChild(bookItem);
      });

      addBookButtons();
      addViewTracking();
    } else {
      listContainer.innerHTML = '<p>No books found for this category.</p>';
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    listContainer.innerHTML = '<p>Something went wrong while loading results. Please try again later.</p>';
  } finally {
    listContainer.classList.remove('loading');
  }
}

// ============================================
// WIRE UP BOOKMARK / FAVOURITE BUTTONS
// ============================================
function addBookButtons() {
  const containers = document.querySelectorAll('.book-card-buttons');

  containers.forEach(container => {
    const key = container.getAttribute('data-key');
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;

    const bookmarkBtn = container.querySelector('.bookmark-btn');
    const favoriteBtn = container.querySelector('.favorite-btn');

    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const response = await fetch(`/accounts/toggle-bookmark/${cleanKey}/`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const data = await response.json();
          if (data.status === 'added') {
            bookmarkBtn.classList.add('is-active');
          } else if (data.status === 'removed') {
            bookmarkBtn.classList.remove('is-active');
          } else {
            alert(data.error || 'Something went wrong');
          }
        } catch (error) {
          console.error('Bookmark toggle failed:', error);
        }
      });
    }

    if (favoriteBtn) {
      favoriteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const response = await fetch(`/accounts/toggle-favourite/${cleanKey}/`, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const data = await response.json();
          if (data.status === 'added') {
            favoriteBtn.classList.add('is-active');
          } else if (data.status === 'removed') {
            favoriteBtn.classList.remove('is-active');
          } else {
            alert(data.error || 'Something went wrong');
          }
        } catch (error) {
          console.error('Favourite toggle failed:', error);
        }
      });
    }
  });
}

function addViewTracking() {
  const viewLinks = document.querySelectorAll('.view-book-link');
  viewLinks.forEach(link => {
    link.addEventListener('click', () => {
      const key = link.getAttribute('data-key');
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      fetch(`/accounts/mark-viewed/${cleanKey}/`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).catch(error => console.error('Could not record view:', error));
      // Link still opens normally — we don't prevent default
        fetch(`/accounts/record-download/${cleanKey}/`, {
        method: 'GET',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      }).catch(error => console.error('Could not record download:', error));
    });
  });
}

// ============================================
// QUICK ACCESS NAV — Bookmarks / Favorites / Recent
// (now pulls REAL data from the database, not localStorage)
// ============================================
function showModal(title, items) {
  const modal = document.createElement('div');
  modal.className = 'quick-modal';
  modal.innerHTML = `
    <div class="quick-modal-content">
      <div class="quick-modal-header">
        <h3>${title}</h3>
        <button class="quick-modal-close">&times;</button>
      </div>
      <div class="quick-modal-list">
        ${items.length > 0
          ? items.map(item => `<div class="quick-item"><span>${item.title}</span><small>${item.author}</small></div>`).join('')
          : '<p class="empty-msg">No items yet</p>'
        }
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.quick-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function showFavouritesModal() {
  try {
    const response = await fetch('/accounts/my-favourites/');
    const data = await response.json();
    showModal('My favourites', data.favourites || []);
  } catch (error) {
    console.error('Could not load favourites:', error);
  }
}

async function showBookmarksModal() {
  try {
    const response = await fetch('/accounts/my-bookmarks/');
    const data = await response.json();
    showModal('My bookmarks', data.bookmarks || []);
  } catch (error) {
    console.error('Could not load bookmarks:', error);
  }
}

async function showRecentModal() {
  try {
    const response = await fetch('/accounts/my-recent/');
    const data = await response.json();
    showModal('Recently viewed', data.recent || []);
  } catch (error) {
    console.error('Could not load recent items:', error);
  }
}

// ============================================
// INITIALIZE PAGE
// ============================================
async function initializePageScripts() {
  await loadUserLibraryStatus();

  const bookmarksBtn = document.getElementById('bookmarks-nav-btn');
  const favoritesBtn = document.getElementById('favorites-nav-btn');
  const recentBtn = document.getElementById('recent-nav-btn');

  if (bookmarksBtn) bookmarksBtn.addEventListener('click', showBookmarksModal);
  if (favoritesBtn) favoritesBtn.addEventListener('click', showFavouritesModal);
  if (recentBtn) recentBtn.addEventListener('click', showRecentModal);

  const urlParams = new URLSearchParams(window.location.search);
  const raw = urlParams.get('q') || urlParams.get('query') || 'fantasy';
  const query = raw ? decodeURIComponent(raw) : 'fantasy';

  const listContainer = document.getElementById('ebooks-list');
  if (listContainer) {
    loadEbooks(query);
    const titleEl = document.getElementById('category-title');
    if (titleEl) titleEl.textContent = `${query.charAt(0).toUpperCase() + query.slice(1).replace(/\+/g, ' ')} Category`;
  }
}


// ============================================
// IN-SITE BOOK READER — client-side Gutendex
// ============================================
let currentBookKey = null;
let currentPage = 1;
let totalPages = 1;
let bookPages = [];
let currentBookTitle = '';
let currentBookAuthor = '';

async function openReader(bookKey) {
  currentBookKey = bookKey;
  currentPage = 1;
  bookPages = [];

  const modal = document.getElementById('book-reader-modal');
  const content = document.getElementById('reader-content');

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  content.innerHTML = '<p style="text-align:center; color:#7d8aa3; padding:40px 0;">Loading book...</p>';

  // Get book title from the card
  const card = document.querySelector(`.book-card-buttons[data-key="${bookKey}"]`);
  currentBookTitle = card ? card.getAttribute('data-title') : 'Unknown Title';
  currentBookAuthor = card ? card.getAttribute('data-author') : 'Unknown Author';

  document.getElementById('reader-title').textContent = currentBookTitle;
  document.getElementById('reader-author').textContent = currentBookAuthor;

  try {
    // Search Gutendex directly from browser
    const searchRes = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(currentBookTitle)}`);
    const searchData = await searchRes.json();
    const results = searchData.results || [];

    if (!results.length) {
      content.innerHTML = '<p style="text-align:center; color:#ff6b6b; padding:40px 0;">This book is not available for reading. Try the download link instead.</p>';
      return;
    }

    const formats = results[0].formats || {};
    let textUrl = null;

    for (const [key, url] of Object.entries(formats)) {
      if (key.includes('text/plain') && key.toLowerCase().includes('utf-8')) {
        textUrl = url;
        break;
      }
    }
    if (!textUrl) {
      for (const [key, url] of Object.entries(formats)) {
        if (key.includes('text/plain')) {
          textUrl = url;
          break;
        }
      }
    }

    if (!textUrl) {
      content.innerHTML = '<p style="text-align:center; color:#ff6b6b; padding:40px 0;">No readable text version found for this book.</p>';
      return;
    }

    const textRes = await fetch(textUrl);
    let bookText = await textRes.text();

    // Strip Gutenberg boilerplate
    const startMarkers = ['*** START OF THE PROJECT', '*** START OF THIS PROJECT', '***START OF THE PROJECT'];
    const endMarkers = ['*** END OF THE PROJECT', '*** END OF THIS PROJECT', '***END OF THE PROJECT'];

    for (const marker of startMarkers) {
      const idx = bookText.indexOf(marker);
      if (idx !== -1) {
        const eol = bookText.indexOf('\n', idx);
        bookText = bookText.slice(eol + 1);
        break;
      }
    }
    for (const marker of endMarkers) {
      const idx = bookText.indexOf(marker);
      if (idx !== -1) {
        bookText = bookText.slice(0, idx);
        break;
      }
    }

    bookText = bookText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let paragraphs = bookText.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);

    if (paragraphs.length < 5) {
      const lines = bookText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      paragraphs = [];
      for (let i = 0; i < lines.length; i += 6) {
        const chunk = lines.slice(i, i + 6).join(' ');
        if (chunk) paragraphs.push(chunk);
      }
    }

    // Split into pages of 8 paragraphs
    const perPage = 8;
    bookPages = [];
    for (let i = 0; i < paragraphs.length; i += perPage) {
      bookPages.push(paragraphs.slice(i, i + perPage).join('\n\n'));
    }

    if (!bookPages.length) bookPages = ['No content available.'];

    totalPages = bookPages.length;
    renderPage(1);

    // Record view in Django (fire and forget)
    const cleanKey = bookKey.startsWith('/') ? bookKey.slice(1) : bookKey;
    fetch(`/accounts/mark-viewed/${cleanKey}/`, { method: 'GET', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).catch(() => {});

  } catch (error) {
    content.innerHTML = `<p style="text-align:center; color:#ff6b6b; padding:40px 0;">Could not load book. Please try again.</p>`;
    console.error('Reader error:', error);
  }
}

function renderPage(page) {
  currentPage = page;
  const content = document.getElementById('reader-content');
  const pageContent = bookPages[page - 1] || '';

  const paragraphs = pageContent
    .split(/\n\n+/)
    .filter(p => p.trim().length > 0)
    .map(p => `<p style="margin-bottom:1.4em;">${p.replace(/\n/g, ' ').trim()}</p>`)
    .join('');

  content.innerHTML = paragraphs;
  content.scrollTop = 0;

  document.getElementById('reader-page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  const progress = (currentPage / totalPages) * 100;
  document.getElementById('reader-progress-bar').style.width = progress + '%';

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  if (prevBtn) prevBtn.style.opacity = currentPage <= 1 ? '0.4' : '1';
  if (nextBtn) nextBtn.style.opacity = currentPage >= totalPages ? '0.4' : '1';

  // Watermark
  const watermark = document.getElementById('reader-watermark');
  if (watermark) watermark.textContent = document.body.getAttribute('data-username') || '';
}

async function loadPage(page) {
  renderPage(page);
}

async function changePage(direction) {
  const newPage = currentPage + direction;
  if (newPage < 1 || newPage > totalPages) return;
  renderPage(newPage);
}

async function jumpToPage() {
  const input = document.getElementById('page-jump-input');
  const pageNum = parseInt(input.value);
  if (!pageNum || pageNum < 1 || pageNum > totalPages) {
    input.style.borderColor = '#ff6b6b';
    setTimeout(() => input.style.borderColor = '#2d3f5a', 1000);
    return;
  }
  input.value = '';
  renderPage(pageNum);
}

// ============================================
// RATINGS & REVIEWS
// ============================================
let selectedStars = 0;

function switchTab(tab) {
    const readContent = document.getElementById('reader-content');
    const ratingsPanel = document.getElementById('ratings-panel');
    const readerFooter = document.getElementById('reader-footer');
    const tabRead = document.getElementById('tab-read');
    const tabRate = document.getElementById('tab-rate');

    if (tab === 'read') {
        readContent.style.display = 'block';
        ratingsPanel.style.display = 'none';
        readerFooter.style.display = 'flex';
        tabRead.style.color = '#00f0ff';
        tabRead.style.borderBottom = '2px solid #00f0ff';
        tabRate.style.color = '#566c80';
        tabRate.style.borderBottom = '2px solid transparent';
    } else {
        readContent.style.display = 'none';
        ratingsPanel.style.display = 'flex';
        ratingsPanel.style.flexDirection = 'column';
        readerFooter.style.display = 'none';
        tabRead.style.color = '#566c80';
        tabRead.style.borderBottom = '2px solid transparent';
        tabRate.style.color = '#00f0ff';
        tabRate.style.borderBottom = '2px solid #00f0ff';
        loadRatings();
    }
}
function selectStar(num) {
    selectedStars = num;
    const stars = document.querySelectorAll('#star-selector span');
    stars.forEach((s, i) => {
        s.textContent = i < num ? '★' : '☆';
        s.style.color = i < num ? '#facc15' : '#566c80';
    });
}

async function loadRatings() {
    if (!currentBookKey) return;
    const cleanKey = currentBookKey.startsWith('/') ? currentBookKey.slice(1) : currentBookKey;

    try {
        const response = await fetch(`/accounts/book-ratings/${cleanKey}/`);
        const data = await response.json();

        // Update average display
        const avgDisplay = document.getElementById('avg-stars-display');
        const avgText = document.getElementById('avg-rating-text');

        if (data.avg_rating) {
            const fullStars = Math.round(data.avg_rating);
            avgDisplay.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
            avgDisplay.style.color = '#facc15';
            avgText.textContent = `${data.avg_rating} out of 5 · ${data.total_ratings} rating${data.total_ratings !== 1 ? 's' : ''}`;
        } else {
            avgDisplay.textContent = '☆☆☆☆☆';
            avgDisplay.style.color = '#566c80';
            avgText.textContent = 'No ratings yet — be the first!';
        }

        // Pre-fill user's existing rating if they have one
        if (data.user_rating) {
            selectStar(data.user_rating);
            document.getElementById('review-input').value = data.user_review || '';
        }

        // Render reviews list
        const list = document.getElementById('reviews-list');
        if (data.reviews.length === 0) {
            list.innerHTML = '<p style="color:#566c80; font-size:13px; text-align:center; padding:20px 0;">No reviews yet.</p>';
        } else {
            list.innerHTML = data.reviews.map(r => `
                <div style="padding:14px 0; border-bottom:1px solid rgba(0,240,255,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:13px; font-weight:700; color:#c8d8e8;">${r.username}</span>
                        <span style="font-size:11px; color:#566c80;">${r.date}</span>
                    </div>
                    <div style="color:#facc15; font-size:16px; margin-bottom:6px;">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
                    ${r.review ? `<p style="font-size:13px; color:#9cb1c4; line-height:1.6;">${r.review}</p>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Could not load ratings:', error);
    }
}

async function submitRating() {
    if (!currentBookKey || selectedStars === 0) {
        const feedback = document.getElementById('rating-feedback');
        feedback.textContent = 'Please select a star rating first.';
        feedback.style.color = '#ff007f';
        feedback.style.display = 'block';
        return;
    }

    const cleanKey = currentBookKey.startsWith('/') ? currentBookKey.slice(1) : currentBookKey;
    const review = document.getElementById('review-input').value.trim();
    const feedback = document.getElementById('rating-feedback');

    const formData = new FormData();
    formData.append('stars', selectedStars);
    formData.append('review', review);
    formData.append('csrfmiddlewaretoken', getCsrfToken());

    try {
        const response = await fetch(`/accounts/rate-book/${cleanKey}/`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.error) {
            feedback.textContent = data.error;
            feedback.style.color = '#ff007f';
        } else {
            feedback.textContent = data.status === 'created' ? '✅ Rating submitted!' : '✅ Rating updated!';
            feedback.style.color = '#00f0ff';
            feedback.style.display = 'block';
            setTimeout(() => { feedback.style.display = 'none'; }, 3000);
            loadRatings();
        }
    } catch (error) {
        feedback.textContent = 'Something went wrong. Please try again.';
        feedback.style.color = '#ff007f';
        feedback.style.display = 'block';
        console.error('Rating error:', error);
    }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePageScripts);
} else {
  initializePageScripts();
}

async function summarizeBook(bookKey) {
    const cleanKey = bookKey.startsWith('/') ? bookKey.slice(1) : bookKey;

    // Show loading modal
    const modal = document.createElement('div');
    modal.id = 'summary-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); z-index:6000; display:flex; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div style="background:#0a0f18; border:1px solid rgba(0,240,255,0.2); border-radius:16px; width:90%; max-width:700px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 0 60px rgba(0,240,255,0.08);">
            <div style="padding:18px 26px; border-bottom:1px solid rgba(0,240,255,0.1); display:flex; justify-content:space-between; align-items:center; background:rgba(0,240,255,0.03);">
                <div style="font-family:'Orbitron',sans-serif; font-size:13px; font-weight:700; color:#00f0ff; letter-spacing:0.5px;">📝 Book Summary</div>
                <button onclick="document.getElementById('summary-modal').remove(); document.body.style.overflow='auto';" style="background:rgba(255,0,127,0.08); border:1px solid rgba(255,0,127,0.25); color:#ff007f; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:14px;">✕</button>
            </div>
            <div id="summary-content" style="flex:1; overflow-y:auto; padding:30px 40px; font-family:Georgia,serif; font-size:16px; line-height:1.9; color:#c8d8e8;">
                <p style="text-align:center; color:#566c80;">Generating summary...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });

    try {
        const response = await fetch(`/accounts/summarize/${cleanKey}/`);
        const data = await response.json();
        const content = document.getElementById('summary-content');

        if (data.error) {
            content.innerHTML = `<p style="color:#ff6b6b; text-align:center;">${data.error}</p>`;
        } else {
            content.innerHTML = `
                <h3 style="font-family:'Orbitron',sans-serif; font-size:14px; color:#00f0ff; margin-bottom:4px;">${data.title}</h3>
                <p style="font-size:12px; color:#566c80; text-transform:uppercase; letter-spacing:1px; margin-bottom:20px;">${data.author}</p>
                <div style="border-left:3px solid rgba(0,240,255,0.3); padding-left:20px;">
                    <p style="color:#c8d8e8; line-height:1.9;">${data.summary}</p>
                </div>
                <p style="margin-top:16px; font-size:11px; color:#566c80; text-align:right;">Generated from ${data.sentence_count} key sentences · Powered by NLTK</p>
            `;
        }
    } catch (error) {
        document.getElementById('summary-content').innerHTML = '<p style="color:#ff6b6b; text-align:center;">Could not generate summary. Please try again.</p>';
    }
}