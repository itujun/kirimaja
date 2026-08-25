import {
    assertValidImageBuffer,
    DetectedFileType,
} from 'src/common/utils/file-upload/image-file-validator';
import { ALLOWED_COURIER_PHOTO_MIME_TYPES } from '../constants/courier-photo.constant';

export async function assertValidCourierPhotoBuffer(
    buffer: Buffer,
): Promise<DetectedFileType> {
    return assertValidImageBuffer(buffer, ALLOWED_COURIER_PHOTO_MIME_TYPES);
}
