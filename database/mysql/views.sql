
USE transit_db;

CREATE OR REPLACE VIEW route_crowding_overview AS
SELECT
    r.id AS route_id,
    r.route_code,
    r.route_name,
    s1.stop_name AS source_name,
    s2.stop_name AS destination_name,
    r.duration_minutes,
    r.distance_km,
    r.transfers,
    COALESCE(c.average_crowd, 0) AS average_crowd
FROM routes r
JOIN stops s1 ON r.start_stop_id = s1.id
JOIN stops s2 ON r.end_stop_id = s2.id
LEFT JOIN (
    SELECT
        route_id,
        ROUND(AVG(crowd_percent), 2) AS average_crowd
    FROM crowding_summary
    WHERE observed_at >= NOW() - INTERVAL 7 DAY
    GROUP BY route_id
) c ON r.id = c.route_id;
