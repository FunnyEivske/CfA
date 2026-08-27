// api-client.js - REST API Client with Automatic Local Mock Fallback for Testing

const API_BASE = '/backend/api.php';

// Local Mock State for Offline / Vite Dev Testing
const MOCK_STORAGE_KEY = 'cfa_mock_db_v2';

function getMockDB() {
    let db = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!db) {
        db = {
            currentUser: null,
            members: [
                { id: 'usr_admin', email: 'admin@cfa.no', display_name: 'Admin Cosplayer', role: 'admin', photo_url: 'https://picsum.photos/seed/cfa_admin/150/150' },
                { id: 'usr_2', email: 'nora@cfa.no', display_name: 'Nora (Foam Smith)', role: 'medlem', photo_url: 'https://picsum.photos/seed/cfa_nora/150/150' },
                { id: 'usr_3', email: 'erik@cfa.no', display_name: 'Erik 3D Props', role: 'medlem', photo_url: 'https://picsum.photos/seed/cfa_erik/150/150' }
            ],
            posts: [
                {
                    id: 1,
                    author_id: 'usr_admin',
                    author_name: 'Admin Cosplayer',
                    author_photo_url: 'https://picsum.photos/seed/cfa_admin/150/150',
                    title: 'Velkommen til nytt Cosplay for alle nettsted!',
                    content: 'Vi har oppdatert nettstedet vårt med nytt design, norsk/engelsk støtte og nye funksjoner for medlemmer!',
                    image_url: 'https://picsum.photos/seed/cfa_post1/800/400',
                    category: 'general',
                    likes_count: 5,
                    is_liked: false,
                    created_at: new Date().toISOString()
                }
            ],
            gallery: [
                { id: 1, title: 'Workshop 2026', image_url: 'https://picsum.photos/seed/cfa_gal1/800/600', uploader_name: 'Admin Cosplayer' }
            ],
            events: [
                { id: 1, title: 'Bekkebotn Con 2026', date: '2026-10-15T12:00:00', location: 'Oslo Spectrum', description: 'Bli med på årets største treff!' }
            ]
        };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    } else {
        db = JSON.parse(db);
    }
    return db;
}

function saveMockDB(db) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Fallback Mock Executor
function handleMockRequest(action, data) {
    const db = getMockDB();
    console.log(`[Local Mock API] Action: ${action}`, data);

    switch (action) {
        case 'login':
            const loginUser = db.members.find(m => m.email === data.email) || {
                id: 'usr_' + Date.now(),
                email: data.email || 'user@cfa.no',
                display_name: data.email ? data.email.split('@')[0] : 'Medlem',
                role: data.email && data.email.includes('admin') ? 'admin' : 'medlem',
                photo_url: 'https://picsum.photos/seed/' + Date.now() + '/150/150'
            };
            db.currentUser = loginUser;
            saveMockDB(db);
            return { success: true, user: loginUser };

        case 'register':
            const newUser = {
                id: 'usr_' + Date.now(),
                email: data.email,
                display_name: data.name || data.email.split('@')[0],
                role: 'medlem',
                photo_url: 'https://picsum.photos/seed/' + Date.now() + '/150/150'
            };
            db.members.push(newUser);
            db.currentUser = newUser;
            saveMockDB(db);
            return { success: true, user: newUser };

        case 'auth_state':
            return { authenticated: !!db.currentUser, user: db.currentUser };

        case 'logout':
            db.currentUser = null;
            saveMockDB(db);
            return { success: true };

        case 'update_profile':
            if (db.currentUser) {
                db.currentUser.display_name = data.display_name;
                const m = db.members.find(u => u.id === db.currentUser.id);
                if (m) m.display_name = data.display_name;
                saveMockDB(db);
            }
            return { success: true };

        case 'get_members':
            return { members: db.members };

        case 'get_posts':
            return { posts: db.posts };

        case 'create_post':
            const title = data instanceof FormData ? data.get('title') : data.title;
            const content = data instanceof FormData ? data.get('content') : data.content;
            const newPost = {
                id: Date.now(),
                author_id: db.currentUser ? db.currentUser.id : 'usr_admin',
                author_name: db.currentUser ? db.currentUser.display_name : 'Admin',
                author_photo_url: db.currentUser ? db.currentUser.photo_url : null,
                title: title || 'Ny Oppdatering',
                content: content || '',
                image_url: 'https://picsum.photos/seed/' + Date.now() + '/800/400',
                category: 'general',
                likes_count: 0,
                is_liked: false,
                created_at: new Date().toISOString()
            };
            db.posts.unshift(newPost);
            saveMockDB(db);
            return { success: true, post_id: newPost.id };

        case 'delete_post':
            db.posts = db.posts.filter(p => p.id != data.id);
            saveMockDB(db);
            return { success: true };

        case 'like_post':
            const post = db.posts.find(p => p.id == data.id);
            if (post) {
                post.is_liked = !post.is_liked;
                post.likes_count += post.is_liked ? 1 : -1;
                saveMockDB(db);
                return { success: true, liked: post.is_liked, likes_count: post.likes_count };
            }
            return { success: false };

        case 'get_gallery':
            return { gallery: db.gallery };

        case 'upload_gallery':
            const galItem = {
                id: Date.now(),
                title: 'Nytt Bilde',
                image_url: 'https://picsum.photos/seed/' + Date.now() + '/800/600',
                uploader_name: db.currentUser ? db.currentUser.display_name : 'Medlem'
            };
            db.gallery.unshift(galItem);
            saveMockDB(db);
            return { success: true, image_url: galItem.image_url };

        case 'get_events':
            return { events: db.events };

        default:
            return { success: true };
    }
}

export async function request(action, method = 'GET', data = null, isFormData = false) {
    const options = {
        method,
        headers: {}
    };

    let url = `${API_BASE}?action=${action}`;

    if (data && !isFormData) {
        if (method === 'POST' || method === 'PUT') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else {
            const queryParams = new URLSearchParams(data).toString();
            url += `&${queryParams}`;
        }
    } else if (data && isFormData) {
        options.body = data;
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        
        // Try parsing JSON response from PHP
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            // PHP is not running locally (e.g. raw PHP code or 404 returned by Vite dev server)
            return handleMockRequest(action, data);
        }

        if (!response.ok) {
            throw new Error(json.error || 'Network response error');
        }
        return json;
    } catch (err) {
        // Fallback to local mock when PHP server is offline during dev testing
        return handleMockRequest(action, data);
    }
}

export const AuthAPI = {
    login: (email, password) => request('login', 'POST', { email, password }),
    register: (email, password, name) => request('register', 'POST', { email, password, name }),
    logout: () => request('logout', 'POST'),
    getAuthState: () => request('auth_state'),
    updateProfile: (displayName) => request('update_profile', 'POST', { display_name: displayName }),
    uploadAvatar: (formData) => request('upload_avatar', 'POST', formData, true)
};

export const PostAPI = {
    getPosts: (category = 'general') => request('get_posts', 'GET', { category }),
    createPost: (formData) => request('create_post', 'POST', formData, true),
    deletePost: (id) => request('delete_post', 'POST', { id }),
    toggleLike: (id) => request('like_post', 'POST', { id })
};

export const MemberAPI = {
    getMembers: () => request('get_members')
};

export const GalleryAPI = {
    getGallery: () => request('get_gallery'),
    uploadImage: (formData) => request('upload_gallery', 'POST', formData, true)
};

export const EventAPI = {
    getEvents: () => request('get_events')
};
