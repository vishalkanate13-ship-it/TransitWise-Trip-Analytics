
USE transit_db;

DROP FUNCTION IF EXISTS GetAverageCrowding;

DELIMITER //

CREATE FUNCTION GetAverageCrowding(p_route_id INT)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
    DECLARE avg_crowd DECIMAL(5,2);

    SELECT COALESCE(AVG(crowd_percent), 0)
    INTO avg_crowd
    FROM crowding_summary
    WHERE route_id = p_route_id
      AND observed_at >= NOW() - INTERVAL 7 DAY;

    RETURN avg_crowd;
END //

DELIMITER ;
