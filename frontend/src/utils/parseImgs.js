const imgPath = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

export const parseImgs = (image, returnAll = false) => {
  if (!image) return returnAll ? [] : "";

  let parsedImages = image;

  if (typeof image === "string") {
    try {
      parsedImages = JSON.parse(image);
    } catch {
      parsedImages = image;
    }
  }

  const filenames = (Array.isArray(parsedImages)
    ? parsedImages
    : [parsedImages]
  ).filter((filename) => typeof filename === "string" && filename.trim());

  const baseUrl = (imgPath || "").replace(/\/$/, "");
  const imageUrls = filenames
    .map((filename) => {
      const value = filename.trim().replace(/^\/?uploads\//, "");

      // Upload records contain generated filenames, never remote URLs or paths.
      if (
        !value ||
        value.includes("..") ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
      ) {
        return null;
      }

      return `${baseUrl}/uploads/${value}`;
    })
    .filter(Boolean);

  // if returnAll is true, return an array of all full image URLs
  if (returnAll) {
    return imageUrls;
  }

  // if returnAll is false then Just return the very first image as a string
  return imageUrls[0] || "";
};
