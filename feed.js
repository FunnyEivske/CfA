import { PostAPI, AuthAPI } from './api-client.js';

let currentUser = null;

export async function initFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    // Fetch auth state
    try {
        const authData = await AuthAPI.getAuthState();
        if (authData.authenticated) {
            currentUser = authData.user;
        }
    } catch (e) {
        console.warn("Auth state check failed:", e);
    }

    loadPosts();
    setupPostForm();
}

export async function loadPosts() {
    const feedContainer = document.getElementById('feed-container');
    const loadingEl = document.getElementById('feed-loading');

    if (!feedContainer) return;

    try {
        const data = await PostAPI.getPosts('general');
        if (loadingEl) loadingEl.classList.add('hidden');
        
        feedContainer.innerHTML = '';
        if (!data.posts || data.posts.length === 0) {
            feedContainer.innerHTML = '<p class="text-center" style="color: var(--color-text-muted);" data-i18n="no_posts">Ingen oppdateringer ennå.</p>';
            return;
        }

        data.posts.forEach(post => {
            const article = document.createElement('article');
            article.className = 'feed-item';
            article.dataset.id = post.id;

            const isLikedClass = post.is_liked ? 'liked' : '';
            const isAdmin = currentUser && currentUser.role === 'admin';

            article.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    ${post.author_photo_url 
                        ? `<img src="${post.author_photo_url}" alt="${post.author_name}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">`
                        : `<div style="width: 45px; height: 45px; border-radius: 50%; background: var(--color-bg-medium); display: flex; align-items: center; justify-content: center; font-weight: bold;">${(post.author_name || 'M')[0]}</div>`
                    }
                    <div>
                        <p style="font-weight: 600; margin: 0; color: var(--color-secondary);">${post.author_name || 'Admin'}</p>
                        <p style="font-size: 0.85rem; margin: 0; color: var(--color-text-muted);">${new Date(post.created_at).toLocaleDateString('nb-NO')}</p>
                    </div>
                    ${isAdmin ? `<button class="btn btn-ghost btn-sm delete-post-btn" data-id="${post.id}" style="margin-left: auto; color: red;">🗑️</button>` : ''}
                </div>
                <h3 style="margin-top: 0;">${post.title}</h3>
                <div class="feed-item-content">${post.content}</div>
                ${post.image_url ? `
                    <div class="feed-item-image" style="margin-top: 1rem; border-radius: var(--radius-md); overflow: hidden;">
                        <img src="${post.image_url}" alt="${post.title}" style="width: 100%; max-height: 500px; object-fit: cover;">
                    </div>
                ` : ''}
                <div class="post-actions" style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <button class="action-btn like-btn ${isLikedClass}" data-id="${post.id}" style="background: none; border: 1px solid var(--color-border); padding: 0.4rem 0.8rem; border-radius: 20px; cursor: pointer;">
                        ❤️ <span class="like-count">${post.likes_count || 0}</span>
                    </button>
                </div>
            `;

            feedContainer.appendChild(article);
        });

        setupFeedEvents();

    } catch (err) {
        if (loadingEl) loadingEl.classList.add('hidden');
        feedContainer.innerHTML = '<p class="text-center text-error">Kunne ikke laste innlegg.</p>';
    }
}

function setupFeedEvents() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;

    feedContainer.onclick = async (e) => {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const postId = likeBtn.dataset.id;
            try {
                const res = await PostAPI.toggleLike(postId);
                const countSpan = likeBtn.querySelector('.like-count');
                if (countSpan) countSpan.textContent = res.likes_count;
                likeBtn.classList.toggle('liked', res.liked);
            } catch (err) {
                alert('Vennligst logg inn for å like innlegg.');
            }
            return;
        }

        const deleteBtn = e.target.closest('.delete-post-btn');
        if (deleteBtn) {
            if (confirm('Er du sikker på at du vil slette dette innlegget?')) {
                const postId = deleteBtn.dataset.id;
                try {
                    await PostAPI.deletePost(postId);
                    loadPosts();
                } catch (err) {
                    alert('Kunne ikke slette innlegget.');
                }
            }
        }
    };
}

function setupPostForm() {
    const form = document.getElementById('new-post-form');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        try {
            await PostAPI.createPost(formData);
            form.reset();
            const modal = document.getElementById('post-modal');
            if (modal) modal.classList.add('hidden');
            loadPosts();
        } catch (err) {
            alert('Feil ved publisering: ' + err.message);
        }
    };
}

document.addEventListener('DOMContentLoaded', initFeed);
