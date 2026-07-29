const imgPath = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL
  : "http://localhost:3000";

export const parseImgs = (image, returnAll = false) => {
  let parsedImages = [];
  try {
    parsedImages = JSON.parse(image);
  } catch (error) {
    parsedImages = [image];
  }

  // if returnAll is true, return an array of all full image URLs
  if (returnAll) {
    return parsedImages.map((img) => `${imgPath}/uploads/${img}`);
  }

  // if returnAll is false then Just return the very first image as a string
  const mainImage = parsedImages[0];
  const imageUrl = `${imgPath}/uploads/${mainImage}`;

  return imageUrl;
};
