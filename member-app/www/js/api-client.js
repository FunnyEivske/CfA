// api-client.js - REST API Client with Automatic Local Mock Fallback for Testing

const isNativeApp = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'ionic:' || 
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !!window.Capacitor)
);

const API_BASE = (typeof window !== 'undefined' && window.CFA_API_BASE)
    ? window.CFA_API_BASE
    : (isNativeApp ? 'https://cosplayforalle.no/backend/api.php' : '/backend/api.php');

// Local Mock State for Offline / Vite Dev Testing
const MOCK_STORAGE_KEY = 'cfa_mock_db_v2';

function getMockDB() {
    let db = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!db) {
        db = {
            currentUser: null,
            members: [
                { id: 'usr_eivind', email: 'eivind@cosplayforalle.no', display_name: 'Eivind', role: 'admin', photo_url: 'Media/Logo/cfa-logo.jpg' }
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

        case 'upload_avatar': {
            const url = 'https://picsum.photos/seed/' + Date.now() + '/150/150';
            if (db.currentUser) {
                db.currentUser.photo_url = url;
                const m = db.members.find(u => u.id === db.currentUser.id);
                if (m) m.photo_url = url;
                saveMockDB(db);
            }
            return { success: true, photo_url: url };
        }

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

        case 'send_contact':
            return { success: true, message: 'Meldingen din har blitt sendt!' };

        case 'get_vapid_public_key':
            return { publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJuNn08W9vDY9m00Z87_7g' };

        case 'save_push_subscription':
        case 'unsubscribe_push':
        case 'send_test_push':
            return { success: true };

        case 'get_workshop_status': {
            return {
                status: db.workshop_status || 'auto',
                message: db.workshop_message || '',
                hours: db.workshop_hours || {
                    'Mandag': 'Stengt',
                    'Tirsdag': 'Stengt',
                    'Onsdag': 'Stengt',
                    'Torsdag': 'Stengt',
                    'Fredag': '18:00-21:00',
                    'Lørdag': 'Stengt',
                    'Søndag': 'Stengt'
                }
            };
        }

        case 'update_workshop_status': {
            db.workshop_status = data.status || 'auto';
            db.workshop_message = data.message || '';
            if (data.hours) db.workshop_hours = data.hours;
            saveMockDB(db);
            return { success: true };
        }
    }
}

export async function request(action, method = 'GET', data = null, isFormData = false) {
    const isForm = isFormData || (typeof FormData !== 'undefined' && data instanceof FormData);
    const options = {
        method,
        headers: {},
        credentials: 'include'
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

/**
 * Rask klientside-bildeoptimalisering via HTML5 Canvas.
 * Skalerer ned store kamera- og mobilbilder (f.eks. 5-30 MB) og komprimerer til JPEG.
 * Hvis bildet fremdeles er for stort i kilobyte, reduseres kvaliteten og oppløsningen
 * automatisk trinn for trinn til filen er optimal (under 500 KB).
 */
export async function optimizeImageForUpload(file, maxWidth = 1024, initialQuality = 0.85, maxSizeBytes = 500 * 1024) {
    if (!file || !(file instanceof Blob) || !file.type || !file.type.startsWith('image/')) {
        return file;
    }
    // Bevar animerte GIF-er
    if (file.type === 'image/gif') {
        return file;
    }

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = async () => {
            URL.revokeObjectURL(url);
            let curWidth = img.width;
            let curHeight = img.height;
            let curQuality = initialQuality;

            if (curWidth > curHeight) {
                if (curWidth > maxWidth) {
                    curHeight = Math.round((curHeight * maxWidth) / curWidth);
                    curWidth = maxWidth;
                }
            } else {
                if (curHeight > maxWidth) {
                    curWidth = Math.round((curWidth * maxWidth) / curHeight);
                    curHeight = maxWidth;
                }
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            function getBlob(w, h, q) {
                canvas.width = w;
                canvas.height = h;
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                return new Promise((resBlob) => {
                    canvas.toBlob(resBlob, 'image/jpeg', q);
                });
            }

            let blob = await getBlob(curWidth, curHeight, curQuality);

            // Reduser kvalitet og oppløsning trinnvis dersom bildet fremdeles er for stort
            while (blob && blob.size > maxSizeBytes && (curQuality > 0.4 || curWidth > 350)) {
                if (curQuality > 0.5) {
                    curQuality -= 0.15;
                } else {
                    curWidth = Math.round(curWidth * 0.8);
                    curHeight = Math.round(curHeight * 0.8);
                }
                blob = await getBlob(curWidth, curHeight, curQuality);
            }

            if (blob) {
                const originalName = file.name || 'image.jpg';
                const cleanName = originalName.replace(/\.[^/.]+$/, '') + '.jpg';
                try {
                    resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
                } catch (e) {
                    blob.name = cleanName;
                    resolve(blob);
                }
            } else {
                resolve(file);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

export const AuthAPI = {
    login: async (email, password) => {
        const res = await request('login', 'POST', { email, password });
        if (res && res.success) {
            try { localStorage.setItem('cfa_has_session', '1'); } catch (e) {}
        }
        return res;
    },
    register: async (email, password, name) => {
        const res = await request('register', 'POST', { email, password, name });
        if (res && res.success) {
            try { localStorage.setItem('cfa_has_session', '1'); } catch (e) {}
        }
        return res;
    },
    logout: async () => {
        try { localStorage.removeItem('cfa_has_session'); } catch (e) {}
        return request('logout', 'POST');
    },
    getAuthState: async () => {
        try {
            const res = await request('auth_state');
            if (res && res.authenticated) {
                try { localStorage.setItem('cfa_has_session', '1'); } catch (e) {}
            } else {
                try { localStorage.removeItem('cfa_has_session'); } catch (e) {}
            }
            return res;
        } catch (err) {
            return { authenticated: false };
        }
    },
    updateProfile: (displayName, phone, contactEmail) => {
        const payload = typeof displayName === 'object' && displayName !== null
            ? displayName
            : { display_name: displayName, phone: phone || null, contact_email: contactEmail || null };
        return request('update_profile', 'POST', payload);
    },
    uploadAvatar: async (formDataOrFile) => {
        let fd = formDataOrFile;
        if (formDataOrFile instanceof File || formDataOrFile instanceof Blob) {
            const optimized = await optimizeImageForUpload(formDataOrFile, 1024, 0.85);
            fd = new FormData();
            fd.append('file', optimized);
        } else if (formDataOrFile instanceof FormData) {
            const file = formDataOrFile.get('file');
            if (file && (file instanceof File || file instanceof Blob)) {
                const optimized = await optimizeImageForUpload(file, 1024, 0.85);
                formDataOrFile.set('file', optimized);
            }
        }
        return request('upload_avatar', 'POST', fd, true);
    },
    changePassword: (newPassword) => request('change_password', 'POST', { new_password: newPassword }),
    acceptTos: () => request('accept_tos', 'POST')
};

export const PostAPI = {
    getPosts: (category = 'general') => request('get_posts', 'GET', { category }),
    createPost: async (formData) => {
        if (formData instanceof FormData) {
            const img = formData.get('image');
            if (img && (img instanceof File || img instanceof Blob)) {
                const optimized = await optimizeImageForUpload(img, 1920, 0.85);
                formData.set('image', optimized);
            }
        }
        return request('create_post', 'POST', formData, true);
    },
    updatePost: async (formData) => {
        if (formData instanceof FormData) {
            const img = formData.get('image');
            if (img && (img instanceof File || img instanceof Blob)) {
                const optimized = await optimizeImageForUpload(img, 1920, 0.85);
                formData.set('image', optimized);
            }
        }
        return request('update_post', 'POST', formData, true);
    },
    deletePost: (id) => request('delete_post', 'POST', { id }),
    toggleLike: (id) => request('like_post', 'POST', { id })
};

export const MemberAPI = {
    getMembers: () => request('get_members'),
    createMember: (email, password, name, role = 'medlem') => request('admin_create_member', 'POST', { email, password, name, role }),
    updateMember: async (dataOrId, displayName, role) => {
        if (typeof dataOrId === 'object') {
            if (dataOrId instanceof FormData) {
                const photo = dataOrId.get('photo');
                if (photo && (photo instanceof File || photo instanceof Blob)) {
                    const optimized = await optimizeImageForUpload(photo, 1024, 0.85);
                    dataOrId.set('photo', optimized);
                }
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
    uploadImage: async (formData) => {
        if (formData instanceof FormData) {
            const file = formData.get('file');
            if (file && (file instanceof File || file instanceof Blob)) {
                const optimized = await optimizeImageForUpload(file, 2048, 0.85);
                formData.set('file', optimized);
            }
        }
        return request('upload_gallery', 'POST', formData, true);
    },
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

export const ContactAPI = {
    sendMessage: (name, email, message, website = '') => request('send_contact', 'POST', { name, email, message, website })
};

export const PushAPI = {
    getPublicKey: () => request('get_vapid_public_key'),
    saveSubscription: (subscription) => request('save_push_subscription', 'POST', subscription),
    unsubscribe: (endpoint) => request('unsubscribe_push', 'POST', { endpoint }),
    sendTestPush: () => request('send_test_push', 'POST')
};

/**
 * Konverterer en Base64URL-streng til en Uint8Array (påkrevd av pushManager.subscribe)
 */
export function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registrerer service worker hvis støttet
 */
export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            return await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        } catch (err) {
            console.warn('Service Worker registrering feilet:', err);
            return null;
        }
    }
    return null;
}

/**
 * Abonnerer brukeren på Web Push (VAPID) og sender til backend
 */
export async function subscribeUserToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('Nettleseren din støtter dessverre ikke Web Push-varsler.');
    }

    const reg = await registerServiceWorker();
    if (!reg) {
        throw new Error('Kunne ikke registrere Service Worker.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Varslingstillatelse ble ikke innvilget.');
    }

    // Hent VAPID offentlig nøkkel fra backend
    const vapidRes = await PushAPI.getPublicKey();
    if (!vapidRes || !vapidRes.publicKey) {
        throw new Error('Mottok ingen VAPID-nøkkel fra serveren.');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidRes.publicKey);

    // Sjekk om abonnement allerede finnes
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
    }

    // Send til backend
    const subJson = subscription.toJSON();
    await PushAPI.saveSubscription(subJson);
    return subscription;
}


