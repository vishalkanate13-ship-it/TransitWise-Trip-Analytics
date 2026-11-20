CREATE DATABASE IF NOT EXISTS transit_db;
USE transit_db;

CREATE TABLE IF NOT EXISTS app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PASSENGER','ADMIN') NOT NULL DEFAULT 'PASSENGER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stop_code VARCHAR(20) NOT NULL UNIQUE,
  stop_name VARCHAR(120) NOT NULL,
  area VARCHAR(120) NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

CREATE TABLE IF NOT EXISTS buses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_number VARCHAR(30) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity > 0),
  bus_type VARCHAR(40) NOT NULL DEFAULT 'Standard',
  status ENUM('ACTIVE','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_code VARCHAR(20) NOT NULL UNIQUE,
  route_name VARCHAR(120) NOT NULL,
  start_stop_id INT NOT NULL,
  end_stop_id INT NOT NULL,
  bus_id INT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  distance_km DECIMAL(7,2) NOT NULL CHECK (distance_km > 0),
  transfers INT NOT NULL DEFAULT 0 CHECK (transfers >= 0),
  base_fare DECIMAL(8,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_route_start FOREIGN KEY (start_stop_id) REFERENCES stops(id),
  CONSTRAINT fk_route_end FOREIGN KEY (end_stop_id) REFERENCES stops(id),
  CONSTRAINT fk_route_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
);

CREATE TABLE IF NOT EXISTS route_stops (
  route_id INT NOT NULL,
  stop_id INT NOT NULL,
  stop_order INT NOT NULL,
  estimated_minutes_from_start INT NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, stop_id),
  UNIQUE KEY uq_route_order (route_id, stop_order),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);

CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  departure_time TIME NOT NULL,
  frequency_minutes INT NOT NULL DEFAULT 20,
  operating_days VARCHAR(80) NOT NULL DEFAULT 'MON-SUN',
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_schedule_route_time (route_id, departure_time)
);

CREATE TABLE IF NOT EXISTS passenger_trips (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  passenger_id INT NOT NULL,
  route_id INT NOT NULL,
  travel_date DATE NOT NULL,
  fare_paid DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (passenger_id) REFERENCES app_users(id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  INDEX idx_trip_date_route (travel_date, route_id)
);

CREATE TABLE IF NOT EXISTS crowding_summary (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  crowd_percent TINYINT UNSIGNED NOT NULL CHECK (crowd_percent <= 100),
  observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(40) NOT NULL DEFAULT 'ADMIN',
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_crowd_route_time (route_id, observed_at)
);

CREATE OR REPLACE VIEW route_overview AS
SELECT r.id, r.route_code, r.route_name,
       s1.stop_name AS source_name, s2.stop_name AS destination_name,
       b.bus_number, b.capacity, r.duration_minutes, r.distance_km,
       r.transfers, r.base_fare, r.active
FROM routes r
JOIN stops s1 ON s1.id = r.start_stop_id
JOIN stops s2 ON s2.id = r.end_stop_id
JOIN buses b ON b.id = r.bus_id;


CREATE TABLE IF NOT EXISTS crowding_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  crowd_percent TINYINT UNSIGNED NOT NULL,
  observed_at TIMESTAMP NOT NULL,
  source VARCHAR(40) NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_route_time (route_id, observed_at)
);

DELIMITER //
CREATE PROCEDURE GetRoutePopularity()
BEGIN
  SELECT r.route_code, r.route_name, COUNT(DISTINCT t.id) AS trip_count,
         COALESCE(ROUND(AVG(c.crowd_percent),1),0) AS average_crowd
  FROM routes r
  LEFT JOIN passenger_trips t ON t.route_id = r.id
  LEFT JOIN crowding_summary c ON c.route_id = r.id
       AND c.observed_at >= NOW() - INTERVAL 7 DAY
  GROUP BY r.id, r.route_code, r.route_name
  ORDER BY trip_count DESC;
END//

DELIMITER ;


-- Sample master data
INSERT IGNORE INTO stops (id,stop_code,stop_name,area,latitude,longitude) VALUES
(1,'MTH','Marathahalli Bridge','Marathahalli',12.9592,77.6974),
(2,'SBR','Silk Board','BTM',12.9177,77.6233),
(3,'HOS','Hosa Road','Electronic City',12.8879,77.6470),
(4,'SAR','Sarjapura','Sarjapur',12.9116,77.6870),
(5,'KRM','KR Market','Chickpet',12.9634,77.5770),
(6,'MGD','MG Road','Central Bengaluru',12.9756,77.6066),
(7,'BTM','BTM Layout','BTM',12.9166,77.6101),
(8,'WFD','Whitefield','Whitefield',12.9698,77.7500);

INSERT IGNORE INTO buses (id,bus_number,capacity,bus_type,status) VALUES
(1,'KA-01-1001',50,'AC','ACTIVE'),
(2,'KA-01-1002',45,'Standard','ACTIVE'),
(3,'KA-01-1003',55,'Electric','ACTIVE'),
(4,'KA-01-1004',40,'Standard','ACTIVE');

INSERT IGNORE INTO routes
(id,route_code,route_name,start_stop_id,end_stop_id,bus_id,duration_minutes,distance_km,transfers,base_fare,active)
VALUES
(1,'R-MTH-SBR','Marathahalli to Silk Board',1,2,1,38,11.5,0,25,TRUE),
(2,'R-MTH-SAR','Marathahalli to Sarjapura',1,4,2,42,13.2,0,25,TRUE),
(3,'R-SBR-HOS','Silk Board to Hosa Road',2,3,3,24,8.1,0,20,TRUE),
(4,'R-MTH-MGD','Marathahalli to MG Road',1,6,4,48,14.0,1,30,TRUE),
(5,'R-BTM-SAR','BTM to Sarjapura',7,4,2,35,10.4,0,20,TRUE),
(6,'R-WFD-MTH','Whitefield to Marathahalli',8,1,3,28,7.0,0,15,TRUE);

INSERT IGNORE INTO route_stops (route_id,stop_id,stop_order,estimated_minutes_from_start) VALUES
(1,1,1,0),(1,7,2,18),(1,2,3,38),
(2,1,1,0),(2,8,2,20),(2,4,3,42),
(3,2,1,0),(3,7,2,12),(3,3,3,24),
(4,1,1,0),(4,6,2,48),
(5,7,1,0),(5,4,2,35),
(6,8,1,0),(6,1,2,28);

INSERT IGNORE INTO schedules (route_id,departure_time,frequency_minutes,operating_days) VALUES
(1,'06:00:00',15,'MON-SUN'),(2,'06:15:00',20,'MON-SUN'),
(3,'06:30:00',12,'MON-SUN'),(4,'06:00:00',25,'MON-SAT'),
(5,'06:20:00',20,'MON-SUN'),(6,'06:10:00',15,'MON-SUN');

INSERT IGNORE INTO crowding_summary (route_id,crowd_percent,observed_at,source) VALUES
(1,88,NOW(),'SEED'),(2,34,NOW(),'SEED'),(3,52,NOW(),'SEED'),
(4,71,NOW(),'SEED'),(5,28,NOW(),'SEED'),(6,43,NOW(),'SEED');
