from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from django.shortcuts import render,redirect
from django.contrib.auth import authenticate,login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import ContactMessage, Book, Favourite, Bookmark, RecentlyViewed, DownloadedBook, Rating
from django.views import View
from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.urls import reverse
from django.core.mail import send_mail
from django.conf import settings
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.probability import FreqDist
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Avg
from django.utils import timezone
from django.core.files.storage import default_storage
import urllib.request
import urllib.parse
import json
import requests
import numpy as np
import nltk 


# import the RegisterForm and ContactForm from forms .py
from .forms import RegisterForm, ContactForm
# from .models import pant

def Register_view(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data.get("username")
            password = form.cleaned_data.get("password")
            user = User.objects.create_user(username=username,password=password)
            login(request,  user)
            return redirect('home')
    else:
        form = RegisterForm()
    return render(request,'accounts/register.html',{"form":form})
    


def login_view(request):
    if request.method =='POST':
        username = request.POST.get("username") 
        password = request.POST.get("password") 

        user = authenticate(request, username =username, password =password)
        if user is not None:
            login(request, user)
            next_url=request.POST.get('next') or request.GET.get('next') or 'home1'
            return redirect(next_url)
        else:
            error_message="invalid credentials"
            return render(request,'accounts/login.html',{'error':error_message})
    return render(request,'accounts/login.html')

def logout_view(request):
    if request.method == "POST":
        logout(request)
        return redirect('login')
    else:
        return redirect('home')

# home_view
# using the decorator
@login_required
def home_view(request):
    discover_books = Book.objects.order_by('-created_at')[:3]
    favourite_count = Favourite.objects.filter(user=request.user).count()
    bookmark_count = Bookmark.objects.filter(user=request.user).count()
    recent_books = RecentlyViewed.objects.filter(user=request.user).select_related('book')[:3]

    # Get TF-IDF recommendations
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    recommendations = []
    try:
        all_books = Book.objects.exclude(description='').exclude(description=None)

        if all_books.count() >= 3:
            favourite_keys = list(Favourite.objects.filter(user=request.user).values_list('book__key', flat=True))
            bookmark_keys = list(Bookmark.objects.filter(user=request.user).values_list('book__key', flat=True))
            recent_keys = list(RecentlyViewed.objects.filter(user=request.user).values_list('book__key', flat=True)[:10])
            interacted_keys = list(set(favourite_keys + bookmark_keys + recent_keys))

            if interacted_keys:
                book_list = list(all_books)
                descriptions = [b.title + ' ' + b.description for b in book_list]

                vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
                tfidf_matrix = vectorizer.fit_transform(descriptions)

                interacted_indices = [i for i, b in enumerate(book_list) if b.key in interacted_keys]

                if interacted_indices:
                    user_profile = np.mean(tfidf_matrix[interacted_indices].toarray(), axis=0).reshape(1, -1)
                    similarity_scores = cosine_similarity(user_profile, tfidf_matrix)[0]

                    scored_books = [
                        (score, book_list[i])
                        for i, score in enumerate(similarity_scores)
                        if book_list[i].key not in interacted_keys
                    ]
                    scored_books.sort(key=lambda x: x[0], reverse=True)
                    recommendations = [b for score, b in scored_books[:6]]
            else:
                recommendations = list(all_books.order_by('-created_at')[:6])
    except Exception:
        recommendations = []

    context = {
        'discover_books': discover_books,
        'favourite_count': favourite_count,
        'bookmark_count': bookmark_count,
        'recent_books': recent_books,
        'recommendations': recommendations,
    }
    return render(request, "auth1_app/home.html", context)

    
# protected view
class protectedView(LoginRequiredMixin, View):
    login_url = '/accounts/login/'
    redirect_field_name = 'next'

    def get(self, request):
        return render(request, 'registration/protected.html')

# home1 view - protected page with different template
class home1View(LoginRequiredMixin, View):
    login_url = '/accounts/login/'
    redirect_field_name = 'next'

    def get(self, request):
        # Provide a blank ContactForm on GET so template can render it
        return render(request, 'registration/home1.html', {'contact_form': ContactForm()})


def contact_view(request):
    """Handle contact form submissions from the About/Contact section.
    On success, show a success message and redirect back to home1 (#contact-us).
    """
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            # Persist the message to the database
            name = form.cleaned_data.get('name')
            email = form.cleaned_data.get('email')
            message_text = form.cleaned_data.get('message')

            ContactMessage.objects.create(name=name, email=email, message=message_text)


            # Send a confirmation email to the visitor (console backend used in development)
            try:
                subject = 'Thanks for contacting Illumia'
                body = f"Hi {name},\n\nThanks for reaching out to Illumia. We received your message and will reply as soon as possible.\n\n— Illumia Team"
                send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)
            except Exception:
                # Don't break user flow if email fails in dev environment
                pass

            # Success message and redirect back to contact area
            messages.success(request, 'Thanks! Your message has been received. We will get back to you soon.')
            return redirect(reverse('home1') + '#contact-us')
        else:
            # Show validation errors on the same page
            messages.error(request, 'There were errors with your submission. Please check and try again.')
            return render(request, 'registration/home1.html', {'contact_form': form})
    # For non-POST requests, redirect back to Home
    return redirect('home1')


class catergoryView(LoginRequiredMixin, View):
    login_url = '/accounts/login/'
    redirect_field_name = 'next'

    def get(self, request):
        # Get search query from URL parameter
        search_query = request.GET.get('q', '')
        search_results = {}

        # Helper function to fetch books from OpenLibrary API
        def fetch_books_from_api(query_term, limit=20):
                """Fetch books from OpenLibrary for a given search term"""
                matched = []
                try:
                    base_url = 'https://openlibrary.org/search.json'
                    params = urllib.parse.urlencode({'q': query_term, 'limit': limit})
                    with urllib.request.urlopen(f'{base_url}?{params}', timeout=10) as resp:
                        data = json.load(resp)
                    docs = data.get('docs', [])
                    for doc in docs:
                        title = doc.get('title') or 'Untitled'
                        authors = doc.get('author_name') or []
                        author = ', '.join(authors) if authors else 'Unknown'
                        pages = doc.get('number_of_pages_median') or doc.get('first_publish_year') or ''
                        key = doc.get('key', '')
                        cover_id = doc.get('cover_i')
 
                        if key:
                            book_obj, created = Book.objects.get_or_create(
                                key=key,
                                defaults={
                                    'title': title,
                                    'author': author,
                                    'cover_id': str(cover_id) if cover_id else '',
                                    'pages': str(pages),
                                }
                            )

                        # If this is a new book fetch its description from OpenLibrary
                        if created and not book_obj.description:
                            try:
                                works_url = f'https://openlibrary.org{key}.json'
                                works_response = requests.get(works_url, timeout=5)
                                if works_response.status_code == 200:
                                    works_data = works_response.json()
                                    desc = works_data.get('description', '')
                                    if isinstance(desc, dict):
                                        desc = desc.get('value', '')
                                    if desc:
                                        book_obj.description = desc[:2000]
                                        book_obj.save()
                            except Exception:
                                pass

                        book = {
                            'title': title,
                            'author': author,
                            'pages': pages,
                            'key': key,
                            'cover_id': cover_id,
                        }
                        matched.append(book)
                except Exception as e:
                    print(f"SEARCH ERROR: {e}")

   
                return matched
            
        # If there's a search query, fetch matching books from OpenLibrary
        if search_query:
            matched = fetch_books_from_api(search_query, 40)
            if matched:
                search_results = {search_query: matched}
            else:
                search_results = {}
        else:
            # No search query — load real books from multiple popular categories
            # This replaces the mock category list with real ebooks
            default_categories = [
                'Science Fiction',
                'Mystery & Thriller',
                'Business & Economics',
                'History',
                'Self-Help',
                'Science',
                'Biography',
                'Technology'
            ]
            
            for category in default_categories:
                books = fetch_books_from_api(category, 15)
                if books:
                    search_results[category] = books

        context = {
            'search_query': search_query,
            'books_by_category': search_results,
            'total_categories': len(search_results),
        }
        return render(request, 'registration/catergory.html', context)



# Downloaded Books View
class downloadedBooksView(LoginRequiredMixin, View):
    def get(self, request):
        downloads = DownloadedBook.objects.filter(user=request.user).select_related('book')
        return render(request, 'registration/downloaded_books.html', {'downloads': downloads})

# PDF Download Endpoint
@login_required
def download_pdf(request, book_key):
    """
    Download PDF from OpenLibrary and serve to user
    Example: /download-pdf/v1/books%2Folm%2FOL1234M/
    """
    try:
        # Construct OpenLibrary PDF URL
        # OpenLibrary book IDs are encoded like: /v1/books/OL123M/
        pdf_url = f'https://openlibrary.org/api/v1/books{book_key}/pdf'
        
        # Try to fetch the PDF
        response = requests.get(pdf_url, timeout=30, stream=True)
        
        if response.status_code == 200:
            # Return PDF to browser for download
            http_response = HttpResponse(response.content, content_type='application/pdf')
            
            # Extract book title from request or use default
            book_title = request.GET.get('title', 'book')
            http_response['Content-Disposition'] = f'attachment; filename="{book_title}.pdf"'
            return http_response
        else:
            return JsonResponse({'error': 'PDF not available on OpenLibrary'}, status=404)
    except Exception as e:
        return JsonResponse({'error': f'Error downloading PDF: {str(e)}'}, status=500)



@login_required
def toggle_favourite(request, book_key):
    """Add or remove a book from the logged-in user's favourites"""
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    favourite, created = Favourite.objects.get_or_create(user=request.user, book=book)

    if not created:
        # It already existed, so this click means "remove it"
        favourite.delete()
        return JsonResponse({'status': 'removed'})

    return JsonResponse({'status': 'added'})


@login_required
def toggle_bookmark(request, book_key):
    """Add or remove a book from the logged-in user's bookmarks"""
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    bookmark, created = Bookmark.objects.get_or_create(user=request.user, book=book)

    if not created:
        bookmark.delete()
        return JsonResponse({'status': 'removed'})

    return JsonResponse({'status': 'added'})


@login_required
def get_user_library_status(request):
    """Returns the logged-in user's favourite and bookmark book keys as JSON"""
    favourite_keys = list(
        Favourite.objects.filter(user=request.user).values_list('book__key', flat=True)
    )
    bookmark_keys = list(
        Bookmark.objects.filter(user=request.user).values_list('book__key', flat=True)
    )
    return JsonResponse({
        'favourites': favourite_keys,
        'bookmarks': bookmark_keys,
    })


@login_required
def get_user_favourites(request):
    """Returns the logged-in user's full favourite book details as JSON"""
    favourites = Favourite.objects.filter(user=request.user).select_related('book')
    data = [
        {'title': f.book.title, 'author': f.book.author, 'key': f.book.key}
        for f in favourites
    ]
    return JsonResponse({'favourites': data})


@login_required
def get_user_bookmarks(request):
    """Returns the logged-in user's full bookmark book details as JSON"""
    bookmarks = Bookmark.objects.filter(user=request.user).select_related('book')
    data = [
        {'title': b.book.title, 'author': b.book.author, 'key': b.book.key}
        for b in bookmarks
    ]
    return JsonResponse({'bookmarks': data})


@login_required
def get_user_recent(request):
    """Returns the logged-in user's recently viewed books as JSON"""
    recent = RecentlyViewed.objects.filter(user=request.user).select_related('book')[:20]
    data = [
        {'title': r.book.title, 'author': r.book.author, 'key': r.book.key}
        for r in recent
    ]
    return JsonResponse({'recent': data})


@login_required
def mark_book_viewed(request, book_key):
    """Records that the logged-in user viewed this book (for Recently Viewed)"""
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()
    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    RecentlyViewed.objects.update_or_create(user=request.user, book=book)
    return JsonResponse({'status': 'recorded'})

@login_required
def record_download(request, book_key):
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()
    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)
    
    DownloadedBook.objects.get_or_create(user=request.user, book=book)
    return JsonResponse({'status': 'recorded'})

@login_required
def remove_download(request, book_key):
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()
    if book:
        DownloadedBook.objects.filter(user=request.user, book=book).delete()
    return JsonResponse({'status': 'removed'})




@login_required
def read_book(request, book_key):
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    page_num = int(request.GET.get('page', 1))
    cache_key = f'book_pages_{book_key}'
    cached = request.session.get(cache_key)

    if not cached:
        try:
            headers = {
                'User-Agent': 'Illumia/1.0 (https://illumia.onrender.com)'
            }
            
            search_url = f'https://gutendex.com/books/?search={urllib.parse.quote(book.title)}'
            
            # Retry up to 3 times
            response = None
            for attempt in range(3):
                try:
                    response = requests.get(search_url, timeout=30, headers=headers)
                    if response.status_code == 200 and response.text.strip():
                        break
                except requests.exceptions.RequestException:
                    if attempt == 2:
                        raise
                    continue

            if not response or not response.text.strip():
                return JsonResponse({'error': 'Could not reach book source. Please try again.'}, status=503)

            data = response.json()
            results = data.get('results', [])
            
            if not results:
                return JsonResponse({'error': 'This book is not available for reading.'}, status=404)

            formats = results[0].get('formats', {})
            text_url = None
            
            for key, url in formats.items():
                if 'text/plain' in key and 'utf-8' in key.lower():
                    text_url = url
                    break
            if not text_url:
                for key, url in formats.items():
                    if 'text/plain' in key:
                        text_url = url
                        break

            if not text_url:
                return JsonResponse({'error': 'No readable text version found.'}, status=404)

            text_response = requests.get(text_url, timeout=60, headers=headers)
            text_response.encoding = 'utf-8'
            book_text = text_response.text

            if not book_text.strip():
                return JsonResponse({'error': 'Book content is empty. Try again.'}, status=503)

            # Strip Gutenberg boilerplate
            start_markers = ['*** START OF THE PROJECT', '*** START OF THIS PROJECT', '***START OF THE PROJECT']
            end_markers = ['*** END OF THE PROJECT', '*** END OF THIS PROJECT', '***END OF THE PROJECT']

            for marker in start_markers:
                idx = book_text.find(marker)
                if idx != -1:
                    end_of_line = book_text.find('\n', idx)
                    book_text = book_text[end_of_line + 1:]
                    break

            for marker in end_markers:
                idx = book_text.find(marker)
                if idx != -1:
                    book_text = book_text[:idx]
                    break

            book_text = book_text.replace('\r\n', '\n').replace('\r', '\n')
            paragraphs = [p.strip() for p in book_text.split('\n\n') if p.strip()]

            if len(paragraphs) < 5:
                lines = [l.strip() for l in book_text.split('\n') if l.strip()]
                paragraphs = []
                for i in range(0, len(lines), 6):
                    chunk = ' '.join(lines[i:i+6])
                    if chunk:
                        paragraphs.append(chunk)

            paragraphs_per_page = 8
            pages = []
            for i in range(0, len(paragraphs), paragraphs_per_page):
                chunk = paragraphs[i:i + paragraphs_per_page]
                pages.append('\n\n'.join(chunk))

            if not pages:
                pages = ['No content available.']

            request.session[cache_key] = pages[:500]
            request.session.modified = True
            cached = request.session[cache_key]

        except Exception as e:
            import traceback
            print(f"READ BOOK ERROR: {traceback.format_exc()}")
            return JsonResponse({'error': f'Could not load book: {str(e)}'}, status=500)

    total_pages = len(cached)
    page_num = max(1, min(page_num, total_pages))
    page_content = cached[page_num - 1]

    return JsonResponse({
        'title': book.title,
        'author': book.author,
        'content': page_content,
        'page': page_num,
        'total_pages': total_pages,
        'book_key': book_key,
        'username': request.user.username,
    })

@login_required
def rate_book(request, book_key):
    """Save or update a user's rating and review for a book"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405) 

    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    try:
        stars = int(request.POST.get('stars', 0))
        review = request.POST.get('review', '').strip()

        if stars < 1 or stars > 5:
            return JsonResponse({'error': 'Stars must be between 1 and 5'}, status=400)

        rating, created = Rating.objects.update_or_create(
            user=request.user,
            book=book,
            defaults={'stars': stars, 'review': review}
        )

        # Calculate new average rating for this book
        from django.db.models import Avg
        avg = Rating.objects.filter(book=book).aggregate(Avg('stars'))['stars__avg']
        avg_rating = round(avg, 1) if avg else stars
        total_ratings = Rating.objects.filter(book=book).count()

        return JsonResponse({
            'status': 'created' if created else 'updated',
            'stars': stars,
            'review': review,
            'avg_rating': avg_rating,
            'total_ratings': total_ratings,
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def get_book_ratings(request, book_key):
    """Get all ratings for a book plus the current user's rating"""
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    from django.db.models import Avg
    ratings = Rating.objects.filter(book=book).select_related('user').order_by('-created_at')
    avg = Rating.objects.filter(book=book).aggregate(Avg('stars'))['stars__avg']

    user_rating = Rating.objects.filter(user=request.user, book=book).first()

    return JsonResponse({
        'avg_rating': round(avg, 1) if avg else None,
        'total_ratings': ratings.count(),
        'user_rating': user_rating.stars if user_rating else None,
        'user_review': user_rating.review if user_rating else '',
        'reviews': [
            {
                'username': r.user.username,
                'stars': r.stars,
                'review': r.review,
                'date': r.created_at.strftime('%b %d, %Y'),
            }
            for r in ratings[:10]
        ]
    })


@login_required
def get_recommendations(request):

    """
    Recommend books based on what the user has saved, favourited,
    or recently viewed — using TF-IDF and Cosine Similarity 
    """
    # Step 1: Get all books in the database that have a description
    all_books = Book.objects.exclude(description='').exclude(description=None)

    if all_books.count() < 3:
        return JsonResponse({'recommendations': [], 'message': 'Not enough books in the library yet.please search for more.'})

    # Step 2: Get the books this user has interacted with
    favourite_keys = list(Favourite.objects.filter(user=request.user).values_list('book__key', flat=True))
    bookmark_keys = list(Bookmark.objects.filter(user=request.user).values_list('book__key', flat=True))
    recent_keys = list(RecentlyViewed.objects.filter(user=request.user).values_list('book__key', flat=True)[:10])

    # Combine all interacted book keys into one list (remove duplicates)
    interacted_keys = list(set(favourite_keys + bookmark_keys + recent_keys))

    if not interacted_keys:
        # User has no activity yet — return most recently added books instead
        recent_books = all_books.order_by('-created_at')[:6]
        return JsonResponse({
            'recommendations': [
                {
                    'title': b.title,
                    'author': b.author,
                    'key': b.key,
                    'cover_id': b.cover_id,
                    'reason': 'New in library'
                }
                for b in recent_books
            ]
        })

    # Step 3: Build the TF-IDF matrix from all book descriptions
    book_list = list(all_books)
    descriptions = [b.title + ' ' + b.description for b in book_list]

    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = vectorizer.fit_transform(descriptions)

    # Step 4: Find which books the user has interacted with (by index in our list)
    interacted_indices = [
        i for i, b in enumerate(book_list)
        if b.key in interacted_keys
    ]

    if not interacted_indices:
        return JsonResponse({'recommendations': [], 'message': 'No matching books found.'})

    # Step 5: Calculate similarity scores
    # Average the TF-IDF vectors of all books the user has interacted with
    user_profile = np.mean(tfidf_matrix[interacted_indices].toarray(), axis=0).reshape(1, -1)

    # Compare this profile against every book
    similarity_scores = cosine_similarity(user_profile, tfidf_matrix)[0]

    # Step 6: Rank books by similarity score, excluding ones already interacted with
    scored_books = [
        (score, book_list[i])
        for i, score in enumerate(similarity_scores)
        if book_list[i].key not in interacted_keys
    ]

    # Sort by score descending and take top 6
    scored_books.sort(key=lambda x: x[0], reverse=True)
    top_books = scored_books[:6]

    return JsonResponse({
        'recommendations': [
            {
                'title': b.title,
                'author': b.author,
                'key': b.key,
                'cover_id': b.cover_id,
                'reason': f'Similar to your reading history'
            }
            for score, b in top_books
        ]
    })


@login_required
def summarize_book(request, book_key):
    """Generate a summary of a book using NLTK frequency-based summarization""" 
    book_key = '/' + book_key if not book_key.startswith('/') else book_key
    book = Book.objects.filter(key=book_key).first()

    if not book:
        return JsonResponse({'error': 'Book not found'}, status=404)

    # Use description if available, otherwise fetch from Gutendex
    text_to_summarize = book.description

    if not text_to_summarize or len(text_to_summarize) < 100:
        try:
            search_url = f'https://gutendex.com/books/?search={urllib.parse.quote(book.title)}'
            response = requests.get(search_url, timeout=30)
            data = response.json()
            results = data.get('results', [])
            if results:
                formats = results[0].get('formats', {})
                text_url = None
                for key, url in formats.items():
                    if 'text/plain' in key and 'utf-8' in key.lower():
                        text_url = url
                        break
                if not text_url:
                    for key, url in formats.items():
                        if 'text/plain' in key:
                            text_url = url
                            break
                if text_url:
                    text_response = requests.get(text_url, timeout=60)
                    text_response.encoding = 'utf-8'
                    full_text = text_response.text

                    # Strip boilerplate
                    for marker in ['*** START OF THE PROJECT', '*** START OF THIS PROJECT']:
                        idx = full_text.find(marker)
                        if idx != -1:
                            full_text = full_text[full_text.find('\n', idx) + 1:]
                            break
                    for marker in ['*** END OF THE PROJECT', '*** END OF THIS PROJECT']:
                        idx = full_text.find(marker)
                        if idx != -1:
                            full_text = full_text[:idx]
                            break

                    # Use first 5000 characters for summary
                    text_to_summarize = full_text[:5000]
        except Exception as e:
            return JsonResponse({'error': f'Could not fetch book content: {str(e)}'}, status=500)

    if not text_to_summarize:
        return JsonResponse({'error': 'No content available to summarize for this book.'}, status=404)

    try:
        # Tokenize into sentences and words
        sentences = sent_tokenize(text_to_summarize)
        words = word_tokenize(text_to_summarize.lower())

        # Remove stopwords and punctuation
        stop_words = set(stopwords.words('english'))
        filtered_words = [w for w in words if w.isalnum() and w not in stop_words]

        # Calculate word frequency
        freq_dist = FreqDist(filtered_words)

        # Score each sentence based on word frequency
        sentence_scores = {}
        for sentence in sentences:
            sentence_words = word_tokenize(sentence.lower())
            score = sum(freq_dist[w] for w in sentence_words if w in freq_dist)
            if len(sentence.split()) > 5:  # ignore very short sentences
                sentence_scores[sentence] = score

        # Pick top 5 sentences by score
        top_sentences = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:5]

        # Restore original order
        summary_sentences = [s for s in sentences if s in top_sentences]
        summary = ' '.join(summary_sentences)
        summary = summary.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ')
        # Clean up multiple spaces
        import re
        summary = re.sub(r'\s+', ' ', summary).strip()

        return JsonResponse({
            'title': book.title,
            'author': book.author,
            'summary': summary,
            'sentence_count': len(summary_sentences),
        })

    except Exception as e:
        return JsonResponse({'error': f'Could not generate summary: {str(e)}'}, status=500)



@staff_member_required
def admin_dashboard(request):
    context = {
        'total_users': User.objects.count(),
        'total_books': Book.objects.count(),
        'total_favourites': Favourite.objects.count(),
        'total_bookmarks': Bookmark.objects.count(),
        'total_downloads': DownloadedBook.objects.count(),
        'total_ratings': Rating.objects.count(),
        'avg_rating': Rating.objects.aggregate(Avg('stars'))['stars__avg'],
        'top_books': Book.objects.annotate(
            fav_count=Count('favourite')
        ).order_by('-fav_count')[:5],
        'recent_users': User.objects.order_by('-date_joined')[:5],
        'recent_ratings': Rating.objects.select_related('user', 'book').order_by('-created_at')[:5],
    }
    return render(request, 'registration/admin_dashboard.html', context)


# ============================================
# COURSE MATERIALS SYSTEM
# ============================================

def get_or_create_profile(user):
    """Helper to get or create a user profile"""
    from .models import UserProfile
    profile, created = UserProfile.objects.get_or_create(user=user)
    return profile

@login_required
def course_materials(request):
    """Main course materials page — shows all available materials"""
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)
    materials = CourseMaterial.objects.all().select_related('lecturer').order_by('-created_at')

    # Get this user's access records
    access_map = {}
    if not profile.is_lecturer:
        accesses = MaterialAccess.objects.filter(student=request.user).values('material_id', 'status')
        access_map = {a['material_id']: a['status'] for a in accesses}

    return render(request, 'registration/course_materials.html', {
        'materials': materials,
        'access_map': access_map,
        'profile': profile,
    })


@login_required
def upload_material(request):
    """Lecturers upload course materials"""
    from .models import CourseMaterial, UserProfile
    profile = get_or_create_profile(request.user)

    if not profile.is_lecturer:
        return redirect('course_materials')

    if request.method == 'POST':
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        price = request.POST.get('price', '0')
        file = request.FILES.get('file')

        if title and file:
            CourseMaterial.objects.create(
                lecturer=request.user,
                title=title,
                description=description,
                price=price,
                file=file,
            )
            messages.success(request, 'Material uploaded successfully.')
            return redirect('course_materials')
        else:
            messages.error(request, 'Please provide a title and file.')

    return render(request, 'registration/upload_material.html', {'profile': profile})


@login_required
def request_access(request, material_id):
    """Student requests access to a material after paying"""
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)

    if profile.is_lecturer:
        return JsonResponse({'error': 'Lecturers cannot request access'}, status=400)

    material = CourseMaterial.objects.filter(id=material_id).first()
    if not material:
        return JsonResponse({'error': 'Material not found'}, status=404)

    if request.method == 'POST':
        payment_ref = request.POST.get('payment_reference', '').strip()
        access, created = MaterialAccess.objects.get_or_create(
            student=request.user,
            material=material,
            defaults={'payment_reference': payment_ref, 'status': 'pending'}
        )
        if not created:
            access.payment_reference = payment_ref
            access.save()

        return JsonResponse({'status': 'pending', 'message': 'Access request submitted. Awaiting confirmation.'})

    return JsonResponse({'error': 'POST required'}, status=405)


@login_required
def approve_access(request, access_id):
    """Lecturer or admin approves/rejects a student's access request"""
    from .models import MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)

    if not profile.is_lecturer and not request.user.is_staff:
        return JsonResponse({'error': 'Not authorized'}, status=403)

    access = MaterialAccess.objects.filter(id=access_id).first()
    if not access:
        return JsonResponse({'error': 'Access record not found'}, status=404)

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'approve':
            access.status = 'approved'
            access.approved_at = timezone.now()
            access.save()
            return JsonResponse({'status': 'approved'})
        elif action == 'reject':
            access.status = 'rejected'
            access.save()
            return JsonResponse({'status': 'rejected'})

    return JsonResponse({'error': 'POST required'}, status=405)


@login_required
def course_materials(request):
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)
    all_materials = CourseMaterial.objects.all().select_related('lecturer').order_by('-created_at')

    access_map = {}
    if not profile.is_lecturer:
        accesses = MaterialAccess.objects.filter(student=request.user).values('material_id', 'status')
        access_map = {a['material_id']: a['status'] for a in accesses}

    # Attach status directly to each material object
    materials_with_status = []
    for material in all_materials:
        status = access_map.get(material.id, None)
        materials_with_status.append({
            'material': material,
            'status': status,
        })

    return render(request, 'registration/course_materials.html', {
        'materials_with_status': materials_with_status,
        'profile': profile,
    })

@login_required
def lecturer_dashboard(request):
    """Lecturer sees their uploaded materials and pending access requests"""
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)

    if not profile.is_lecturer:
        return redirect('course_materials')

    my_materials = CourseMaterial.objects.filter(lecturer=request.user).order_by('-created_at')
    pending_requests = MaterialAccess.objects.filter(
        material__lecturer=request.user,
        status='pending'
    ).select_related('student', 'material').order_by('-requested_at')
    approved_requests = MaterialAccess.objects.filter(
        material__lecturer=request.user,
        status='approved'
    ).select_related('student', 'material').order_by('-approved_at')

    return render(request, 'registration/lecturer_dashboard.html', {
        'my_materials': my_materials,
        'pending_requests': pending_requests,
        'approved_requests': approved_requests,
        'profile': profile,
    })


@login_required
def become_lecturer(request):
    """Allow a user to switch their role to lecturer"""
    from .models import UserProfile
    profile = get_or_create_profile(request.user)
    if request.method == 'POST':
        profile.role = 'lecturer'
        profile.save()
        messages.success(request, 'Your account has been upgraded to Lecturer.')
        return redirect('lecturer_dashboard')
    return render(request, 'registration/become_lecturer.html', {'profile': profile})

login_required
def view_material(request, material_id):
    """Student views a material they have paid for — with watermark"""
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)

    material = CourseMaterial.objects.filter(id=material_id).first()
    if not material:
        messages.error(request, 'Material not found.')
        return redirect('course_materials')

    # Lecturers can always view their own materials
    if profile.is_lecturer and material.lecturer == request.user:
        return render(request, 'registration/view_material.html', {
            'material': material,
            'watermark': f'LECTURER PREVIEW — {request.user.username.upper()}',
        })

    # Students need approved access
    access = MaterialAccess.objects.filter(
        student=request.user,
        material=material,
        status='approved'
    ).first()

    if not access:
        messages.error(request, 'You do not have access to this material. Please request access first.')
        return redirect('course_materials')

    return render(request, 'registration/view_material.html', {
        'material': material,
        'watermark': f'{request.user.username.upper()} — {request.user.username}',
    })


@login_required
def lecturer_dashboard(request):
    """Lecturer sees their uploaded materials and pending access requests"""
    from .models import CourseMaterial, MaterialAccess, UserProfile
    profile = get_or_create_profile(request.user)

    if not profile.is_lecturer:
        return redirect('course_materials')

    my_materials = CourseMaterial.objects.filter(lecturer=request.user).order_by('-created_at')
    pending_requests = MaterialAccess.objects.filter(
        material__lecturer=request.user,
        status='pending'
    ).select_related('student', 'material').order_by('-requested_at')
    approved_requests = MaterialAccess.objects.filter(
        material__lecturer=request.user,
        status='approved'
    ).select_related('student', 'material').order_by('-approved_at')

    return render(request, 'registration/lecturer_dashboard.html', {
        'my_materials': my_materials,
        'pending_requests': pending_requests,
        'approved_requests': approved_requests,
        'profile': profile,
    })

@login_required
def delete_material(request, material_id):
    from .models import CourseMaterial, UserProfile
    profile = get_or_create_profile(request.user)
    material = CourseMaterial.objects.filter(id=material_id, lecturer=request.user).first()

    if not material:
        messages.error(request, 'Material not found or you do not have permission.')
        return redirect('lecturer_dashboard')

    if request.method == 'POST':
        # Delete the file from storage
        if material.file:
            import os
            if os.path.exists(material.file.path):
                os.remove(material.file.path)
        material.delete()
        messages.success(request, 'Material deleted successfully.')
        return redirect('lecturer_dashboard')

    return redirect('lecturer_dashboard')


@login_required
def fetch_book_text(request):
    """Proxy view to fetch Gutenberg book text server-side, avoiding CORS"""
    url = request.GET.get('url', '')
    
    if not url or 'gutenberg.org' not in url:
        return JsonResponse({'error': 'Invalid URL'}, status=400)
    
    try:
        headers = {'User-Agent': 'Illumia/1.0 (https://illumia.onrender.com)'}
        response = requests.get(url, timeout=30, headers=headers)
        response.encoding = 'utf-8'
        return HttpResponse(response.text, content_type='text/plain; charset=utf-8')
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)