/**
 * Google Maps embed. Set VITE_GOOGLE_MAPS_API_KEY in .env for Embed API (recommended).
 * Without a key, uses maps.google.com ... &output=embed (works for many demos; Google may restrict hotlinking in some cases).
 */
export function GoogleMapEmbed({ query, title = "Map", className = "" }) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const q = encodeURIComponent(query);

  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${q}&zoom=11&maptype=roadmap`
    : `https://maps.google.com/maps?q=${q}&output=embed&hl=en&z=11`;

  return (
    <iframe
      title={title}
      src={src}
      className="googleMapFrame"
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
