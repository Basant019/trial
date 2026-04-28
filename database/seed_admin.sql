-- SkySafe Admin Seed Script
-- Run this AFTER schema.sql to create the default admin account
-- Credentials: admin@skysafe.com / Admin@123

USE skysafe_db;

INSERT INTO users (full_name, email, password, role)
VALUES (
    'SkySafe Admin',
    'admin@skysafe.com',
    '$2b$10$Wj1Bi2EYo9Hw6LSqntduburixEMgbkSSBCXlXD1hYUDx5zbai8wpy',
    'admin'
)
ON DUPLICATE KEY UPDATE role = 'admin', password = '$2b$10$Wj1Bi2EYo9Hw6LSqntduburixEMgbkSSBCXlXD1hYUDx5zbai8wpy';

-- To create additional admins, run:
-- INSERT INTO users (full_name, email, password, role) VALUES ('Name', 'email@domain.com', '<bcrypt_hash>', 'admin');
