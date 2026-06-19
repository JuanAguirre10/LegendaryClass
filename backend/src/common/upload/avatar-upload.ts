import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const AVATARS_DIR = join(UPLOADS_ROOT, 'avatars');

// Crea la carpeta al cargar el módulo (idempotente).
if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true });

export const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function extFromMime(mime: string): string | null {
  return MIME_EXT[mime] ?? null;
}

export function generateAvatarFilename(mime: string): string {
  return `${randomUUID()}${extFromMime(mime) ?? ''}`;
}

export function imageFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_AVATAR_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Tipo de archivo no permitido (solo JPG, PNG, WEBP)'), false);
  }
}

// Mapea la ruta pública /uploads/avatars/<archivo> al path en disco.
// Devuelve null si no es un upload local o si el nombre intenta escapar del directorio.
export function localAvatarDiskPath(avatarUrl: string | null): string | null {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return null;
  const name = avatarUrl.slice('/uploads/avatars/'.length);
  if (name !== basename(name)) return null; // evita traversal (../)
  return join(AVATARS_DIR, name);
}

export const multerAvatarOptions = {
  storage: diskStorage({
    destination: AVATARS_DIR,
    filename: (_req: unknown, file: { mimetype: string }, cb: (e: Error | null, name: string) => void) =>
      cb(null, generateAvatarFilename(file.mimetype)),
  }),
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
};
