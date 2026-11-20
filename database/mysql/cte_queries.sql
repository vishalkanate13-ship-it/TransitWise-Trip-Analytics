
USE transit_db;

-- CTE 1: Calculate average crowding for every route
WITH RouteCrowding AS (
    SELECT
        route_id,
        ROUND(AVG(crowd_percent), 2) AS average_crowd
    FROM crowding_summary
    WHERE observed_at >= NOW() - INTERVAL 7 DAY
    GROUP BY route_id
)
SELECT
    r.route_code,
    r.route_name,
    COALESCE(rc.average_crowd, 0) AS average_crowd
FROM routes r
LEFT JOIN RouteCrowding rc
    ON r.id = rc.route_id
ORDER BY average_crowd ASC;


-- CTE 2: Identify less crowded routes
WITH RouteCrowding AS (
    SELECT
        route_id,
        AVG(crowd_percent) AS average_crowd
    FROM crowding_summary
    WHERE observed_at >= NOW() - INTERVAL 7 DAY
    GROUP BY route_id
)
SELECT
    r.route_code,
    r.route_name,
    ROUND(rc.average_crowd, 2) AS average_crowd
FROM routes r
JOIN RouteCrowding rc
    ON r.id = rc.route_id
WHERE rc.average_crowd < 50
ORDER BY rc.average_crowd ASC;
