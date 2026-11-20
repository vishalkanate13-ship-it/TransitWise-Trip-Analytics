
// Select TransitWise database
const transitDB = db.getSiblingDB("transitwise");

// Create collections if they do not already exist
if (!transitDB.getCollectionNames().includes("crowding_observations")) {
    transitDB.createCollection("crowding_observations");
}

if (!transitDB.getCollectionNames().includes("transport_events")) {
    transitDB.createCollection("transport_events");
}

print("TransitWise MongoDB collections are ready.");
