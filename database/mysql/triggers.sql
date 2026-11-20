
USE transit_db;

DROP TRIGGER IF EXISTS crowding_insert_audit;

DELIMITER //

CREATE TRIGGER crowding_insert_audit
AFTER INSERT ON crowding_summary
FOR EACH ROW
BEGIN
    INSERT INTO crowding_audit
    (route_id, crowd_percent, observed_at, source)
    VALUES
    (
        NEW.route_id,
        NEW.crowd_percent,
        NEW.observed_at,
        NEW.source
    );
END 
//DELIMITER ;
