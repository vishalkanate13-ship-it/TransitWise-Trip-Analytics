
const transitDB = db.getSiblingDB("transitwise");

// 1. Average crowding by route
print("Average crowding by route:");

transitDB.crowding_observations.aggregate([
    {
        $group: {
            _id: "$route_code",
            average_crowding: { $avg: "$crowd_percent" },
            total_observations: { $sum: 1 }
        }
    },
    {
        $sort: { average_crowding: 1 }
    }
]).forEach(printjson);


// 2. Find highly crowded routes
print("Highly crowded routes:");

transitDB.crowding_observations.aggregate([
    {
        $match: {
            crowd_percent: { $gte: 70 }
        }
    },
    {
        $project: {
            _id: 0,
            route_code: 1,
            crowd_percent: 1,
            location: 1
        }
    }
]).forEach(printjson);


// 3. Count events by type
print("Transport events by type:");

transitDB.transport_events.aggregate([
    {
        $group: {
            _id: "$event_type",
            total_events: { $sum: 1 }
        }
    },
    {
        $sort: { total_events: -1 }
    }
]).forEach(printjson);
