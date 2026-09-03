import { PostAPI, AuthAPI } from './api-client.js';

let currentUser = null;
let postQuill = null;
let currentPostImageFile = null;

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

    initQuillEditor();
    loadPosts();
    setupPostForm();
    setupPostImageUpload();
}

function initQuillEditor() {
    const editorEl = document.getElementById('post-quill-editor');
    const textareaEl = document.getElementById('post-content');
    if (!editorEl) return;

    if (window.Quill) {
        try {
            postQuill = new Quill('#post-quill-editor', {
                theme: 'snow',
                placeholder: 'Skriv innholdet ditt her...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'clean']
                    ]
                }
            });
        } catch (e) {
            console.warn("Quill init failed, using textarea fallback", e);
            editorEl.style.display = 'none';
            if (textareaEl) textareaEl.classList.remove('hidden');
        }
    } else if (textareaEl) {
        editorEl.style.display = 'none';
        textareaEl.classList.remove('hidden');
    }
}

function setupPostImageUpload() {
    const dropZone = document.getElementById('post-upload-drop-zone');
    const fileInput = document.getElementById('post-image-input');
    const previewContainer = document.getElementById('post-image-preview-container');
    const previewImg = document.getElementById('post-image-preview');
    const removeBtn = document.getElementById('remove-post-image');
    const filenameLabel = document.getElementById('post-image-filename');

    if (dropZone && fileInput) {
        dropZone.onclick = (e) => {
            if (e.target !== removeBtn) fileInput.click();
        };

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--color-primary)';
        };
        dropZone.ondragleave = () => {
            dropZone.style.borderColor = 'var(--color-border)';
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--color-border)';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelected(e.dataTransfer.files[0]);
            }
        };

        fileInput.onchange = () => {
            if (fileInput.files && fileInput.files[0]) {
                handleFileSelected(fileInput.files[0]);
            }
        };
    }

    function handleFileSelected(file) {
        currentPostImageFile = file;
        if (filenameLabel) filenameLabel.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImg) previewImg.src = e.target.result;
            if (previewContainer) previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    if (removeBtn) {
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            currentPostImageFile = null;
            if (fileInput) fileInput.value = '';
            if (filenameLabel) filenameLabel.textContent = 'PNG, JPG, WEBP';
            if (previewContainer) previewContainer.classList.add('hidden');
            if (previewImg) previewImg.src = '';
        };
    }
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
            feedContainer.innerHTML = '<p class="text-center text-muted py-6" data-i18n="no_posts">Ingen oppdateringer ennå.</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.role === 'admin';

        data.posts.forEach(post => {
            const article = document.createElement('article');
            article.className = 'feed-item';
            article.dataset.id = post.id;

            const isLikedClass = post.is_liked ? 'liked' : '';

            article.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    ${post.author_photo_url 
                        ? `<img src="${post.author_photo_url}" alt="${post.author_name}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">`
                        : `<div style="width: 45px; height: 45px; border-radius: 50%; background: var(--color-bg-subtle); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-weight: bold;">${(post.author_name || 'M')[0]}</div>`
                    }
                    <div>
                        <p style="font-weight: 600; margin: 0; color: var(--color-text-main);">${post.author_name || 'Admin'}</p>
                        <p style="font-size: 0.85rem; margin: 0; color: var(--color-text-muted);">${new Date(post.created_at).toLocaleDateString('nb-NO')}</p>
                    </div>
                    ${isAdmin ? `
                        <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
                            <button type="button" class="btn btn-secondary btn-xs edit-post-btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; cursor: pointer;">✏️ Rediger</button>
                            <button type="button" class="btn btn-ghost btn-xs delete-post-btn" data-id="${post.id}" style="color: var(--color-error); font-size: 0.9rem; padding: 0.3rem 0.5rem; cursor: pointer;" title="Slett innlegg">🗑️</button>
                        </div>
                    ` : ''}
                </div>
                <h3 style="margin-top: 0; color: var(--color-text-main); font-size: 1.25rem;">${post.title}</h3>
                <div class="feed-item-content" style="color: var(--color-text-main); margin: 0.75rem 0; line-height: 1.6;">${post.content}</div>
                ${post.image_url ? `
                    <div class="feed-item-image" style="margin-top: 1rem; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border);">
                        <img src="${post.image_url}" alt="${post.title}" style="width: 100%; max-height: 500px; object-fit: cover; display: block;">
                    </div>
                ` : ''}
                <div class="post-actions" style="margin-top: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <button type="button" class="action-btn like-btn ${isLikedClass}" data-id="${post.id}" style="background: none; border: 1px solid var(--color-border); padding: 0.4rem 0.8rem; border-radius: 20px; cursor: pointer; color: var(--color-text-main);">
                        ❤️ <span class="like-count">${post.likes_count || 0}</span>
                    </button>
                </div>
            `;

            if (isAdmin) {
                const editBtn = article.querySelector('.edit-post-btn');
                if (editBtn) {
                    editBtn.onclick = () => {
                        openEditPostModal(post);
                    };
                }
            }

            feedContainer.appendChild(article);
        });

        setupFeedEvents();

    } catch (err) {
        if (loadingEl) loadingEl.classList.add('hidden');
        feedContainer.innerHTML = '<p class="text-center text-error">Kunne ikke laste innlegg.</p>';
    }
}

function openEditPostModal(post) {
    let editIdInput = document.getElementById('post-edit-id');
    if (!editIdInput) {
        const form = document.getElementById('new-post-form');
        if (form) {
            editIdInput = document.createElement('input');
            editIdInput.type = 'hidden';
            editIdInput.id = 'post-edit-id';
            form.prepend(editIdInput);
        }
    }

    if (editIdInput) editIdInput.value = post.id;
    const titleInput = document.getElementById('post-title');
    if (titleInput) titleInput.value = post.title;

    if (postQuill) {
        postQuill.root.innerHTML = post.content || '';
    } else {
        const textarea = document.getElementById('post-content');
        if (textarea) textarea.value = post.content || '';
    }

    const modalTitle = document.querySelector('#post-modal .card-header h3');
    if (modalTitle) modalTitle.textContent = 'Rediger innlegg';
    const submitBtn = document.getElementById('publish-post-btn') || document.querySelector('#new-post-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Lagre endringer';

    const modal = document.getElementById('post-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
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
                    await loadPosts();
                } catch (err) {
                    alert('Kunne ikke slette innlegget: ' + err.message);
                }
            }
        }
    };
}

function setupPostForm() {
    const form = document.getElementById('new-post-form');
    if (!form) return;

    // Reset edit state when new post button is clicked
    const newPostBtn = document.getElementById('new-post-btn');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            const editIdInput = document.getElementById('post-edit-id');
            if (editIdInput) editIdInput.value = '';
            form.reset();
            if (postQuill) postQuill.setContents([]);
            const modalTitle = document.querySelector('#post-modal .card-header h3');
            if (modalTitle) modalTitle.textContent = 'Opprett nytt innlegg';
            const submitBtn = document.getElementById('publish-post-btn') || form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Publiser innlegg';
        });
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('post-title');
        const title = titleInput ? titleInput.value.trim() : '';

        let content = '';
        if (postQuill && postQuill.root) {
            content = postQuill.root.innerHTML.trim();
            if (content === '<p><br></p>') content = '';
        } else {
            const textarea = document.getElementById('post-content');
            content = textarea ? textarea.value.trim() : '';
        }

        if (!title || !content) {
            alert('Vennligst fyll ut både tittel og innhold.');
            return;
        }

        const editIdInput = document.getElementById('post-edit-id');
        const editId = editIdInput ? editIdInput.value : '';

        const submitBtn = document.getElementById('publish-post-btn') || form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Lagrer innlegg...';
        }

        const formData = new FormData();
        if (editId) formData.append('id', editId);
        formData.append('title', title);
        formData.append('content', content);
        formData.append('category', 'general');

        const fileInput = document.getElementById('post-image-input');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('image', fileInput.files[0]);
        }

        try {
            if (editId) {
                await PostAPI.updatePost(formData);
                alert('Innlegget ble oppdatert!');
            } else {
                await PostAPI.createPost(formData);
                alert('Innlegget ble publisert!');
            }

            form.reset();
            if (editIdInput) editIdInput.value = '';
            if (postQuill) postQuill.setContents([]);
            const previewContainer = document.getElementById('post-image-preview-container');
            if (previewContainer) previewContainer.classList.add('hidden');

            const modal = document.getElementById('post-modal');
            if (modal) modal.classList.add('hidden');
            document.body.classList.remove('modal-open');

            await loadPosts();
        } catch (err) {
            alert('Kunne ikke lagre innlegg: ' + err.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publiser innlegg';
            }
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeed);
} else {
    initFeed();
}

