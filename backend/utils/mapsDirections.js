/** Shared backend utility for maps directions operations.
 * Normalizes, validates, or transforms values for the surrounding domain. */
/**
 * Google Maps directions URL from snapshot coordinates only.
 * Never built from public city or live vehicle rows after payment.
 */
/** Builds maps directions url.
 * Accepts latitude and longitude; returns the derived value. */
function buildMapsDirectionsUrl(latitude, longitude) {
  if (
    latitude == null ||
    longitude == null ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(`${lat},${lng}`)}` +
    `&travelmode=driving`
  );
}

module.exports = {
  buildMapsDirectionsUrl,
};
