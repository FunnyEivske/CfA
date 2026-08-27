-- MySQL Database Schema for CfA (Cosplay for All / Cosplay for Alle)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    photo_url VARCHAR(255) DEFAULT NULL,
    role VARCHAR(50) DEFAULT 'medlem', -- 'admin', 'medlem'
    member_since DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATETIME NOT NULL,
    end_date DATETIME DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    image_offset INT DEFAULT 0,
    visibility VARCHAR(50) DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id VARCHAR(128) NOT NULL,
    author_name VARCHAR(100),
    author_photo_url VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    image_urls JSON DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'general',
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id INT NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) DEFAULT NULL,
    image_url VARCHAR(255) NOT NULL,
    uploader_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Standard test-bruker for MySQL (Passord: 123456)
INSERT IGNORE INTO users (id, email, password_hash, display_name, role, member_since)
VALUES ('usr_admin', 'admin@cfa.no', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHeFvX0pXjR9Q.Z/QyO8w5V9vP3J.p5q0K', 'Admin Cosplayer', 'admin', '2026-01-01');

INSERT IGNORE INTO users (id, email, password_hash, display_name, role, member_since)
VALUES ('usr_2', 'nora@cfa.no', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHeFvX0pXjR9Q.Z/QyO8w5V9vP3J.p5q0K', 'Nora (Foam Smith)', 'medlem', '2026-02-15');

