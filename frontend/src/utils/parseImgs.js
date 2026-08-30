const imgPath = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

const baseUrl = (imgPath || "").replace(/\/$/, "");

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
    .filter((filename) => typeof filename === "string" && filename.trim())
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

      return value;
    })
    .filter(Boolean);
};

const firstOrAll = (values, returnAll) =>
  returnAll ? values : values[0] || "";

export const parseImgs = (image, returnAll = false) => {
  const imageUrls = parseImageFilenames(image).map(
    (filename) => `${baseUrl}/uploads/${encodeURIComponent(filename)}`,
  );

  return firstOrAll(imageUrls, returnAll);
};

export const parseComplaintImgs = (
  image,
  complaintId,
  returnAll = false,
) => {
  const id = String(complaintId ?? "").trim();
  if (!/^[1-9]\d*$/.test(id)) return returnAll ? [] : "";

  const imageUrls = parseImageFilenames(image).map(
    (filename) =>
      `${baseUrl}/complaints/${id}/evidence/${encodeURIComponent(filename)}`,
  );

  return firstOrAll(imageUrls, returnAll);
};
