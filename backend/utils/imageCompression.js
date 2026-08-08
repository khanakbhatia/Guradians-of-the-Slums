/**
 * utils/imageCompression.js
 * Compresses an uploaded image buffer before it goes to Cloudinary:
 * downscales to a max width, re-encodes as JPEG at a given quality, and
 * strips EXIF metadata.
 *
 * Two reasons this runs server-side rather than trusting the client:
 * 1. Uploads from phones on poor connectivity — a smaller upload is the
 *    difference between success and a timeout on a bad connection.
 * 2. Stripping EXIF removes embedded precise GPS coordinates and device
 *    info from the image file itself — a report's explicit `location`
 *    field is the intentional, user-aware geotag; EXIF GPS is not.
 *
 * Two named profiles, not one-size-fits-all:
 * - CITIZEN_PROFILE: aggressive compression — these are evidence photos
 *   and chat attachments, viewed at small/medium size, where upload
 *   speed on a bad connection matters more than fine detail.
 * - SATELLITE_PROFILE: much lighter compression — this imagery is
 *   analyzed (by a future CV pipeline), not just displayed; downscaling
 *   it as aggressively as a phone photo would destroy the detail the
 *   analysis needs. Still resized and re-encoded (uncapped raw satellite
 *   tiles can be enormous), just far more conservatively.
 */

const sharp = require('sharp');

const CITIZEN_PROFILE = { maxWidthPx: 1600, quality: 72 };
const SATELLITE_PROFILE = { maxWidthPx: 4096, quality: 88 };

/**
 * @param {Buffer} buffer - raw file bytes (from multer memoryStorage)
 * @param {{ maxWidthPx?: number, quality?: number }} [profile] - defaults to CITIZEN_PROFILE for backward compatibility with existing callers
 * @returns {Promise<{ buffer: Buffer, mimeType: string, width: number, height: number }>}
 */
const compressImage = async (buffer, profile = CITIZEN_PROFILE) => {
  const { maxWidthPx, quality } = profile;

  const pipeline = sharp(buffer)
    .rotate() // apply EXIF orientation before it gets stripped, so the image doesn't end up sideways
    .resize({ width: maxWidthPx, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true }); // re-encoding to jpeg (no withMetadata()) drops EXIF, including GPS

  const compressed = await pipeline.toBuffer();
  const { width, height } = await sharp(compressed).metadata();

  return { buffer: compressed, mimeType: 'image/jpeg', width, height };
};

module.exports = { compressImage, CITIZEN_PROFILE, SATELLITE_PROFILE };
