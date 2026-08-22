import {
    assertValidImageBuffer,
    DetectedFileType,
} from 'src/common/utils/file-upload/image-file-validator';
import { ALLOWED_ADDRESS_PHOTO_MIME_TYPES } from '../constants/address-photo.constant';

export async function assertValidAddressPhotoBuffer(
    buffer: Buffer,
): Promise<DetectedFileType> {
    return assertValidImageBuffer(buffer, ALLOWED_ADDRESS_PHOTO_MIME_TYPES);
}
