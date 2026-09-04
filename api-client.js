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
                { id: 'usr_eivind', email: 'eivindrosstadskeie@gmail.com', display_name: 'Eivind', role: 'admin', photo_url: 'Media/Logo/cfa-logo.jpg' }
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
            ],
            documents: [
                { id: 1, category: 'vedtekter', title: '§ 1 Formål', content: '<p>Cosplay for alle har som formål å fremme interesse og fellesskap rundt cosplay.</p>', document_date: '2026-01-01' },
                { id: 2, category: 'retningslinjer', title: 'Husregler for verkstedet', content: '<p>1. Rydd opp etter deg.<br>2. Sikkerhetsutstyr er påbudt ved maskiner.</p>', document_date: '2026-01-01' },
                { id: 3, category: 'referater', title: 'Styremøte Januar 2026', content: '<p>Referat fra styremøtet. Gjennomgang av planer for året.</p>', document_date: '2026-01-15' }
            ]
        };
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
    } else {
        db = JSON.parse(db);
        if (!db.documents) {
            db.documents = [
                { id: 1, category: 'vedtekter', title: '§ 1 Formål', content: '<p>Cosplay for alle har som formål å fremme interesse og fellesskap rundt cosplay.</p>', document_date: '2026-01-01' },
                { id: 2, category: 'retningslinjer', title: 'Husregler for verkstedet', content: '<p>1. Rydd opp etter deg.<br>2. Sikkerhetsutstyr er påbudt ved maskiner.</p>', document_date: '2026-01-01' },
                { id: 3, category: 'referater', title: 'Styremøte Januar 2026', content: '<p>Referat fra styremøtet. Gjennomgang av planer for året.</p>', document_date: '2026-01-15' }
            ];
            localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
        }
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
        case 'login': {
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
        }

        case 'register': {
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
        }

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

        case 'create_post': {
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
        }

        case 'delete_post':
            db.posts = db.posts.filter(p => p.id != data.id);
            saveMockDB(db);
            return { success: true };

        case 'like_post': {
            const post = db.posts.find(p => p.id == data.id);
            if (post) {
                post.is_liked = !post.is_liked;
                post.likes_count += post.is_liked ? 1 : -1;
                saveMockDB(db);
                return { success: true, liked: post.is_liked, likes_count: post.likes_count };
            }
            return { success: false };
        }

        case 'get_gallery':
            return { gallery: db.gallery };

        case 'upload_gallery': {
            const galItem = {
                id: Date.now(),
                title: 'Nytt Bilde',
                image_url: 'https://picsum.photos/seed/' + Date.now() + '/800/600',
                uploader_name: db.currentUser ? db.currentUser.display_name : 'Medlem'
            };
            db.gallery.unshift(galItem);
            saveMockDB(db);
            return { success: true, image_url: galItem.image_url };
        }

        case 'get_events':
            return { events: db.events };

        case 'get_documents': {
            const docCat = data && data.category ? data.category : null;
            const docs = (db.documents || []).filter(d => !docCat || d.category === docCat);
            return { documents: docs };
        }

        case 'save_document': {
            if (!db.documents) db.documents = [];
            const docId = (data && typeof FormData !== 'undefined' && data instanceof FormData) ? data.get('id') : (data ? data.id : null);
            const title = (data && typeof FormData !== 'undefined' && data instanceof FormData) ? data.get('title') : (data ? data.title : '');
            const content = (data && typeof FormData !== 'undefined' && data instanceof FormData) ? data.get('content') : (data ? data.content : '');
            const category = (data && typeof FormData !== 'undefined' && data instanceof FormData) ? data.get('category') : (data ? data.category : 'vedtekter');
            const docDate = (data && typeof FormData !== 'undefined' && data instanceof FormData) ? data.get('document_date') : (data ? data.document_date : new Date().toISOString().split('T')[0]);

            if (docId) {
                const existing = db.documents.find(d => d.id == docId);
                if (existing) {
                    existing.title = title;
                    existing.content = content;
                    existing.category = category;
                    existing.document_date = docDate;
                    saveMockDB(db);
                    return { success: true, id: existing.id };
                }
            }
            const newDoc = {
                id: Date.now(),
                title,
                content,
                category,
                document_date: docDate,
                created_at: new Date().toISOString()
            };
            db.documents.unshift(newDoc);
            saveMockDB(db);
            return { success: true, id: newDoc.id };
        }

        case 'delete_document': {
            if (!db.documents) db.documents = [];
            const delId = data ? data.id : null;
            db.documents = db.documents.filter(d => d.id != delId);
            saveMockDB(db);
            return { success: true };
        }

        default:
            return { success: true };
    }
}

export async function request(action, method = 'GET', data = null, isFormData = false) {
    const isForm = isFormData || (typeof FormData !== 'undefined' && data instanceof FormData);
    const options = {
        method,
        headers: {}
    };

    let url = `${API_BASE}?action=${action}`;

    if (data && !isForm) {
        if (method === 'POST' || method === 'PUT') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else {
            const queryParams = new URLSearchParams(data).toString();
            url += `&${queryParams}`;
        }
    } else if (data && isForm) {
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
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return handleMockRequest(action, data);
            }
            throw new Error('Uventet serversvar: ' + text.substring(0, 150));
        }

        if (!response.ok) {
            throw new Error(json.error || `Serverfeil (${response.status})`);
        }
        return json;
    } catch (err) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return handleMockRequest(action, data);
        }
        throw err;
    }
}

export const AuthAPI = {
    login: (email, password) => request('login', 'POST', { email, password }),
    register: (email, password, name) => request('register', 'POST', { email, password, name }),
    logout: () => request('logout', 'POST'),
    getAuthState: () => request('auth_state'),
    updateProfile: (displayName) => request('update_profile', 'POST', { display_name: displayName }),
    uploadAvatar: (formData) => request('upload_avatar', 'POST', formData, true),
    changePassword: (newPassword) => request('change_password', 'POST', { new_password: newPassword }),
    acceptTos: () => request('accept_tos', 'POST')
};

export const PostAPI = {
    getPosts: (category = 'general') => request('get_posts', 'GET', { category }),
    createPost: (formData) => request('create_post', 'POST', formData, true),
    updatePost: (formData) => request('update_post', 'POST', formData, true),
    deletePost: (id) => request('delete_post', 'POST', { id }),
    toggleLike: (id) => request('like_post', 'POST', { id })
};

export const MemberAPI = {
    getMembers: () => request('get_members'),
    createMember: (email, password, name, role = 'medlem') => request('admin_create_member', 'POST', { email, password, name, role }),
    updateMember: (dataOrId, displayName, role) => {
        if (typeof dataOrId === 'object') {
            if (dataOrId instanceof FormData) {
                return request('admin_update_member', 'POST', dataOrId, true);
            }
            return request('admin_update_member', 'POST', dataOrId);
        }
        return request('admin_update_member', 'POST', { id: dataOrId, display_name: displayName, role });
    },
    deleteMember: (id) => request('delete_member', 'POST', { id })
};

export const GalleryAPI = {
    getGallery: (type = 'public') => request('get_gallery', 'GET', { type }),
    uploadImage: (formData) => request('upload_gallery', 'POST', formData, true),
    deleteImage: (id) => request('delete_gallery', 'POST', { id }),
    togglePublic: (id, isPublic = null) => request('toggle_gallery_public', 'POST', { id, is_public: isPublic })
};

export const EventAPI = {
    getEvents: () => request('get_events'),
    createEvent: (formData) => request('create_event', 'POST', formData, true),
    updateEvent: (formData) => request('update_event', 'POST', formData, true),
    deleteEvent: (id) => request('delete_event', 'POST', { id })
};

export const SettingsAPI = {
    getWorkshopStatus: () => request('get_workshop_status'),
    updateWorkshopStatus: (status, message, hours) => request('update_workshop_status', 'POST', { status, message, hours })
};

export const DocumentAPI = {
    getDocuments: (category = '') => request('get_documents', 'GET', category ? { category } : {}),
    saveDocument: (data) => request('save_document', 'POST', data, true),
    deleteDocument: (id) => request('delete_document', 'POST', { id })
};

