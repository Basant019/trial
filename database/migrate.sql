-- SkySafe Migration Script
-- Run this on an EXISTING skysafe_db to add new columns/tables
-- Safe to run multiple times (uses IF NOT EXISTS / column checks)

USE skysafe_db;

-- 1. Add role column to users (if not exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user' AFTER password;

-- 2. Add interests column to trip_plans (if not exists)
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS interests TEXT AFTER budget_level;

-- 3. Add notes column to trip_plans (if not exists)
ALTER TABLE trip_plans ADD COLUMN IF NOT EXISTS notes TEXT AFTER interests;

-- 4. Create disaster_reports table
CREATE TABLE IF NOT EXISTS disaster_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    disaster_type VARCHAR(50) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    location VARCHAR(150) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    description TEXT NOT NULL,
    photo_url VARCHAR(500),
    status ENUM('pending', 'reviewing', 'resolved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT,
    admin_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create trip_updates table
CREATE TABLE IF NOT EXISTS trip_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    update_type ENUM('note', 'change', 'add_activity', 'status_change') DEFAULT 'note',
    title VARCHAR(200),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trip_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed default admin
INSERT INTO users (full_name, email, password, role)
VALUES (
    'SkySafe Admin',
    'admin@skysafe.com',
    '$2b$10$Wj1Bi2EYo9Hw6LSqntduburixEMgbkSSBCXlXD1hYUDx5zbai8wpy',
    'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin';

SELECT 'Migration complete!' AS status;
