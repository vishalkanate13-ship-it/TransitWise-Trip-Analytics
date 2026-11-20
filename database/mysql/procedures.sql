
USE transit_db;

DROP PROCEDURE IF EXISTS GetRoutePopularity;

DELIMITER //

CREATE PROCEDURE GetRoutePopularity()
BEGIN
    SELECT
        r.route_code,
        r.route_name,
        COALESCE(t.trip_count, 0) AS trip_count,
        COALESCE(c.average_crowd, 0) AS average_crowd
    FROM routes r
    LEFT JOIN (
        SELECT route_id, COUNT(*) AS trip_count
        FROM passenger_trips
        GROUP BY route_id
    ) t ON r.id = t.route_id
    LEFT JOIN (
        SELECT route_id, ROUND(AVG(crowd_percent), 1) AS average_crowd
        FROM crowding_summary
        WHERE observed_at >= NOW() - INTERVAL 7 DAY
        GROUP BY route_id
    ) c ON r.id = c.route_id
    ORDER BY trip_count DESC;
END //

DELIMITER ;
