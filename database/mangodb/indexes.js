
const transitDB = db.getSiblingDB("transitwise");

// Index for route-wise crowding history
transitDB.crowding_observations.createIndex(
    { route_id: 1, observed_at: -1 }
);

// Index for route code searches
transitDB.crowding_observations.createIndex(
    { route_code: 1 }
);

// Index for transport event searches
transitDB.transport_events.createIndex(
    { event_type: 1, created_at: -1 }
);

print("TransitWise MongoDB indexes created.");
