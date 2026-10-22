<?php
// backend/config.php
$isHttps = (
    (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') ||
    (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') ||
    (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
);

// Øk PHP session levetid til 90 dager og bruk isolert sessions-mappe for å unngå /tmp-tømming
$sessLifetime = 86400 * 90; // 90 dager
ini_set('session.gc_maxlifetime', $sessLifetime);
ini_set('session.cookie_lifetime', $sessLifetime);

$sessDir = __DIR__ . '/sessions';
if (!file_exists($sessDir)) {
    @mkdir($sessDir, 0700, true);
    @file_put_contents($sessDir . '/.htaccess', "Order allow,deny\nDeny from all\n");
}
if (is_dir($sessDir) && is_writable($sessDir)) {
    ini_set('session.save_path', $sessDir);
}

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => $sessLifetime,
        'path' => '/',
        'domain' => '',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

$db_host = 'sql12.hmg9.webhuset.no';
$db_user = '237751_cfa';
$db_pass = 'GIjeri3';
$db_name = '237751_cfa';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
}
?>
