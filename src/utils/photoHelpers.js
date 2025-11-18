export const filterAndSortPhotos = (files) => {
  return files
    .filter(
      (file) =>
        !file.fieldname.toLowerCase().includes("gif") &&
        file.mimetype.startsWith("image/") &&
        !file.mimetype.includes("gif")
    )
    .map((file) => {
      const match = file.fieldname.match(/\d+/);
      const index = match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
      return { file, index };
    })
    .sort((a, b) => a.index - b.index)
    .map(({ file }) => file);
};

export const extractPhotoIndex = (fieldName) => {
  const match = fieldName.match(/\d+/);
  return match ? match[0] : "1";
};

