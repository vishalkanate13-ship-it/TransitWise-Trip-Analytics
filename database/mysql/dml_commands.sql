USE transit_db;

-- 1. INSERT: Add a demonstration crowding record
INSERT INTO crowding_summary
(route_id, crowd_percent, observed_at, source)
VALUES
(1, 65, NOW(), 'DML_DEMO');

-- Store the newly inserted record ID
SET @dml_demo_id = LAST_INSERT_ID();


-- 2. SELECT: Display the inserted record
SELECT *
FROM crowding_summary
WHERE id = @dml_demo_id;


-- 3. UPDATE: Modify the crowd percentage
UPDATE crowding_summary
SET crowd_percent = 68
WHERE id = @dml_demo_id;


-- Verify the updated record
SELECT *
FROM crowding_summary
WHERE id = @dml_demo_id;


-- 4. Check the audit record created by the trigger
SELECT *
FROM crowding_audit
WHERE source = 'DML_DEMO'
ORDER BY id DESC
LIMIT 1;


-- 5. DELETE: Remove the demonstration record
DELETE FROM crowding_summary
WHERE id = @dml_demo_id;


-- Verify that the demonstration record was deleted
SELECT *
FROM crowding_summary
WHERE id = @dml_demo_id;