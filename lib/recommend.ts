export function scoreRoute(route: {
  crowd_percent: number; duration_minutes: number; distance_km: number; transfers: number;
}) {
  // Lower score is better. Crowd is weighted most heavily for this project.
  return Math.round((route.crowd_percent * 0.55 +
    route.duration_minutes * 0.65 +
    route.distance_km * 1.2 +
    route.transfers * 12) * 10) / 10;
}
export function crowdLabel(value: number) {
  if (value < 35) return "Low";
  if (value < 70) return "Moderate";
  return "High";
}
