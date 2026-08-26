import { AggregateRoot, Entity } from '../../core/domain/Entity';
import { Result } from '../../core/domain/Result';
import { SecurityContext, UserTokenPayload, AuthTokens } from '../../core/infrastructure/SecurityContext';
import { InMemoryRepository } from '../../core/infrastructure/Repository';
import { AuditService } from '../../core/infrastructure/AuditAndIdempotency';
import { z } from 'zod';

// ============================================================================
// 1. TENANTS DOMAIN
// ============================================================================
export interface TenantProps {
  code: string;
  name: string;
  taxNumber?: string;
  currencyCode: string;
  timezone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
}

export class TenantEntity extends AggregateRoot<TenantProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get currencyCode(): string { return this.props.currencyCode; }
  get timezone(): string { return this.props.timezone; }
  get status(): string { return this.props.status; }

  public updateDetails(name: string, taxNumber?: string, timezone?: string): void {
    this.props.name = name;
    if (taxNumber !== undefined) this.props.taxNumber = taxNumber;
    if (timezone !== undefined) this.props.timezone = timezone;
    this.touch();
  }

  public suspend(): void {
    this.props.status = 'SUSPENDED';
    this.touch();
  }

  public activate(): void {
    this.props.status = 'ACTIVE';
    this.touch();
  }
}

// ============================================================================
// 2. PERMISSIONS DOMAIN
// ============================================================================
export interface PermissionProps {
  key: string;
  module: string;
  description: string;
}

export class PermissionEntity extends Entity<PermissionProps> {
  get key(): string { return this.props.key; }
  get module(): string { return this.props.module; }
  get description(): string { return this.props.description; }
}

// ============================================================================
// 3. ROLES DOMAIN
// ============================================================================
export interface RoleProps {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissionKeys: string[];
}

export class RoleEntity extends AggregateRoot<RoleProps> {
  get tenantId(): string { return this.props.tenantId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get permissionKeys(): string[] { return this.props.permissionKeys; }

  public setPermissions(permissionKeys: string[]): void {
    this.props.permissionKeys = [...new Set(permissionKeys)];
    this.touch();
  }
}

// ============================================================================
// 4. USERS & AUTH DOMAIN
// ============================================================================
export interface UserProps {
  tenantId: string;
  primaryStoreId?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  pinHash?: string;
  phone?: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  lastLoginAt?: Date;
}

export class UserEntity extends AggregateRoot<UserProps> {
  get tenantId(): string { return this.props.tenantId; }
  get username(): string { return this.props.username; }
  get email(): string { return this.props.email; }
  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`.trim(); }
  get passwordHash(): string { return this.props.passwordHash; }
  get isActive(): boolean { return this.props.isActive; }
  get roles(): string[] { return this.props.roles; }
  get permissions(): string[] { return this.props.permissions; }

  public async setPassword(newPasswordPlain: string): Promise<void> {
    if (newPasswordPlain.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    this.props.passwordHash = await SecurityContext.hashPassword(newPasswordPlain);
    this.touch();
    SecurityContext.revokeAllUserSessions(this.id);
  }

  public recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.touch();
  }

  public assignRoles(roles: string[], permissions: string[]): void {
    this.props.roles = roles;
    this.props.permissions = permissions;
    this.touch();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.touch();
    SecurityContext.revokeAllUserSessions(this.id);
  }
}
