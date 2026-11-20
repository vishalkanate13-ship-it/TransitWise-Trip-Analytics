
USE transit_db;

-- TRANSACTION 1: Demonstrate COMMIT

START TRANSACTION;

INSERT INTO passenger_trips
(passenger_id, route_id, travel_date, fare_paid)
SELECT
    id,
    1,
    CURDATE(),
    25.00
FROM app_users
WHERE email = 'demo.passenger@transitwise.com';

COMMIT;

-- Verify committed transaction
SELECT *
FROM passenger_trips
WHERE passenger_id = (
    SELECT id
    FROM app_users
    WHERE email = 'demo.passenger@transitwise.com'
)
ORDER BY id DESC
LIMIT 1;


-- TRANSACTION 2: Demonstrate ROLLBACK

START TRANSACTION;

UPDATE crowding_summary
SET crowd_percent = 99
WHERE route_id = 1
AND source = 'SEED';

ROLLBACK;

-- Verify rollback
SELECT route_id, crowd_percent, source
FROM crowding_summary
WHERE route_id = 1
AND source = 'SEED';
