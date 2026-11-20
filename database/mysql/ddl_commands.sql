
USE transit_db;

-- 1. ALTER TABLE
ALTER TABLE routes
ADD COLUMN updated_at TIMESTAMP
DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP;

-- 2. CREATE INDEX
CREATE INDEX idx_routes_active_start
ON routes(active, start_stop_id);

-- 3. CREATE TABLE
CREATE TABLE IF NOT EXISTS ddl_demo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    demo_name VARCHAR(100) NOT NULL,
    demo_value INT CHECK (demo_value >= 0),
    UNIQUE (demo_name)
);

-- 4. ALTER TABLE
ALTER TABLE ddl_demo
ADD COLUMN created_at TIMESTAMP
DEFAULT CURRENT_TIMESTAMP;

-- 5. DROP TABLE
DROP TABLE ddl_demo;

-- 6. VERIFY
DESC routes;

SHOW INDEX FROM routes;
