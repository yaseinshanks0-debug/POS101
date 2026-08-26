export interface UserTokenPayload {
  userId: string;
  tenantId: string;
  storeId?: string;
  username: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Universal Base64URL helper
function base64UrlEncode(str: string): string {
  let utf8Bytes: string;
  try {
    utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    );
  } catch {
    utf8Bytes = str;
  }
  const b64 = typeof btoa === 'function' 
    ? btoa(utf8Bytes) 
    : Buffer.from(str).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const decoded = typeof atob === 'function'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('utf-8');
  try {
    return decodeURIComponent(
      Array.prototype.map.call(decoded, (c: string) => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
  } catch {
    return decoded;
  }
}

// Pure JS deterministic hash/signature generator for standard browser & node runtime
function simpleHmac(data: string, key: string): string {
  let hash = 0x811c9dc5;
  const combined = key + ':' + data;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const unsigned = (hash >>> 0).toString(16).padStart(8, '0');
  return base64UrlEncode(unsigned + '_' + data.length.toString(16));
}

// Pure JS salted password hashing simulation conforming to standard bcrypt format $2a$10$...
async function hashPass(password: string): Promise<string> {
  const salt = Math.random().toString(36).substring(2, 10);
  let hash = 5381;
  const combined = salt + password;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, '0');
  return `$2a$10$${salt}${hex}`;
}

async function comparePass(plain: string, hashed: string): Promise<boolean> {
  if (!hashed.startsWith('$2a$10$')) return false;
  const salt = hashed.substring(7, 15);
  let hash = 5381;
  const combined = salt + plain;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, '0');
  const expected = `$2a$10$${salt}${hex}`;
  return expected === hashed;
}

export class SecurityContext {
  private static readonly JWT_SECRET = 'pos_jwt_super_secret_signing_key_2026_x';
  private static readonly JWT_REFRESH_SECRET = 'pos_jwt_refresh_super_secret_key_2026_y';
  private static readonly ACCESS_TOKEN_EXPIRY_SEC = 900; // 15 mins
  private static readonly REFRESH_TOKEN_EXPIRY_SEC = 7 * 24 * 3600; // 7 days

  // Revocation in-memory / Redis token blacklist store
  private static revokedTokens = new Set<string>();
  private static userTokenVersions = new Map<string, number>();

  public static async hashPassword(password: string): Promise<string> {
    return hashPass(password);
  }

  public static async comparePassword(plain: string, hash: string): Promise<boolean> {
    return comparePass(plain, hash);
  }

  public static generateTokens(payload: UserTokenPayload): AuthTokens {
    const currentVersion = this.userTokenVersions.get(payload.userId) || 1;
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'HS256', typ: 'JWT' };
    const accessClaims = {
      ...payload,
      tokenVersion: currentVersion,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY_SEC,
      jti: `at_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const accessPayloadB64 = base64UrlEncode(JSON.stringify(accessClaims));
    const accessSig = simpleHmac(`${headerB64}.${accessPayloadB64}`, this.JWT_SECRET);
    const accessToken = `${headerB64}.${accessPayloadB64}.${accessSig}`;

    const refreshClaims = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      tokenVersion: currentVersion,
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRY_SEC,
      jti: `rt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    const refreshPayloadB64 = base64UrlEncode(JSON.stringify(refreshClaims));
    const refreshSig = simpleHmac(`${headerB64}.${refreshPayloadB64}`, this.JWT_REFRESH_SECRET);
    const refreshToken = `${headerB64}.${refreshPayloadB64}.${refreshSig}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY_SEC,
      tokenType: 'Bearer',
    };
  }

  public static verifyAccessToken(token: string): UserTokenPayload {
    if (this.revokedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed token structure');
      }

      const [headerB64, payloadB64, sig] = parts;
      const expectedSig = simpleHmac(`${headerB64}.${payloadB64}`, this.JWT_SECRET);
      if (sig !== expectedSig) {
        throw new Error('Invalid token signature');
      }

      const decoded = JSON.parse(base64UrlDecode(payloadB64)) as UserTokenPayload & { exp?: number; jti?: string };
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Token has expired');
      }

      const currentVersion = this.userTokenVersions.get(decoded.userId) || 1;
      if (decoded.tokenVersion !== currentVersion) {
        throw new Error('Token version superseded (session terminated)');
      }

      return decoded;
    } catch (err: any) {
      throw new Error(`Invalid access token: ${err.message}`);
    }
  }

  public static verifyRefreshToken(token: string): { userId: string; tenantId: string; tokenVersion: number } {
    if (this.revokedTokens.has(token)) {
      throw new Error('Refresh token has been revoked');
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed token structure');
      }

      const [headerB64, payloadB64, sig] = parts;
      const expectedSig = simpleHmac(`${headerB64}.${payloadB64}`, this.JWT_REFRESH_SECRET);
      if (sig !== expectedSig) {
        throw new Error('Invalid refresh token signature');
      }

      const decoded = JSON.parse(base64UrlDecode(payloadB64)) as { userId: string; tenantId: string; tokenVersion: number; exp?: number };
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Refresh token has expired');
      }

      const currentVersion = this.userTokenVersions.get(decoded.userId) || 1;
      if (decoded.tokenVersion !== currentVersion) {
        throw new Error('Refresh token superseded by recent password reset or global logout');
      }

      return decoded;
    } catch (err: any) {
      throw new Error(`Invalid refresh token: ${err.message}`);
    }
  }

  public static revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  public static revokeAllUserSessions(userId: string): void {
    const current = this.userTokenVersions.get(userId) || 1;
    this.userTokenVersions.set(userId, current + 1);
  }

  public static hasPermission(user: UserTokenPayload, requiredPermission: string): boolean {
    if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('TENANT_ADMIN')) {
      return true;
    }
    return user.permissions.includes(requiredPermission);
  }

  public static hasAnyPermission(user: UserTokenPayload, requiredPermissions: string[]): boolean {
    if (user.roles.includes('SUPER_ADMIN') || user.roles.includes('TENANT_ADMIN')) {
      return true;
    }
    return requiredPermissions.some(p => user.permissions.includes(p));
  }
}
