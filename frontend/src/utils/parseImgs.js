export const parseImgs = (image) => {
  let parsedImages = [];
  try {
    parsedImages = JSON.parse(image);
  } catch (error) {
    parsedImages = [image];
  }

  const mainImage = parsedImages[0];
  const imageUrl = `http://localhost:3000/uploads/${mainImage}`;

  return imageUrl;
};
