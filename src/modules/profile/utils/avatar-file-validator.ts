import {
    assertValidImageBuffer,
    DetectedFileType,
} from 'src/common/utils/file-upload/image-file-validator';
import { ALLOWED_AVATAR_MIME_TYPES } from '../constants/avatar.constant';

export async function assertValidAvatarBuffer(
    buffer: Buffer,
): Promise<DetectedFileType> {
    return assertValidImageBuffer(buffer, ALLOWED_AVATAR_MIME_TYPES);
}
