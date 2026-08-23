// Private exact-pickup columns on vehicles. Never include these in public
// vehicle/rental JSON. Owners receive them only via /vehicles/myVehicles
// and authenticated create/update responses for their own cars.
const PRIVATE_PICKUP_FIELDS = [
  "exactPickupAddress",
  "pickupLatitude",
  "pickupLongitude",
  "pickupInstructions",
  "googlePlaceId",
];

function omitPrivatePickupFields(vehicle) {
  if (!vehicle || typeof vehicle !== "object") return vehicle;
  const sanitized = { ...vehicle };
  for (const field of PRIVATE_PICKUP_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}

module.exports = {
  omitPrivatePickupFields,
};
