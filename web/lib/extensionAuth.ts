import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.EXTENSION_JWT_SECRET || '');

export async function verifyExtensionToken(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.userId === 'string' ? payload.userId : null;
  } catch {
    return null;
  }
}
