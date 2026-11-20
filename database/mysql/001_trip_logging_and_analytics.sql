USE transit_db;

CREATE TABLE IF NOT EXISTS passenger_trips (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  passenger_id INT NOT NULL,
  route_id INT NOT NULL,
  travel_date DATE NOT NULL,
  fare_paid DECIMAL(8,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_trip_passenger FOREIGN KEY (passenger_id) REFERENCES app_users(id),
  CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES routes(id),
  INDEX idx_trip_date_route (travel_date, route_id)
);

DROP PROCEDURE IF EXISTS GetRoutePopularity;
DELIMITER //
CREATE PROCEDURE GetRoutePopularity()
BEGIN
  SELECT r.route_code, r.route_name,
         COUNT(DISTINCT t.id) AS trip_count,
         COALESCE(ROUND(AVG(c.crowd_percent), 1), 0) AS average_crowd
  FROM routes r
  LEFT JOIN passenger_trips t ON t.route_id = r.id
  LEFT JOIN crowding_summary c
    ON c.route_id = r.id
   AND c.observed_at >= NOW() - INTERVAL 7 DAY
  GROUP BY r.id, r.route_code, r.route_name
  ORDER BY trip_count DESC, r.route_code;
END//
DELIMITER ;

-- Quick validation: counts remain zero until passengers record completed journeys.
CALL GetRoutePopularity();
