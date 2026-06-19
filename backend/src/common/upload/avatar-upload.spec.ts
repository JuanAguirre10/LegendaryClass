import { extFromMime, generateAvatarFilename, imageFileFilter, localAvatarDiskPath, AVATARS_DIR } from './avatar-upload';
import { join } from 'path';

describe('avatar-upload helpers', () => {
  describe('extFromMime', () => {
    it('mapea los tipos permitidos a extensión', () => {
      expect(extFromMime('image/png')).toBe('.png');
      expect(extFromMime('image/jpeg')).toBe('.jpg');
      expect(extFromMime('image/webp')).toBe('.webp');
    });
    it('devuelve null para tipos no permitidos', () => {
      expect(extFromMime('image/svg+xml')).toBeNull();
      expect(extFromMime('application/pdf')).toBeNull();
    });
  });

  describe('generateAvatarFilename', () => {
    it('genera un nombre con la extensión correcta y único', () => {
      const a = generateAvatarFilename('image/png');
      const b = generateAvatarFilename('image/png');
      expect(a.endsWith('.png')).toBe(true);
      expect(a).not.toBe(b);
    });
  });

  describe('imageFileFilter', () => {
    const call = (mimetype: string) => {
      let result: { err: any; accept?: boolean } = { err: undefined };
      imageFileFilter({} as any, { mimetype } as any, (err: any, accept?: boolean) => { result = { err, accept }; });
      return result;
    };
    it('acepta imágenes permitidas', () => {
      expect(call('image/png').accept).toBe(true);
      expect(call('image/jpeg').err).toBeNull();
    });
    it('rechaza tipos no permitidos con error', () => {
      const r = call('application/pdf');
      expect(r.accept).toBe(false);
      expect(r.err).toBeTruthy();
    });
  });

  describe('localAvatarDiskPath', () => {
    it('mapea una ruta /uploads/avatars a disco', () => {
      expect(localAvatarDiskPath('/uploads/avatars/abc.png')).toBe(join(AVATARS_DIR, 'abc.png'));
    });
    it('devuelve null para URLs externas o vacías', () => {
      expect(localAvatarDiskPath('https://x.com/a.png')).toBeNull();
      expect(localAvatarDiskPath(null)).toBeNull();
      expect(localAvatarDiskPath('/uploads/avatars/../../etc/passwd')).toBeNull();
    });
  });
});
