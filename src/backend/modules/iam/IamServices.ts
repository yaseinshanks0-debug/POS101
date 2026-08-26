import { z } from 'zod';
import { Result } from '../../core/domain/Result';
import { SecurityContext, UserTokenPayload, AuthTokens } from '../../core/infrastructure/SecurityContext';
import { InMemoryRepository } from '../../core/infrastructure/Repository';
import { AuditService } from '../../core/infrastructure/AuditAndIdempotency';
import { TenantEntity, UserEntity, RoleEntity, PermissionEntity } from './IamDomain';

// Validation Schemas
export const RegisterTenantDto = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(255),
  currencyCode: z.string().length(3).default('USD'),
  timezone: z.string().default('UTC'),
  adminUsername: z.string().min(3).max(64),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
});

export const LoginDto = z.object({
  tenantCode: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1),
});

export const CreateUserDto = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roles: z.array(z.string()).default(['CASHIER']),
  permissions: z.array(z.string()).default([]),
});

// Repositories (Singleton instances for runtime dependency injection)
export const tenantRepo = new InMemoryRepository<TenantEntity>();
export const userRepo = new InMemoryRepository<UserEntity>();
export const roleRepo = new InMemoryRepository<RoleEntity>();
export const permissionRepo = new InMemoryRepository<PermissionEntity>();

// IAM Application Service (CQRS orchestrator)
export class IamService {
  // Command: Register Tenant with bootstrap Super Admin
  public static async registerTenant(input: z.infer<typeof RegisterTenantDto>): Promise<Result<{ tenant: any; adminUser: any }>> {
    const validated = RegisterTenantDto.safeParse(input);
    if (!validated.success) {
      return Result.fail(`Validation error: ${JSON.stringify(validated.error.format())}`);
    }

    const data = validated.data;
    const tenantId = `ten_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    const tenant = new TenantEntity(tenantId, {
      code: data.code.toUpperCase(),
      name: data.name,
      currencyCode: data.currencyCode.toUpperCase(),
      timezone: data.timezone,
      status: 'ACTIVE',
    });
    await tenantRepo.save('system', tenant);

    const passwordHash = await SecurityContext.hashPassword(data.adminPassword);
    const adminUser = new UserEntity(userId, {
      tenantId,
      username: data.adminUsername,
      email: data.adminEmail,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
      passwordHash,
      isActive: true,
      roles: ['TENANT_ADMIN'],
      permissions: ['*'],
    });
    await userRepo.save(tenantId, adminUser);

    await AuditService.record({
      tenantId,
      userId,
      action: 'TENANT_REGISTERED',
      tableName: 'tenants',
      recordId: tenantId,
      newValues: { tenantCode: data.code, adminUsername: data.adminUsername },
    });

    return Result.ok({
      tenant: { id: tenant.id, code: tenant.code, name: tenant.name, status: tenant.status },
      adminUser: { id: adminUser.id, username: adminUser.username, email: adminUser.email, roles: adminUser.roles },
    });
  }

  // Command: Login & Token Generation
  public static async login(input: z.infer<typeof LoginDto>): Promise<Result<{ tokens: AuthTokens; user: any }>> {
    const validated = LoginDto.safeParse(input);
    if (!validated.success) {
      return Result.fail(`Invalid login payload: ${JSON.stringify(validated.error.format())}`);
    }

    const { tenantCode, username, password } = validated.data;

    // Find Tenant
    const tenants = await tenantRepo.findPaginated({ tenantId: 'system', limit: 100 });
    const tenant = tenants.items.find(t => t.code.toUpperCase() === tenantCode.toUpperCase() && t.status === 'ACTIVE');
    if (!tenant) {
      return Result.fail('Invalid tenant or tenant suspended');
    }

    // Find User
    const users = await userRepo.findPaginated({ tenantId: tenant.id, limit: 100 });
    const user = users.items.find(u => u.username.toLowerCase() === username.toLowerCase() && u.isActive);
    if (!user) {
      return Result.fail('Invalid credentials');
    }

    const isMatch = await SecurityContext.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return Result.fail('Invalid credentials');
    }

    user.recordLogin();
    await userRepo.save(tenant.id, user);

    const tokenPayload: UserTokenPayload = {
      userId: user.id,
      tenantId: tenant.id,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      tokenVersion: 1,
    };

    const tokens = SecurityContext.generateTokens(tokenPayload);

    await AuditService.record({
      tenantId: tenant.id,
      userId: user.id,
      action: 'USER_LOGIN',
      tableName: 'users',
      recordId: user.id,
    });

    return Result.ok({
      tokens,
      user: {
        id: user.id,
        tenantId: tenant.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  }

  // Command: Refresh Token Rotation
  public static async rotateTokens(input: z.infer<typeof RefreshTokenDto>): Promise<Result<AuthTokens>> {
    try {
      const decoded = SecurityContext.verifyRefreshToken(input.refreshToken);
      const user = await userRepo.findById(decoded.tenantId, decoded.userId);
      if (!user || !user.isActive) {
        return Result.fail('User inactive or deleted');
      }

      // Invalidate old token and issue new pair
      SecurityContext.revokeToken(input.refreshToken);

      const tokens = SecurityContext.generateTokens({
        userId: user.id,
        tenantId: user.tenantId,
        username: user.username,
        roles: user.roles,
        permissions: user.permissions,
        tokenVersion: decoded.tokenVersion,
      });

      return Result.ok(tokens);
    } catch (err: any) {
      return Result.fail(`Token rotation failed: ${err.message}`);
    }
  }

  // Command: Create User (RBAC Protected)
  public static async createUser(
    requester: UserTokenPayload,
    input: z.infer<typeof CreateUserDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(requester, 'users:create')) {
      return Result.fail('Forbidden: Insufficient permissions to create users');
    }

    const validated = CreateUserDto.safeParse(input);
    if (!validated.success) {
      return Result.fail(`Validation failed: ${JSON.stringify(validated.error.format())}`);
    }

    const data = validated.data;
    const passwordHash = await SecurityContext.hashPassword(data.password);
    const userId = `usr_${Date.now()}`;

    const newUser = new UserEntity(userId, {
      tenantId: requester.tenantId,
      username: data.username,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
      isActive: true,
      roles: data.roles,
      permissions: data.permissions,
    });

    await userRepo.save(requester.tenantId, newUser);

    await AuditService.record({
      tenantId: requester.tenantId,
      userId: requester.userId,
      action: 'USER_CREATED',
      tableName: 'users',
      recordId: newUser.id,
      newValues: { username: data.username, roles: data.roles },
    });

    return Result.ok({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      roles: newUser.roles,
      isActive: newUser.isActive,
    });
  }

  // Query: Get Users Paginated
  public static async getUsers(requester: UserTokenPayload, page = 1, limit = 20): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(requester, 'users:read')) {
      return Result.fail('Forbidden: Insufficient permissions to view users');
    }

    const result = await userRepo.findPaginated({
      tenantId: requester.tenantId,
      page,
      limit,
    });

    const sanitized = result.items.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      roles: u.roles,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return Result.ok({
      ...result,
      items: sanitized,
    });
  }
}
