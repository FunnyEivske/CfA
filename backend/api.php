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
        $data = json_decode(file_get_contents('php://input'), true);
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            unset($user['password_hash']);
            jsonResponse(['success' => true, 'user' => $user]);
        } else {
            jsonResponse(['error' => 'Invalid email or password'], 401);
        }
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
            $stmt = $pdo->prepare('SELECT id, email, display_name, photo_url, role, member_since FROM users WHERE id = ?');
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                jsonResponse(['authenticated' => true, 'user' => $user]);
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
        $stmt = $pdo->query('SELECT id, display_name, photo_url, role, member_since, created_at FROM users ORDER BY display_name ASC');
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
        $stmt = $pdo->query('SELECT g.*, u.display_name AS uploader_name FROM gallery g LEFT JOIN users u ON g.uploader_id = u.id ORDER BY g.created_at DESC');
        jsonResponse(['gallery' => $stmt->fetchAll()]);
        break;

    case 'upload_gallery':
        requireAuth();
        if (!isset($_FILES['file'])) jsonResponse(['error' => 'No file provided'], 400);
        
        $file = $_FILES['file'];
        $title = trim($_POST['title'] ?? '');
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) {
            jsonResponse(['error' => 'Invalid image type'], 400);
        }
        
        $filename = 'gallery_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (move_uploaded_file($file['tmp_name'], $upload_dir . $filename)) {
            $url = '/uploads/' . $filename;
            $stmt = $pdo->prepare('INSERT INTO gallery (title, image_url, uploader_id) VALUES (?, ?, ?)');
            $stmt->execute([$title, $url, $_SESSION['user_id']]);
            jsonResponse(['success' => true, 'image_url' => $url]);
        } else {
            jsonResponse(['error' => 'Failed to save image file'], 500);
        }
        break;

    case 'get_events':
        $stmt = $pdo->query('SELECT * FROM events ORDER BY date ASC');
        jsonResponse(['events' => $stmt->fetchAll()]);
        break;

    default:
        jsonResponse(['error' => 'Invalid endpoint action'], 404);
}
?>
