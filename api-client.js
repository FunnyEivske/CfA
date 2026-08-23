// api-client.js - Lightweight REST API Client for CfA Backend

const API_BASE = '/backend/api.php';

export async function request(action, method = 'GET', data = null, isFormData = false) {
    const options = {
        method,
        headers: {}
    };

    let url = `${API_BASE}?action=${action}`;

    if (data) {
        if (isFormData) {
            options.body = data;
        } else if (method === 'POST' || method === 'PUT') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else {
            const queryParams = new URLSearchParams(data).toString();
            url += `&${queryParams}`;
        }
    }

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        if (!response.ok) {
            throw new Error(json.error || 'Network response error');
        }
        return json;
    } catch (err) {
        console.error(`API Error [${action}]:`, err);
        throw err;
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
