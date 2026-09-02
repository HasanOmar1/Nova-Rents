// Converts stored upload filenames into safe vehicle and complaint image URLs.
// It validates serialized image data and supports returning one or every URL.
const imgPath = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

const baseUrl = (imgPath || "").replace(/\/$/, "");

// Parses image data and rejects unsafe or malformed upload filenames.
// Accepts a string, JSON string, or array and returns validated filename strings.
const parseImageFilenames = (image) => {
  if (!image) return [];

  let parsedImages = image;

  if (typeof image === "string") {
    try {
      parsedImages = JSON.parse(image);
    } catch {
      parsedImages = image;
    }
  }

  return (Array.isArray(parsedImages)
    ? parsedImages
    : [parsedImages]
  )
    .filter(
      // Tests whether one collection entry belongs in the filtered result.
      // Accepts filename and returns a Boolean inclusion result.
      (filename) => typeof filename === "string" && filename.trim())
    .map(
      // Transforms one collection entry for the resulting list.
      // Accepts filename and returns the mapped entry.
      (filename) => {
        const value = filename.trim().replace(/^\/?uploads\//, "");

        // Upload records contain generated filenames, never remote URLs or paths.
        if (
          !value ||
          value.includes("..") ||
          !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
        ) {
          return null;
        }

        return value;
      })
    .filter(Boolean);
};

// Selects the first image result or preserves the entire result collection.
// Accepts an array and selection flag and returns one string or the array.
const firstOrAll = (values, returnAll) =>
  returnAll ? values : values[0] || "";

// Builds public vehicle-upload URLs from stored filename data.
// Accepts image data and a return-all flag and returns one URL or an array.
export const parseImgs = (image, returnAll = false) => {
  const imageUrls = parseImageFilenames(image).map(
    // Transforms one collection entry for the resulting list.
    // Accepts filename and returns the mapped entry.
    (filename) => `${baseUrl}/uploads/${encodeURIComponent(filename)}`,
  );

  return firstOrAll(imageUrls, returnAll);
};

// Builds protected complaint-evidence URLs for a validated complaint identifier.
// Accepts image data, complaint ID, and return-all flag and returns one or many URLs.
export const parseComplaintImgs = (
  image,
  complaintId,
  returnAll = false,
) => {
  const id = String(complaintId ?? "").trim();
  if (!/^[1-9]\d*$/.test(id)) return returnAll ? [] : "";

  const imageUrls = parseImageFilenames(image).map(
    // Transforms one collection entry for the resulting list.
    // Accepts filename and returns the mapped entry.
    (filename) =>
      `${baseUrl}/complaints/${id}/evidence/${encodeURIComponent(filename)}`,
  );

  return firstOrAll(imageUrls, returnAll);
};
