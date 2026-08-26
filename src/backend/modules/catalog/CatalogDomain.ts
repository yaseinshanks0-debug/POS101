import { AggregateRoot, Entity } from '../../core/domain/Entity';
import { Result } from '../../core/domain/Result';

// ============================================================================
// 1. STORE & WAREHOUSE DOMAIN
// ============================================================================
export interface StoreProps {
  tenantId: string;
  code: string;
  name: string;
  city?: string;
  countryCode: string;
  phone?: string;
  isActive: boolean;
}

export class StoreEntity extends AggregateRoot<StoreProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get isActive(): boolean { return this.props.isActive; }

  public updateInfo(name: string, city?: string, phone?: string): void {
    this.props.name = name;
    if (city !== undefined) this.props.city = city;
    if (phone !== undefined) this.props.phone = phone;
    this.touch();
  }
}

export interface WarehouseProps {
  tenantId: string;
  storeId?: string;
  code: string;
  name: string;
  type: 'STORE_FRONT' | 'STORE_BACKROOM' | 'CENTRAL_DC' | 'TRANSIT' | 'QUARANTINE';
  isActive: boolean;
}

export class WarehouseEntity extends AggregateRoot<WarehouseProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get type(): string { return this.props.type; }
  get storeId(): string | undefined { return this.props.storeId; }
}

// ============================================================================
// 2. CATEGORY DOMAIN
// ============================================================================
export interface CategoryProps {
  tenantId: string;
  parentId?: string;
  code: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export class CategoryEntity extends AggregateRoot<CategoryProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get parentId(): string | undefined { return this.props.parentId; }
}

// ============================================================================
// 3. PRODUCT & VARIANT DOMAIN
// ============================================================================
export interface ProductProps {
  tenantId: string;
  categoryId?: string;
  code: string;
  name: string;
  description?: string;
  type: 'STANDARD' | 'MATRIX_PARENT' | 'COMBO_BUNDLE' | 'SERVICE';
  isTaxable: boolean;
  isActive: boolean;
}

export class ProductEntity extends AggregateRoot<ProductProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get categoryId(): string | undefined { return this.props.categoryId; }
  get isTaxable(): boolean { return this.props.isTaxable; }
  get isActive(): boolean { return this.props.isActive; }
  get type(): string { return this.props.type; }

  public updateDetails(name: string, description?: string, categoryId?: string): void {
    this.props.name = name;
    if (description !== undefined) this.props.description = description;
    if (categoryId !== undefined) this.props.categoryId = categoryId;
    this.touch();
  }
}

export interface ProductVariantProps {
  tenantId: string;
  productId: string;
  sku: string;
  variantName: string;
  costPrice: number;
  retailPrice: number;
  minPrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  barcode: string;
  isActive: boolean;
}

export class ProductVariantEntity extends AggregateRoot<ProductVariantProps> {
  get productId(): string { return this.props.productId; }
  get sku(): string { return this.props.sku; }
  get variantName(): string { return this.props.variantName; }
  get costPrice(): number { return this.props.costPrice; }
  get retailPrice(): number { return this.props.retailPrice; }
  get barcode(): string { return this.props.barcode; }

  public updatePricing(retailPrice: number, costPrice: number, minPrice?: number): void {
    if (retailPrice < 0 || costPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    if (minPrice !== undefined && minPrice > retailPrice) {
      throw new Error('Minimum price cannot exceed retail price');
    }
    this.props.retailPrice = retailPrice;
    this.props.costPrice = costPrice;
    if (minPrice !== undefined) this.props.minPrice = minPrice;
    this.touch();
  }
}

// ============================================================================
// 4. SUPPLIER & CUSTOMER DOMAIN
// ============================================================================
export interface SupplierProps {
  tenantId: string;
  code: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  paymentTermsDays: number;
  taxNumber?: string;
  isActive: boolean;
}

export class SupplierEntity extends AggregateRoot<SupplierProps> {
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get paymentTermsDays(): number { return this.props.paymentTermsDays; }
}

export interface CustomerProps {
  tenantId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';
  creditLimit: number;
  currentCreditBalance: number;
  loyaltyPointsBalance: number;
  isActive: boolean;
}

export class CustomerEntity extends AggregateRoot<CustomerProps> {
  get customerCode(): string { return this.props.customerCode; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`.trim(); }
  get tier(): string { return this.props.tier; }
  get creditLimit(): number { return this.props.creditLimit; }
  get currentCreditBalance(): number { return this.props.currentCreditBalance; }
  get loyaltyPointsBalance(): number { return this.props.loyaltyPointsBalance; }

  public addLoyaltyPoints(points: number): void {
    if (points < 0 && Math.abs(points) > this.props.loyaltyPointsBalance) {
      throw new Error('Insufficient loyalty points balance to deduct');
    }
    this.props.loyaltyPointsBalance += points;
    this.touch();
  }

  public chargeStoreCredit(amount: number): void {
    if (amount <= 0) throw new Error('Charge amount must be positive');
    const newBalance = this.props.currentCreditBalance + amount;
    if (newBalance > this.props.creditLimit) {
      throw new Error(`Charge exceeds customer credit limit ($${this.props.creditLimit})`);
    }
    this.props.currentCreditBalance = newBalance;
    this.touch();
  }

  public payStoreCredit(amount: number): void {
    if (amount <= 0) throw new Error('Payment amount must be positive');
    this.props.currentCreditBalance = Math.max(0, this.props.currentCreditBalance - amount);
    this.touch();
  }
}
