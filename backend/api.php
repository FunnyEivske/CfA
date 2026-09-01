<?php
// backend/api.php
require_once 'config.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

// Ensure uploads directory exists
$upload_dir = __DIR__ . '/../uploads/';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

switch ($action) {
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = strtolower(trim($data['email'] ?? $_POST['email'] ?? ''));
        $password = trim($data['password'] ?? $_POST['password'] ?? '');
        
        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $mustChange = (int)($user['must_change_password'] ?? 0) === 1;
            $mustAcceptTos = (int)($user['tos_accepted'] ?? 0) === 0;
            unset($user['password_hash']);
            jsonResponse([
                'success' => true,
                'user' => $user,
                'must_change_password' => $mustChange,
                'must_accept_tos' => $mustAcceptTos
            ]);
        } else {
            jsonResponse(['error' => 'Feil e-post eller passord'], 401);
        }
        break;

    case 'accept_tos':
        requireAuth();
        $stmt = $pdo->prepare('UPDATE users SET tos_accepted = 1 WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        jsonResponse(['success' => true]);
        break;

    case 'change_password':
        requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $newPassword = trim($data['new_password'] ?? $_POST['new_password'] ?? '');
        
        if (strlen($newPassword) < 6) {
            jsonResponse(['error' => 'Passordet må være på minst 6 tegn.'], 400);
        }
        
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?');
        $stmt->execute([$hash, $_SESSION['user_id']]);
        
        jsonResponse(['success' => true]);
        break;

    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $data = json_decode(file_get_contents('php://input'), true);
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $name = trim($data['name'] ?? 'Medlem');
        
        if (!$email || !$password) jsonResponse(['error' => 'Missing required fields'], 400);
        
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $id = 'usr_' . bin2hex(random_bytes(8));
        
        try {
            $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, display_name, member_since) VALUES (?, ?, ?, ?, CURDATE())');
            $stmt->execute([$id, $email, $hash, $name]);
            
            $_SESSION['user_id'] = $id;
            $_SESSION['role'] = 'medlem';
            
            jsonResponse(['success' => true, 'user' => ['id' => $id, 'email' => $email, 'display_name' => $name, 'role' => 'medlem']]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                jsonResponse(['error' => 'Email already registered'], 400);
            }
            jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;
        
    case 'auth_state':
        if (isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare('SELECT id, email, display_name, photo_url, role, member_since, tos_accepted, must_change_password FROM users WHERE id = ?');
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                $mustChange = (int)($user['must_change_password'] ?? 0) === 1;
                $mustAcceptTos = (int)($user['tos_accepted'] ?? 0) === 0;
                unset($user['password_hash']);
                jsonResponse([
                    'authenticated' => true,
                    'user' => $user,
                    'must_change_password' => $mustChange,
                    'must_accept_tos' => $mustAcceptTos
                ]);
            }
        }
        jsonResponse(['authenticated' => false]);
        break;
        
    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    case 'update_profile':
        requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['display_name'] ?? '');
        
        if (!$name) jsonResponse(['error' => 'Display name cannot be empty'], 400);
        
        $stmt = $pdo->prepare('UPDATE users SET display_name = ? WHERE id = ?');
        $stmt->execute([$name, $_SESSION['user_id']]);
        jsonResponse(['success' => true]);
        break;

    case 'upload_avatar':
        requireAuth();
        if (!isset($_FILES['file'])) jsonResponse(['error' => 'No file uploaded'], 400);
        
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            jsonResponse(['error' => 'Invalid file format'], 400);
        }
        
        $filename = 'avatar_' . $_SESSION['user_id'] . '_' . time() . '.' . $ext;
        $target = $upload_dir . $filename;
        
        if (move_uploaded_file($file['tmp_name'], $target)) {
            $url = '/uploads/' . $filename;
            $stmt = $pdo->prepare('UPDATE users SET photo_url = ? WHERE id = ?');
            $stmt->execute([$url, $_SESSION['user_id']]);
            jsonResponse(['success' => true, 'photo_url' => $url]);
        } else {
            jsonResponse(['error' => 'Failed to save image'], 500);
        }
        break;

    case 'get_members':
        $stmt = $pdo->query('SELECT id, email, display_name, photo_url, role, member_since, created_at, must_change_password, tos_accepted FROM users ORDER BY display_name ASC');
        jsonResponse(['members' => $stmt->fetchAll()]);
        break;

    case 'get_posts':
        $category = $_GET['category'] ?? 'general';
        $userId = $_SESSION['user_id'] ?? null;
        
        $stmt = $pdo->prepare('
            SELECT p.*, 
                   EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked
            FROM posts p 
            WHERE p.category = ? 
            ORDER BY p.created_at DESC
        ');
        $stmt->execute([$userId, $category]);
        $posts = $stmt->fetchAll();
        
        foreach ($posts as &$post) {
            $post['image_urls'] = $post['image_urls'] ? json_decode($post['image_urls']) : null;
            $post['is_liked'] = (bool)$post['is_liked'];
        }
        jsonResponse(['posts' => $posts]);
        break;

    case 'create_post':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        
        $title = trim($_POST['title'] ?? '');
        $content = trim($_POST['content'] ?? '');
        $category = trim($_POST['category'] ?? 'general');
        
        if (!$title || !$content) jsonResponse(['error' => 'Title and content required'], 400);
        
        $stmt = $pdo->prepare('SELECT display_name, photo_url FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $author = $stmt->fetch();
        
        $imageUrl = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                $filename = 'post_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                    $imageUrl = '/uploads/' . $filename;
                }
            }
        }
        
        $stmt = $pdo->prepare('
            INSERT INTO posts (author_id, author_name, author_photo_url, title, content, image_url, category) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $_SESSION['user_id'],
            $author['display_name'] ?? 'Admin',
            $author['photo_url'] ?? null,
            $title,
            $content,
            $imageUrl,
            $category
        ]);
        
        jsonResponse(['success' => true, 'post_id' => $pdo->lastInsertId()]);
        break;

    case 'delete_post':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $postId = $data['id'] ?? 0;
        
        $stmt = $pdo->prepare('DELETE FROM posts WHERE id = ?');
        $stmt->execute([$postId]);
        jsonResponse(['success' => true]);
        break;

    case 'like_post':
        requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $postId = (int)($data['id'] ?? 0);
        $userId = $_SESSION['user_id'];
        
        if (!$postId) jsonResponse(['error' => 'Invalid post ID'], 400);
        
        $stmt = $pdo->prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?');
        $stmt->execute([$postId, $userId]);
        $exists = $stmt->fetchColumn();
        
        if ($exists) {
            // Unlike
            $stmt = $pdo->prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?');
            $stmt->execute([$postId, $userId]);
            $stmt = $pdo->prepare('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?');
            $stmt->execute([$postId]);
            $liked = false;
        } else {
            // Like
            $stmt = $pdo->prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)');
            $stmt->execute([$postId, $userId]);
            $stmt = $pdo->prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?');
            $stmt->execute([$postId]);
            $liked = true;
        }
        
        $stmt = $pdo->prepare('SELECT likes_count FROM posts WHERE id = ?');
        $stmt->execute([$postId]);
        $newCount = $stmt->fetchColumn();
        
        jsonResponse(['success' => true, 'liked' => $liked, 'likes_count' => (int)$newCount]);
        break;

    case 'get_gallery':
        $type = $_GET['type'] ?? 'public';
        if ($type === 'admin') {
            requireAuth();
            if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
            $stmt = $pdo->query('SELECT g.*, u.display_name AS uploader_name FROM gallery g LEFT JOIN users u ON g.uploader_id = u.id ORDER BY g.created_at DESC');
        } elseif ($type === 'my') {
            requireAuth();
            $stmt = $pdo->prepare('SELECT g.*, u.display_name AS uploader_name FROM gallery g LEFT JOIN users u ON g.uploader_id = u.id WHERE g.uploader_id = ? ORDER BY g.created_at DESC');
            $stmt->execute([$_SESSION['user_id']]);
        } else {
            // Public front-page gallery: only show approved public images
            $stmt = $pdo->query('SELECT g.*, u.display_name AS uploader_name FROM gallery g LEFT JOIN users u ON g.uploader_id = u.id WHERE g.is_public = 1 ORDER BY g.created_at DESC');
        }
        jsonResponse(['gallery' => $stmt->fetchAll()]);
        break;

    case 'toggle_gallery_public':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $imgId = (int)($data['id'] ?? 0);
        $isPublic = isset($data['is_public']) ? (int)$data['is_public'] : null;
        
        if (!$imgId) jsonResponse(['error' => 'Mangler bilde-ID'], 400);
        
        if ($isPublic !== null) {
            $stmt = $pdo->prepare('UPDATE gallery SET is_public = ? WHERE id = ?');
            $stmt->execute([$isPublic, $imgId]);
        } else {
            $stmt = $pdo->prepare('UPDATE gallery SET is_public = NOT COALESCE(is_public, 0) WHERE id = ?');
            $stmt->execute([$imgId]);
        }
        
        $stmt = $pdo->prepare('SELECT is_public FROM gallery WHERE id = ?');
        $stmt->execute([$imgId]);
        $newVal = (int)$stmt->fetchColumn();
        
        jsonResponse(['success' => true, 'id' => $imgId, 'is_public' => $newVal]);
        break;

    case 'upload_gallery':
        requireAuth();
        $uploadedUrls = [];
        
        // Single file upload ('file')
        if (isset($_FILES['file'])) {
            if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                $errCode = $_FILES['file']['error'];
                $errMsg = 'Opplastingsfeil (kode ' . $errCode . ')';
                if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
                    $errMsg = 'Bildet er for stort for serveren.';
                }
                jsonResponse(['error' => $errMsg], 400);
            }

            $file = $_FILES['file'];
            $title = trim($_POST['title'] ?? pathinfo($file['name'], PATHINFO_FILENAME));
            $origExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            
            $validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'jfif', 'avif'];
            $ext = in_array($origExt, $validExts) ? $origExt : '';
            
            if (!$ext) {
                $mime = function_exists('mime_content_type') ? mime_content_type($file['tmp_name']) : ($file['type'] ?? '');
                if (stripos($mime, 'jpeg') !== false || stripos($mime, 'jpg') !== false) $ext = 'jpg';
                elseif (stripos($mime, 'png') !== false) $ext = 'png';
                elseif (stripos($mime, 'webp') !== false) $ext = 'webp';
                elseif (stripos($mime, 'gif') !== false) $ext = 'gif';
                else $ext = 'jpg'; // Fallback to jpg
            }
            if ($ext === 'jpeg' || $ext === 'jfif') $ext = 'jpg';
            
            $filename = 'gallery_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                $url = '/uploads/' . $filename;
                $stmt = $pdo->prepare('INSERT INTO gallery (title, image_url, uploader_id, is_public) VALUES (?, ?, ?, 0)');
                $stmt->execute([$title, $url, $_SESSION['user_id']]);
                jsonResponse(['success' => true, 'image_url' => $url]);
            } else {
                jsonResponse(['error' => 'Kunne ikke lagre bildefilen på serveren.'], 500);
            }
        }
        
        // Check for multiple files in 'files'
        if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
            $titles = $_POST['titles'] ?? [];
            for ($i = 0; $i < count($_FILES['files']['name']); $i++) {
                if ($_FILES['files']['error'][$i] === UPLOAD_ERR_OK) {
                    $origName = $_FILES['files']['name'][$i];
                    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
                    if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                        $filename = 'gallery_' . time() . '_' . bin2hex(random_bytes(6)) . '_' . $i . '.' . $ext;
                        if (move_uploaded_file($_FILES['files']['tmp_name'][$i], $upload_dir . $filename)) {
                            $url = '/uploads/' . $filename;
                            $title = is_array($titles) && isset($titles[$i]) ? trim($titles[$i]) : pathinfo($origName, PATHINFO_FILENAME);
                            $stmt = $pdo->prepare('INSERT INTO gallery (title, image_url, uploader_id, is_public) VALUES (?, ?, ?, 0)');
                            $stmt->execute([$title, $url, $_SESSION['user_id']]);
                            $uploadedUrls[] = $url;
                        }
                    }
                }
            }
            if (count($uploadedUrls) > 0) {
                jsonResponse(['success' => true, 'count' => count($uploadedUrls), 'urls' => $uploadedUrls]);
            }
        }
        
        jsonResponse(['error' => 'Ingen gyldige bildefiler ble mottatt.'], 400);
        break;

    case 'get_events':
        $stmt = $pdo->query('SELECT * FROM events ORDER BY date ASC');
        jsonResponse(['events' => $stmt->fetchAll()]);
        break;    case 'create_event':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Bare administratorer kan opprette arrangementer.'], 403);
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $rawDate = trim($_POST['date'] ?? '');
        $location = trim($_POST['location'] ?? '');
        $visibility = trim($_POST['visibility'] ?? 'public');
        
        if (!$title || !$rawDate) jsonResponse(['error' => 'Tittel og dato er påkrevd.'], 400);
        
        $date = date('Y-m-d H:i:s', strtotime($rawDate));
        
        $imageUrl = trim($_POST['image_url'] ?? '') ?: null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['image'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'jfif', 'avif'])) {
                $ext = 'jpg';
            }
            $filename = 'event_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                $imageUrl = '/uploads/' . $filename;
            }
        } elseif ($imageUrl && (strpos($imageUrl, 'http://') === 0 || strpos($imageUrl, 'https://') === 0)) {
            // Try downloading web image locally
            $context = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                ]
            ]);
            $imgData = @file_get_contents($imageUrl, false, $context);
            if ($imgData && strlen($imgData) > 100) {
                $filename = 'event_' . time() . '_' . bin2hex(random_bytes(6)) . '.jpg';
                if (@file_put_contents($upload_dir . $filename, $imgData)) {
                    $imageUrl = '/uploads/' . $filename;
                }
            }
        }
        
        try {
            $stmt = $pdo->prepare('INSERT INTO events (title, description, date, location, image_url, visibility) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$title, $description, $date, $location, $imageUrl, $visibility]);
            jsonResponse(['success' => true, 'event_id' => $pdo->lastInsertId(), 'image_url' => $imageUrl]);
        } catch (PDOException $e) {
            jsonResponse(['error' => 'Databasefeil: ' . $e->getMessage()], 500);
        }
        break;

    case 'delete_member':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['id'] ?? '';
        if ($userId === $_SESSION['user_id']) {
            jsonResponse(['error' => 'Kan ikke slette din egen konto'], 400);
        }
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        jsonResponse(['success' => true]);
        break;

    case 'delete_gallery':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $imgId = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM gallery WHERE id = ?');
        $stmt->execute([$imgId]);
        jsonResponse(['success' => true]);
        break;

    case 'delete_event':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $eventId = (int)($data['id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
        $stmt->execute([$eventId]);
        jsonResponse(['success' => true]);
        break;

    case 'admin_create_member':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $email = strtolower(trim($data['email'] ?? ''));
        $password = trim($data['password'] ?? '123456');
        $name = trim($data['name'] ?? 'Medlem');
        $role = in_array($data['role'] ?? '', ['admin', 'medlem']) ? $data['role'] : 'medlem';
        
        if (!$email || !$password) jsonResponse(['error' => 'E-post og passord er påkrevd'], 400);
        
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $id = 'usr_' . bin2hex(random_bytes(8));
        
        try {
            $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, display_name, role, member_since, must_change_password) VALUES (?, ?, ?, ?, ?, CURDATE(), 1)');
            $stmt->execute([$id, $email, $hash, $name, $role]);
            jsonResponse(['success' => true, 'user' => ['id' => $id, 'email' => $email, 'display_name' => $name, 'role' => $role]]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                jsonResponse(['error' => 'E-post er allerede registrert'], 400);
            }
            jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    case 'admin_update_member':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = $data['id'] ?? '';
        $name = trim($data['display_name'] ?? '');
        $email = strtolower(trim($data['email'] ?? ''));
        $role = in_array($data['role'] ?? '', ['admin', 'medlem']) ? $data['role'] : 'medlem';
        $memberSince = !empty($data['member_since']) ? $data['member_since'] : date('Y-m-d');
        $newPassword = trim($data['password'] ?? '');
        $photoUrl = trim($data['photo_url'] ?? '');
        
        if (!$id) jsonResponse(['error' => 'Mangler bruker-ID'], 400);
        if (!$name) jsonResponse(['error' => 'Navn kan ikke være tomt'], 400);
        if (!$email) jsonResponse(['error' => 'E-post kan ikke være tom'], 400);
        
        // Handle avatar upload if sent via multipart/form-data
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['photo'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
                $filename = 'avatar_' . $id . '_' . time() . '.' . $ext;
                if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                    $photoUrl = '/uploads/' . $filename;
                }
            }
        }
        
        $sql = 'UPDATE users SET display_name = ?, email = ?, role = ?, member_since = ?';
        $params = [$name, $email, $role, $memberSince];
        
        if ($photoUrl) {
            $sql .= ', photo_url = ?';
            $params[] = $photoUrl;
        }
        
        if ($newPassword) {
            $sql .= ', password_hash = ?, must_change_password = 1';
            $params[] = password_hash($newPassword, PASSWORD_DEFAULT);
        }
        
        $sql .= ' WHERE id = ?';
        $params[] = $id;
        
        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse(['success' => true, 'photo_url' => $photoUrl ?: null]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                jsonResponse(['error' => 'E-postadressen er allerede i bruk av en annen bruker.'], 400);
            }
            jsonResponse(['error' => 'Databasefeil: ' . $e->getMessage()], 500);
        }
        break;

    case 'get_documents':
        $category = $_GET['category'] ?? '';
        if ($category) {
            $stmt = $pdo->prepare('SELECT d.*, u.display_name AS author_name FROM documents d LEFT JOIN users u ON d.author_id = u.id WHERE d.category = ? ORDER BY COALESCE(d.document_date, d.created_at) DESC, d.id DESC');
            $stmt->execute([$category]);
        } else {
            $stmt = $pdo->query('SELECT d.*, u.display_name AS author_name FROM documents d LEFT JOIN users u ON d.author_id = u.id ORDER BY COALESCE(d.document_date, d.created_at) DESC, d.id DESC');
        }
        jsonResponse(['documents' => $stmt->fetchAll()]);
        break;

    case 'save_document':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        
        $data = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        
        $docId = !empty($data['id']) ? (int)$data['id'] : 0;
        $category = trim($data['category'] ?? 'vedtekter');
        $title = trim($data['title'] ?? '');
        $content = trim($data['content'] ?? '');
        $docDate = !empty($data['document_date']) ? $data['document_date'] : date('Y-m-d');
        
        if (!$title || !$content) {
            jsonResponse(['error' => 'Tittel og innhold er påkrevd.'], 400);
        }
        
        $fileUrl = null;
        if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
            $file = $_FILES['pdf_file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'])) {
                $filename = 'doc_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
                    $fileUrl = '/uploads/' . $filename;
                }
            }
        }
        
        if ($docId > 0) {
            if ($fileUrl) {
                $stmt = $pdo->prepare('UPDATE documents SET title = ?, content = ?, category = ?, document_date = ?, file_url = ? WHERE id = ?');
                $stmt->execute([$title, $content, $category, $docDate, $fileUrl, $docId]);
            } else {
                $stmt = $pdo->prepare('UPDATE documents SET title = ?, content = ?, category = ?, document_date = ? WHERE id = ?');
                $stmt->execute([$title, $content, $category, $docDate, $docId]);
            }
            jsonResponse(['success' => true, 'id' => $docId, 'file_url' => $fileUrl]);
        } else {
            $stmt = $pdo->prepare('INSERT INTO documents (category, title, content, file_url, document_date, author_id) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$category, $title, $content, $fileUrl, $docDate, $_SESSION['user_id']]);
            jsonResponse(['success' => true, 'id' => $pdo->lastInsertId(), 'file_url' => $fileUrl]);
        }
        break;

    case 'delete_document':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        $docId = (int)($data['id'] ?? 0);
        
        if (!$docId) jsonResponse(['error' => 'Mangler dokument-ID'], 400);
        
        $stmt = $pdo->prepare('DELETE FROM documents WHERE id = ?');
        $stmt->execute([$docId]);
        jsonResponse(['success' => true]);
        break;

    case 'get_workshop_status':
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('workshop_status', 'workshop_message', 'workshop_hours')");
        $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $status = $rows['workshop_status'] ?? 'open';
        $message = $rows['workshop_message'] ?? 'Velkommen til vårt verksted!';
        $hours = isset($rows['workshop_hours']) ? json_decode($rows['workshop_hours'], true) : [
            'Mandag' => 'Stengt',
            'Tirsdag' => '18:00 - 21:00',
            'Onsdag' => '18:00 - 21:00',
            'Torsdag' => '18:00 - 21:00',
            'Fredag' => '18:00 - 22:00',
            'Lørdag' => '12:00 - 18:00',
            'Søndag' => 'Stengt'
        ];
        
        jsonResponse([
            'status' => $status,
            'message' => $message,
            'hours' => $hours
        ]);
        break;

    case 'update_workshop_status':
        requireAuth();
        if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
        $data = json_decode(file_get_contents('php://input'), true);
        
        $status = $data['status'] ?? 'open';
        $message = trim($data['message'] ?? '');
        $hours = json_encode($data['hours'] ?? []);
        
        // Ensure table exists
        $pdo->exec("CREATE TABLE IF NOT EXISTS site_settings (
            setting_key VARCHAR(50) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");
        
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
        $stmt->execute(['workshop_status', $status]);
        $stmt->execute(['workshop_message', $message]);
        $stmt->execute(['workshop_hours', $hours]);
        
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Invalid endpoint action'], 404);
}
?>
