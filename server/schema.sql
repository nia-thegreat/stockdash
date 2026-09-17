-- StockDash Database Schema
-- Run: mysql -u root -p < server/schema.sql

CREATE DATABASE IF NOT EXISTS inventory_db;
USE inventory_db;

-- Parts table
CREATE TABLE IF NOT EXISTS parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  part_id INT NOT NULL,
  quantity_sold INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  invoice_number VARCHAR(40) NULL,
  sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE,
  UNIQUE KEY idx_sales_invoice_number (invoice_number)
);

-- Activity log (append-only audit trail). entity_id intentionally has no FK so
-- deleting a part does not erase its history; the part name is denormalized into
-- description/details. actor is reserved for future authentication (no user
-- accounts yet, so it defaults to 'system').
CREATE TABLE IF NOT EXISTS activities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(40) NOT NULL,
  category ENUM('inventory', 'sales') NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INT NULL,
  description VARCHAR(255) NOT NULL,
  details JSON NULL,
  actor VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activities_created (created_at),
  INDEX idx_activities_category_created (category, created_at)
);

-- Seed data: parts
INSERT INTO parts (name, stock_quantity, price) VALUES
('Oil Filter', 120, 12.99),
('Air Filter', 85, 18.49),
('Brake Pads (Front)', 45, 49.99),
('Spark Plugs (Set of 4)', 60, 24.99),
('Transmission Fluid (1L)', 200, 9.99),
('Windshield Wipers (Pair)', 75, 15.99),
('Coolant (1 Gallon)', 40, 22.99),
('Cabin Air Filter', 90, 14.99);

-- Seed data: sales
INSERT INTO sales (part_id, quantity_sold, total_amount, sold_at) VALUES
(1, 12, 155.88, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(2, 8, 147.92, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(3, 3, 149.97, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(1, 6, 77.94, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(4, 5, 124.95, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(5, 10, 99.90, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(6, 4, 63.96, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(7, 2, 45.98, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(2, 5, 92.45, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(8, 6, 89.94, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(1, 15, 194.85, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(3, 2, 99.98, DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, 8, 79.92, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 4, 99.96, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, 3, 47.97, DATE_SUB(NOW(), INTERVAL 1 DAY));
