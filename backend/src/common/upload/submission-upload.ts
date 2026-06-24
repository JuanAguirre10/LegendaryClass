import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UPLOADS_ROOT } from './avatar-upload';

export const SUBMISSIONS_DIR = join(UPLOADS_ROOT, 'submissions');

if (!existsSync(SUBMISSIONS_DIR)) mkdirSync(SUBMISSIONS_DIR, { recursive: true });

const ALLOWED_SUBMISSION_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];

export function submissionFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_SUBMISSION_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de archivo no permitido (solo imágenes y PDF)'), false);
  }
}

export const multerSubmissionOptions = {
  storage: diskStorage({
    destination: SUBMISSIONS_DIR,
    filename: (_req: unknown, _file: unknown, cb: (e: Error | null, name: string) => void) =>
      cb(null, randomUUID()),
  }),
  fileFilter: submissionFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
};
