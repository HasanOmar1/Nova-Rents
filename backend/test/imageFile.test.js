const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const {
  ImageValidationError,
  isAllowedDeclaredImage,
  isSafePublicImagePath,
  storedExtensionForMime,
  normalizeUploadedImage,
} = require("../utils/imageFile");

const formats = [
  { extension: "jpg", mimetype: "image/jpeg", sharpFormat: "jpeg" },
  { extension: "png", mimetype: "image/png", sharpFormat: "png" },
  { extension: "webp", mimetype: "image/webp", sharpFormat: "webp" },
  { extension: "avif", mimetype: "image/avif", sharpFormat: "avif" },
];

async function createImage(format) {
  const image = sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 25, g: 100, b: 200, alpha: 1 },
    },
  });
  return image.toFormat(format).toBuffer();
}

test("accepts only supported matching filename and MIME pairs", () => {
  assert.equal(isAllowedDeclaredImage("photo.JPG", "image/jpeg"), true);
  assert.equal(isAllowedDeclaredImage("photo.jfif", "image/jpeg"), true);
  assert.equal(isAllowedDeclaredImage("photo.png", "image/png"), true);
  assert.equal(isAllowedDeclaredImage("photo.webp", "image/webp"), true);
  assert.equal(isAllowedDeclaredImage("photo.avif", "image/avif"), true);

  assert.equal(isAllowedDeclaredImage("payload.html", "image/png"), false);
  assert.equal(isAllowedDeclaredImage("photo.png", "image/jpeg"), false);
  assert.equal(isAllowedDeclaredImage("payload.svg", "image/svg+xml"), false);
  assert.equal(isAllowedDeclaredImage("photo.heic", "image/heic"), false);
});

test("normalizes stored extensions from the verified MIME type", () => {
  assert.equal(storedExtensionForMime("image/jpeg"), ".jpg");
  assert.equal(storedExtensionForMime("image/png"), ".png");
  assert.equal(storedExtensionForMime("image/webp"), ".webp");
  assert.equal(storedExtensionForMime("image/avif"), ".avif");
  assert.equal(storedExtensionForMime("image/svg+xml"), null);
});

for (const format of formats) {
  test(`fully decodes and re-encodes ${format.extension} uploads`, async () => {
    const input = await createImage(format.sharpFormat);
    const normalized = await normalizeUploadedImage({
      originalname: `photo.${format.extension}`,
      mimetype: format.mimetype,
      buffer: input,
    });
    const metadata = await sharp(normalized.buffer).metadata();

    assert.equal(normalized.mimetype, format.mimetype);
    assert.equal(normalized.extension, storedExtensionForMime(format.mimetype));
    if (format.mimetype === "image/avif") {
      assert.equal(metadata.format, "heif");
      assert.equal(metadata.compression, "av1");
    } else {
      assert.equal(metadata.format, format.sharpFormat);
    }
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
  });
}

test("rejects active content and files with forged image headers", async () => {
  const payloads = [
    {
      originalname: "payload.png",
      mimetype: "image/png",
      buffer: Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from("<script>alert(1)</script>"),
      ]),
    },
    {
      originalname: "payload.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff]),
        Buffer.from("<script>alert(1)</script>"),
      ]),
    },
    {
      originalname: "payload.webp",
      mimetype: "image/webp",
      buffer: Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.alloc(4),
        Buffer.from("WEBP<script>alert(1)</script>"),
      ]),
    },
    {
      originalname: "payload.avif",
      mimetype: "image/avif",
      buffer: Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x14]),
        Buffer.from("ftypavif"),
        Buffer.alloc(4),
        Buffer.from("avif"),
      ]),
    },
  ];

  for (const payload of payloads) {
    await assert.rejects(
      normalizeUploadedImage(payload),
      ImageValidationError,
    );
  }
});

test("removes appended active content by re-encoding valid images", async () => {
  const script = Buffer.from("<script>alert(1)</script>");
  const jpegPolyglot = Buffer.concat([await createImage("jpeg"), script]);
  const normalized = await normalizeUploadedImage({
    originalname: "photo.jpg",
    mimetype: "image/jpeg",
    buffer: jpegPolyglot,
  });

  assert.equal(normalized.buffer.includes(script), false);
  assert.equal((await sharp(normalized.buffer).metadata()).format, "jpeg");
});

test("auto-orients images and strips uploaded metadata", async () => {
  const input = await sharp({
    create: {
      width: 2,
      height: 3,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  assert.ok((await sharp(input).metadata()).exif);

  const normalized = await normalizeUploadedImage({
    originalname: "photo.jpg",
    mimetype: "image/jpeg",
    buffer: input,
  });
  const metadata = await sharp(normalized.buffer).metadata();

  assert.equal(metadata.width, 3);
  assert.equal(metadata.height, 2);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
});

test("rejects valid image bytes when the declaration does not match", async () => {
  const jpeg = await createImage("jpeg");
  await assert.rejects(
    normalizeUploadedImage({
      originalname: "photo.png",
      mimetype: "image/png",
      buffer: jpeg,
    }),
    /does not match/,
  );
});

test("serves only safe raster extensions from the legacy public directory", () => {
  assert.equal(isSafePublicImagePath("vehicle.jpeg"), true);
  assert.equal(isSafePublicImagePath("vehicle.jfif"), true);
  assert.equal(isSafePublicImagePath("payload.svg"), false);
  assert.equal(isSafePublicImagePath("payload.html"), false);
  assert.equal(isSafePublicImagePath("photo.heic"), false);
});
