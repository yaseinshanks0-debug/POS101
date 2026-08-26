import { z } from 'zod';
import { Result } from '../../core/domain/Result';
import { InMemoryRepository } from '../../core/infrastructure/Repository';
import { UserTokenPayload, SecurityContext } from '../../core/infrastructure/SecurityContext';
import { AuditService } from '../../core/infrastructure/AuditAndIdempotency';
import {
  StoreEntity,
  WarehouseEntity,
  CategoryEntity,
  ProductEntity,
  ProductVariantEntity,
  SupplierEntity,
  CustomerEntity,
} from './CatalogDomain';

// DTO Schemas
export const CreateStoreDto = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(255),
  city: z.string().optional(),
  countryCode: z.string().length(2).default('US').optional(),
  phone: z.string().optional(),
});

export const CreateProductDto = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['STANDARD', 'MATRIX_PARENT', 'COMBO_BUNDLE', 'SERVICE']).default('STANDARD'),
  isTaxable: z.boolean().default(true),
  variants: z.array(z.object({
    sku: z.string().min(2).max(64),
    variantName: z.string().min(1),
    costPrice: z.number().nonnegative(),
    retailPrice: z.number().nonnegative(),
    minPrice: z.number().nonnegative().optional(),
    reorderPoint: z.number().nonnegative().default(5).optional(),
    reorderQuantity: z.number().nonnegative().default(20).optional(),
    barcode: z.string().min(3),
  })).min(1),
});

export const CreateCustomerDto = z.object({
  customerCode: z.string().min(2).max(64),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tier: z.enum(['STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'VIP']).default('STANDARD'),
  creditLimit: z.number().nonnegative().default(500),
});

export const CreateSupplierDto = z.object({
  code: z.string().min(2).max(32),
  name: z.string().min(2).max(255),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  paymentTermsDays: z.number().int().nonnegative().default(30),
});

// Repositories
export const storeRepo = new InMemoryRepository<StoreEntity>();
export const warehouseRepo = new InMemoryRepository<WarehouseEntity>();
export const categoryRepo = new InMemoryRepository<CategoryEntity>();
export const productRepo = new InMemoryRepository<ProductEntity>();
export const variantRepo = new InMemoryRepository<ProductVariantEntity>();
export const supplierRepo = new InMemoryRepository<SupplierEntity>();
export const customerRepo = new InMemoryRepository<CustomerEntity>();

// Catalog Application Service
export class CatalogService {
  // Store & Warehouse Orchestration
  public static async createStore(
    user: UserTokenPayload,
    input: z.infer<typeof CreateStoreDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'stores:create')) {
      return Result.fail('Forbidden: Missing stores:create permission');
    }

    const validated = CreateStoreDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const storeId = `str_${Date.now()}`;
    const store = new StoreEntity(storeId, {
      tenantId: user.tenantId,
      code: validated.data.code.toUpperCase(),
      name: validated.data.name,
      city: validated.data.city,
      countryCode: validated.data.countryCode,
      phone: validated.data.phone,
      isActive: true,
    });
    await storeRepo.save(user.tenantId, store);

    // Auto-create default store-front warehouse
    const whId = `wh_${Date.now()}`;
    const warehouse = new WarehouseEntity(whId, {
      tenantId: user.tenantId,
      storeId,
      code: `${store.code}-WH1`,
      name: `${store.name} Front Warehouse`,
      type: 'STORE_FRONT',
      isActive: true,
    });
    await warehouseRepo.save(user.tenantId, warehouse);

    return Result.ok({
      store: { id: store.id, code: store.code, name: store.name },
      defaultWarehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
    });
  }

  // Product & Variant Creation
  public static async createProduct(
    user: UserTokenPayload,
    input: z.infer<typeof CreateProductDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'products:create')) {
      return Result.fail('Forbidden: Missing products:create permission');
    }

    const validated = CreateProductDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;
    const prodId = `prd_${Date.now()}`;
    const product = new ProductEntity(prodId, {
      tenantId: user.tenantId,
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      type: data.type,
      isTaxable: data.isTaxable,
      isActive: true,
    });
    await productRepo.save(user.tenantId, product);

    const createdVariants: ProductVariantEntity[] = [];
    for (let i = 0; i < data.variants.length; i++) {
      const v = data.variants[i];
      const variantId = `var_${Date.now()}_${i}`;
      const variant = new ProductVariantEntity(variantId, {
        tenantId: user.tenantId,
        productId: prodId,
        sku: v.sku.toUpperCase(),
        variantName: v.variantName,
        costPrice: v.costPrice,
        retailPrice: v.retailPrice,
        minPrice: v.minPrice ?? v.retailPrice * 0.7,
        reorderPoint: v.reorderPoint,
        reorderQuantity: v.reorderQuantity,
        barcode: v.barcode,
        isActive: true,
      });
      await variantRepo.save(user.tenantId, variant);
      createdVariants.push(variant);
    }

    await AuditService.record({
      tenantId: user.tenantId,
      userId: user.userId,
      action: 'PRODUCT_CREATED',
      tableName: 'products',
      recordId: product.id,
      newValues: { code: product.code, variantsCount: createdVariants.length },
    });

    return Result.ok({
      product: { id: product.id, code: product.code, name: product.name, type: product.type },
      variants: createdVariants.map(v => ({
        id: v.id,
        sku: v.sku,
        variantName: v.variantName,
        retailPrice: v.retailPrice,
        barcode: v.barcode,
      })),
    });
  }

  // Customer Management
  public static async createCustomer(
    user: UserTokenPayload,
    input: z.infer<typeof CreateCustomerDto>
  ): Promise<Result<any>> {
    if (!SecurityContext.hasPermission(user, 'customers:create')) {
      return Result.fail('Forbidden: Missing customers:create permission');
    }

    const validated = CreateCustomerDto.safeParse(input);
    if (!validated.success) return Result.fail(JSON.stringify(validated.error.format()));

    const data = validated.data;
    const custId = `cst_${Date.now()}`;
    const customer = new CustomerEntity(custId, {
      tenantId: user.tenantId,
      customerCode: data.customerCode.toUpperCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      tier: data.tier,
      creditLimit: data.creditLimit,
      currentCreditBalance: 0,
      loyaltyPointsBalance: 0,
      isActive: true,
    });

    await customerRepo.save(user.tenantId, customer);

    return Result.ok({
      id: customer.id,
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      tier: customer.tier,
      creditLimit: customer.creditLimit,
      currentCreditBalance: customer.currentCreditBalance,
    });
  }

  // Barcode Lookup for POS
  public static async lookupByBarcode(
    tenantId: string,
    barcode: string
  ): Promise<Result<{ product: any; variant: any }>> {
    const variants = await variantRepo.findPaginated({ tenantId, limit: 500 });
    const variant = variants.items.find(v => v.barcode === barcode || v.sku.toUpperCase() === barcode.toUpperCase());
    if (!variant) {
      return Result.fail(`No product variant found matching barcode: ${barcode}`);
    }

    const product = await productRepo.findById(tenantId, variant.productId);
    return Result.ok({
      product: product ? { id: product.id, name: product.name, code: product.code } : null,
      variant: {
        id: variant.id,
        sku: variant.sku,
        variantName: variant.variantName,
        retailPrice: variant.retailPrice,
        costPrice: variant.costPrice,
        barcode: variant.barcode,
      },
    });
  }
}
