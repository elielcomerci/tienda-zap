-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CatalogType" AS ENUM ('COSA', 'DESARROLLO');

-- CreateEnum
CREATE TYPE "ProductModality" AS ENUM ('DIRECTO', 'CONFIGURABLE', 'CONSULTAR');

-- CreateEnum
CREATE TYPE "ConfiguratorEngine" AS ENUM ('IMPRESOS_PACKAGING', 'PRESENCIA_FISICA', 'TEXTIL', 'DIGITAL', 'CAMPANAS');

-- CreateEnum
CREATE TYPE "ConfiguratorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PackPricingMode" AS ENUM ('FIXED', 'SUM_WITH_DISCOUNT');

-- CreateEnum
CREATE TYPE "ConsultRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'QUOTED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER', 'SELLER');

-- CreateEnum
CREATE TYPE "SellerRank" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');

-- CreateEnum
CREATE TYPE "SellerProfileStatus" AS ENUM ('ACTIVE', 'RETIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SellerRankEventType" AS ENUM ('AUTOMATIC_PROMOTION', 'MANUAL_CHANGE', 'TEMPORARY_OVERRIDE', 'PENALTY');

-- CreateEnum
CREATE TYPE "SellerCommissionType" AS ENUM ('STORE', 'SPOT', 'MANUAL', 'RECURRING', 'ROYALTY', 'BONUS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SellerCommissionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SellerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "BusinessAccountStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROOF_SENT', 'IN_PRODUCTION', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProofFileType" AS ENUM ('PROOF', 'DELIVERABLE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MERCADOPAGO', 'TRANSFER', 'CASH', 'ZAP_CREDIT');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('COUPON', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CouponLandingSurface" AS ENUM ('TIENDA', 'ZAP_WEB');

-- CreateEnum
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "FinancingRateSource" AS ENUM ('INDEC_AVERAGE', 'MANUAL_OVERRIDE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ZapCreditStatus" AS ENUM ('REQUESTED', 'QUOTED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArtworkSubmissionChannel" AS ENUM ('PENDING', 'R2', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ZapCreditInstallmentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ZapCreditPaymentSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ZapCreditPaymentMethod" AS ENUM ('TRANSFER', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('ACTIVE', 'VOIDED');

-- CreateEnum
CREATE TYPE "FinishingCostType" AS ENUM ('FIXED_SETUP', 'PER_SHEET', 'PER_UNIT');

-- CreateEnum
CREATE TYPE "ProductQuoterOptionSelectionMode" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "ProductQuoterOptionConstraintType" AS ENUM ('REQUIRES', 'EXCLUDES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" TEXT,
    "phone" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "sellerId" TEXT,
    "operationalSellerId" TEXT,
    "sellerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingProvince" TEXT,
    "documentId" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "shippingProvince" TEXT,
    "businessTypeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "rank" "SellerRank" NOT NULL DEFAULT 'BRONZE',
    "maxRankAchieved" "SellerRank" NOT NULL DEFAULT 'BRONZE',
    "lifetimeNetRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "temporaryCommissionRate" DOUBLE PRECISION,
    "temporaryRateExpiresAt" TIMESTAMP(3),
    "excludeFromLeaderboards" BOOLEAN NOT NULL DEFAULT false,
    "status" "SellerProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "BusinessType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "businessTypeId" TEXT,
    "status" "BusinessAccountStatus" NOT NULL DEFAULT 'PROSPECT',
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "nextActionAt" TIMESTAMP(3),
    "assignedSellerId" TEXT,
    "operationalSellerId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessContact" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerLead" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "businessName" TEXT,
    "businessTypeId" TEXT,
    "interest" TEXT,
    "status" "SellerLeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "nextContactAt" TIMESTAMP(3),
    "convertedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerLeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerLeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site-settings',
    "siteTitle" TEXT NOT NULL DEFAULT 'ZAP Tienda - Agencia Creativa',
    "siteDescription" TEXT NOT NULL DEFAULT 'Piezas graficas, diseño y produccion para marcas que cuidan como se ven.',
    "metaKeywords" TEXT,
    "canonicalUrl" TEXT,
    "ogImageUrl" TEXT,
    "googleAnalyticsId" TEXT,
    "googleAdsId" TEXT,
    "googleTagManagerId" TEXT,
    "googleSiteVerification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Situation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Situation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Need" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Need_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceFrom" DOUBLE PRECISION,
    "catalogType" "CatalogType" NOT NULL DEFAULT 'COSA',
    "modality" "ProductModality" NOT NULL,
    "engine" "ConfiguratorEngine",
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "briefType" TEXT DEFAULT 'NONE',
    "mediaType" TEXT DEFAULT 'NONE',
    "mediaUrl" TEXT,
    "mediaTitle" TEXT,
    "mediaList" JSONB,
    "whatIs" TEXT,
    "purpose" TEXT,
    "includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "configurable" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consultationNote" TEXT,
    "creditDownPaymentPercent" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferMatrixEntry" (
    "id" TEXT NOT NULL,
    "businessTypeId" TEXT NOT NULL,
    "situationId" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferMatrixEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguratorVersion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1.0',
    "status" "ConfiguratorStatus" NOT NULL DEFAULT 'ACTIVE',
    "schema" JSONB NOT NULL,
    "compatibility" JSONB,
    "pricing" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguratorVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "businessTypeId" TEXT,
    "pricingMode" "PackPricingMode" NOT NULL DEFAULT 'SUM_WITH_DISCOUNT',
    "fixedPrice" DOUBLE PRECISION,
    "discountPercent" DOUBLE PRECISION DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackItem" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "presets" JSONB,

    CONSTRAINT "PackItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "businessTypeId" TEXT,
    "snapshot" JSONB,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "message" TEXT NOT NULL,
    "status" "ConsultRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sellerId" TEXT,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "subtotal" DOUBLE PRECISION,
    "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "couponCode" TEXT,
    "pricingSnapshot" JSONB,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentType" "PaymentType" NOT NULL,
    "paymentId" TEXT,
    "commissionAmount" DOUBLE PRECISION,
    "receiptUrl" TEXT,
    "invoiceUrl" TEXT,
    "invoiceFileName" TEXT,
    "invoiceUploadedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publicAccessTokenHash" TEXT,
    "mpPreferenceId" TEXT,
    "partnerAccountId" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingProvince" TEXT,
    "documentId" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingPostalCode" TEXT,
    "shippingProvince" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "briefType" TEXT DEFAULT 'NONE',
    "briefResponses" JSONB,
    "briefReferenceLinks" TEXT[],
    "briefReferenceFiles" JSONB,
    "designRequested" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "artworkSubmissionChannel" "ArtworkSubmissionChannel" NOT NULL DEFAULT 'PENDING',
    "fileContentType" TEXT,
    "fileObjectKey" TEXT,
    "fileOriginalName" TEXT,
    "fileSizeBytes" INTEGER,
    "fileUploadedAt" TIMESTAMP(3),
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "creditDownPaymentPercent" INTEGER NOT NULL DEFAULT 30,
    "configurationSnapshot" JSONB,
    "productName" TEXT NOT NULL DEFAULT '',
    "productSlug" TEXT NOT NULL DEFAULT '',
    "productEngine" "ConfiguratorEngine",
    "schemaVersion" TEXT,
    "packInstanceId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "indecSeriesId" TEXT NOT NULL DEFAULT '101.1_I2NG_2016_M_22',
    "manualRatePercent" DOUBLE PRECISION,
    "defaultInstallments" INTEGER NOT NULL DEFAULT 6,
    "defaultPaymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "cardInstallments" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "delinquentDownPaymentPenaltyPercent" INTEGER NOT NULL DEFAULT 10,
    "delinquentRatePenaltyPercent" DOUBLE PRECISION NOT NULL DEFAULT 8,

    CONSTRAINT "FinancingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZapCreditPlan" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ZapCreditStatus" NOT NULL DEFAULT 'REQUESTED',
    "rateSource" "FinancingRateSource" NOT NULL DEFAULT 'INDEC_AVERAGE',
    "indecAveragePercent" DOUBLE PRECISION,
    "ratePercent" DOUBLE PRECISION NOT NULL,
    "installments" INTEGER NOT NULL,
    "paymentFrequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "firstDueDate" TIMESTAMP(3),
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "downPaymentPercent" DOUBLE PRECISION NOT NULL,
    "downPaymentAmount" DOUBLE PRECISION NOT NULL,
    "financedAmount" DOUBLE PRECISION NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "totalRepayable" DOUBLE PRECISION NOT NULL,
    "totalInterest" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "quotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZapCreditPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZapCreditInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestAmount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "status" "ZapCreditInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedSubmissionId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mpPreferenceId" TEXT,

    CONSTRAINT "ZapCreditInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZapCreditPaymentSubmission" (
    "id" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "submittedByUserId" TEXT,
    "reviewedByUserId" TEXT,
    "paymentMethod" "ZapCreditPaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "amount" DOUBLE PRECISION NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "proofFileName" TEXT NOT NULL,
    "proofContentType" TEXT,
    "proofSizeBytes" INTEGER,
    "proofHash" TEXT NOT NULL,
    "duplicateOfSubmissionId" TEXT,
    "notes" TEXT,
    "reviewNotes" TEXT,
    "status" "ZapCreditPaymentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZapCreditPaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemOption" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "valueName" TEXT NOT NULL,

    CONSTRAINT "OrderItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayType" TEXT NOT NULL DEFAULT 'BUTTON',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "colorHex" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "sku" TEXT,
    "stock" INTEGER,
    "imageUrl" TEXT,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant_costs" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "rawMaterialId" TEXT,
    "providerCost" DOUBLE PRECISION NOT NULL,
    "providerCurrency" TEXT NOT NULL DEFAULT 'ARS',
    "markup" DOUBLE PRECISION,
    "sourceLabel" TEXT,
    "sourceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variant_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRelation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "relatedProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantOption" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,

    CONSTRAINT "VariantOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PartnerAccount" (
    "id" TEXT NOT NULL,
    "kiosco24BranchId" TEXT NOT NULL,
    "kiosco24BranchName" TEXT NOT NULL,
    "kiosco24AccessKey" TEXT NOT NULL,
    "kiosco24OwnerEmail" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCampaign" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ctaText" TEXT,
    "imageUrl" TEXT,
    "backgroundColor" TEXT,
    "textColor" TEXT,
    "actionType" TEXT NOT NULL,
    "actionUrl" TEXT,
    "productId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discountKind" TEXT,
    "discountValue" DOUBLE PRECISION,
    "promoType" TEXT,

    CONSTRAINT "PartnerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL DEFAULT 'COUPON',
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "campaignKind" TEXT,
    "audienceLabel" TEXT,
    "qrBaseUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "activeFrom" TIMESTAMP(3),
    "activeTo" TIMESTAMP(3),
    "discountKind" "DiscountKind" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER,
    "perUserLimit" INTEGER,
    "minOrderAmount" DOUBLE PRECISION,
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "allowedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "welcomeTitle" TEXT,
    "welcomeMessage" TEXT,
    "welcomeConditions" TEXT,
    "welcomeLogoUrl" TEXT,
    "landingSurface" "CouponLandingSurface" NOT NULL DEFAULT 'TIENDA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCoupon" (
    "code" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'AVAILABLE',
    "usesLeft" INTEGER NOT NULL DEFAULT 1,
    "recipientName" TEXT,
    "recipientBusiness" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "businessAccountId" TEXT,
    "businessContactId" TEXT,
    "batchName" TEXT,
    "qrPayload" TEXT,
    "landingSurfaceOverride" "CouponLandingSurface",
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScannedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCoupon_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "CouponScan" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referrer" TEXT,

    CONSTRAINT "CouponScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofFile" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "objectKey" TEXT,
    "type" "ProofFileType" NOT NULL DEFAULT 'PROOF',
    "note" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "installmentId" TEXT,
    "sequenceNumber" INTEGER NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "concept" TEXT,
    "paymentMethod" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'ACTIVE',
    "voidedAt" TIMESTAMP(3),
    "voidedReason" TEXT,
    "replacedByReceiptId" TEXT,
    "generatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerIncentive" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goalType" TEXT NOT NULL,
    "goalTarget" DOUBLE PRECISION NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerIncentiveProgress" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "incentiveId" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SellerIncentiveProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPayout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerRankEvent" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "fromRank" "SellerRank",
    "toRank" "SellerRank" NOT NULL,
    "eventType" "SellerRankEventType" NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerRankEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerCommissionLedger" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "clientId" TEXT,
    "orderId" TEXT,
    "recurringId" TEXT,
    "payoutId" TEXT,
    "period" TEXT,
    "type" "SellerCommissionType" NOT NULL,
    "status" "SellerCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rank" "SellerRank",
    "notes" TEXT,
    "availableAt" TIMESTAMP(3),
    "paidOutAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerCommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerRecurringSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "portfolioSellerId" TEXT NOT NULL,
    "operationalSellerId" TEXT,
    "name" TEXT NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "status" "RecurringSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerRecurringSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'PLIEGO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_material_tiers" (
    "id" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_material_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finishing_operations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costType" "FinishingCostType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finishing_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finishing_tiers" (
    "id" TEXT NOT NULL,
    "finishingId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finishing_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quote_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "pricingFingerprint" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CALCULATED',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "materialCost" DOUBLE PRECISION,
    "printingCost" DOUBLE PRECISION,
    "processCost" DOUBLE PRECISION,
    "finishingCost" DOUBLE PRECISION,
    "wasteCost" DOUBLE PRECISION,
    "productionCost" DOUBLE PRECISION,
    "marginPercent" DOUBLE PRECISION,
    "marginAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "selectedOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_quote_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quoter_configs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawMaterialId" TEXT,
    "itemWidth" DOUBLE PRECISION,
    "itemHeight" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bleed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "minProfitMargin" DOUBLE PRECISION,
    "maxProfitMargin" DOUBLE PRECISION,
    "pricingMode" TEXT NOT NULL DEFAULT 'SHEET_NESTING',
    "allowCustomSize" BOOLEAN NOT NULL DEFAULT false,
    "minWidth" DOUBLE PRECISION,
    "maxWidth" DOUBLE PRECISION,
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_quoter_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quoter_option_groups" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectionMode" "ProductQuoterOptionSelectionMode" NOT NULL DEFAULT 'SINGLE',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_quoter_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quoter_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "defaultSelected" BOOLEAN NOT NULL DEFAULT false,
    "finishingId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_quoter_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quoter_option_constraints" (
    "optionId" TEXT NOT NULL,
    "targetOptionId" TEXT NOT NULL,
    "type" "ProductQuoterOptionConstraintType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quoter_option_constraints_pkey" PRIMARY KEY ("optionId","targetOptionId","type")
);

-- CreateTable
CREATE TABLE "product_quoter_option_sizes" (
    "optionId" TEXT NOT NULL,
    "sizePresetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quoter_option_sizes_pkey" PRIMARY KEY ("optionId","sizePresetId")
);

-- CreateTable
CREATE TABLE "product_quoter_config_materials" (
    "configId" TEXT NOT NULL,
    "rawMaterialId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quoter_config_materials_pkey" PRIMARY KEY ("configId","rawMaterialId")
);

-- CreateTable
CREATE TABLE "product_quoter_quantity_presets" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quoter_quantity_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_quoter_size_presets" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quoter_size_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quoter_config_finishings" (
    "configId" TEXT NOT NULL,
    "finishingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quoter_config_finishings_pkey" PRIMARY KEY ("configId","finishingId")
);

-- CreateTable
CREATE TABLE "ClientWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientWorkFile" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "objectKey" TEXT NOT NULL,
    "previousObjectKey" TEXT,
    "cleanupError" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWorkFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessType_slug_key" ON "BusinessType"("slug");

-- CreateIndex
CREATE INDEX "BusinessAccount_name_idx" ON "BusinessAccount"("name");

-- CreateIndex
CREATE INDEX "BusinessAccount_status_nextActionAt_idx" ON "BusinessAccount"("status", "nextActionAt");

-- CreateIndex
CREATE INDEX "BusinessAccount_businessTypeId_idx" ON "BusinessAccount"("businessTypeId");

-- CreateIndex
CREATE INDEX "BusinessAccount_assignedSellerId_status_idx" ON "BusinessAccount"("assignedSellerId", "status");

-- CreateIndex
CREATE INDEX "BusinessContact_accountId_isPrimary_idx" ON "BusinessContact"("accountId", "isPrimary");

-- CreateIndex
CREATE INDEX "BusinessContact_email_idx" ON "BusinessContact"("email");

-- CreateIndex
CREATE INDEX "BusinessContact_phone_idx" ON "BusinessContact"("phone");

-- CreateIndex
CREATE INDEX "SellerLead_sellerId_status_idx" ON "SellerLead"("sellerId", "status");

-- CreateIndex
CREATE INDEX "SellerLead_sellerId_nextContactAt_idx" ON "SellerLead"("sellerId", "nextContactAt");

-- CreateIndex
CREATE INDEX "SellerLead_email_idx" ON "SellerLead"("email");

-- CreateIndex
CREATE INDEX "SellerLead_phone_idx" ON "SellerLead"("phone");

-- CreateIndex
CREATE INDEX "SellerLeadEvent_leadId_createdAt_idx" ON "SellerLeadEvent"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_entityType_entityId_createdAt_idx" ON "AdminAuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Situation_slug_key" ON "Situation"("slug");

-- CreateIndex
CREATE INDEX "Situation_active_order_idx" ON "Situation"("active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Need_slug_key" ON "Need"("slug");

-- CreateIndex
CREATE INDEX "Need_active_order_idx" ON "Need"("active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_catalogType_active_idx" ON "Product"("catalogType", "active");

-- CreateIndex
CREATE INDEX "Product_modality_active_idx" ON "Product"("modality", "active");

-- CreateIndex
CREATE INDEX "Product_engine_idx" ON "Product"("engine");

-- CreateIndex
CREATE INDEX "OfferMatrixEntry_businessTypeId_situationId_needId_idx" ON "OfferMatrixEntry"("businessTypeId", "situationId", "needId");

-- CreateIndex
CREATE INDEX "OfferMatrixEntry_productId_idx" ON "OfferMatrixEntry"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferMatrixEntry_tuple_key" ON "OfferMatrixEntry"("businessTypeId", "situationId", "needId", "productId");

-- CreateIndex
CREATE INDEX "ConfiguratorVersion_productId_status_idx" ON "ConfiguratorVersion"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguratorVersion_productId_schemaVersion_key" ON "ConfiguratorVersion"("productId", "schemaVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Pack_slug_key" ON "Pack"("slug");

-- CreateIndex
CREATE INDEX "Pack_businessTypeId_active_idx" ON "Pack"("businessTypeId", "active");

-- CreateIndex
CREATE INDEX "PackItem_packId_idx" ON "PackItem"("packId");

-- CreateIndex
CREATE INDEX "PackItem_productId_idx" ON "PackItem"("productId");

-- CreateIndex
CREATE INDEX "ConsultRequest_status_createdAt_idx" ON "ConsultRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsultRequest_productId_idx" ON "ConsultRequest"("productId");

-- CreateIndex
CREATE INDEX "ConsultRequest_businessTypeId_idx" ON "ConsultRequest"("businessTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ZapCreditPlan_orderId_key" ON "ZapCreditPlan"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ZapCreditInstallment_planId_sequence_key" ON "ZapCreditInstallment"("planId", "sequence");

-- CreateIndex
CREATE INDEX "ZapCreditPaymentSubmission_planId_status_idx" ON "ZapCreditPaymentSubmission"("planId", "status");

-- CreateIndex
CREATE INDEX "ZapCreditPaymentSubmission_proofHash_idx" ON "ZapCreditPaymentSubmission"("proofHash");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_costs_variantId_key" ON "product_variant_costs"("variantId");

-- CreateIndex
CREATE INDEX "product_variant_costs_rawMaterialId_idx" ON "product_variant_costs"("rawMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRelation_productId_relatedProductId_key" ON "ProductRelation"("productId", "relatedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantOption_variantId_optionValueId_key" ON "VariantOption"("variantId", "optionValueId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAccount_kiosco24BranchId_key" ON "PartnerAccount"("kiosco24BranchId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAccount_kiosco24AccessKey_key" ON "PartnerAccount"("kiosco24AccessKey");

-- CreateIndex
CREATE INDEX "PartnerAccount_kiosco24AccessKey_idx" ON "PartnerAccount"("kiosco24AccessKey");

-- CreateIndex
CREATE INDEX "PartnerCampaign_zone_active_idx" ON "PartnerCampaign"("zone", "active");

-- CreateIndex
CREATE INDEX "PromotionCoupon_promotionId_status_idx" ON "PromotionCoupon"("promotionId", "status");

-- CreateIndex
CREATE INDEX "PromotionCoupon_batchName_idx" ON "PromotionCoupon"("batchName");

-- CreateIndex
CREATE INDEX "PromotionCoupon_businessAccountId_idx" ON "PromotionCoupon"("businessAccountId");

-- CreateIndex
CREATE INDEX "PromotionCoupon_businessContactId_idx" ON "PromotionCoupon"("businessContactId");

-- CreateIndex
CREATE INDEX "CouponScan_couponCode_scannedAt_idx" ON "CouponScan"("couponCode", "scannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_promotionId_status_idx" ON "CouponRedemption"("promotionId", "status");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponCode_status_idx" ON "CouponRedemption"("couponCode", "status");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "ProofFile_orderId_createdAt_idx" ON "ProofFile"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Receipt_orderId_status_idx" ON "Receipt"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_orderId_sequenceNumber_key" ON "Receipt"("orderId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SellerIncentiveProgress_sellerId_incentiveId_key" ON "SellerIncentiveProgress"("sellerId", "incentiveId");

-- CreateIndex
CREATE INDEX "SellerPayout_sellerId_idx" ON "SellerPayout"("sellerId");

-- CreateIndex
CREATE INDEX "SellerRankEvent_sellerId_createdAt_idx" ON "SellerRankEvent"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerCommissionLedger_sellerId_status_idx" ON "SellerCommissionLedger"("sellerId", "status");

-- CreateIndex
CREATE INDEX "SellerCommissionLedger_orderId_idx" ON "SellerCommissionLedger"("orderId");

-- CreateIndex
CREATE INDEX "SellerCommissionLedger_recurringId_period_idx" ON "SellerCommissionLedger"("recurringId", "period");

-- CreateIndex
CREATE INDEX "SellerCommissionLedger_payoutId_idx" ON "SellerCommissionLedger"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerCommissionLedger_sellerId_orderId_type_key" ON "SellerCommissionLedger"("sellerId", "orderId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SellerCommissionLedger_sellerId_recurringId_type_period_key" ON "SellerCommissionLedger"("sellerId", "recurringId", "type", "period");

-- CreateIndex
CREATE INDEX "SellerRecurringSubscription_clientId_idx" ON "SellerRecurringSubscription"("clientId");

-- CreateIndex
CREATE INDEX "SellerRecurringSubscription_portfolioSellerId_status_idx" ON "SellerRecurringSubscription"("portfolioSellerId", "status");

-- CreateIndex
CREATE INDEX "SellerRecurringSubscription_operationalSellerId_idx" ON "SellerRecurringSubscription"("operationalSellerId");

-- CreateIndex
CREATE INDEX "raw_material_tiers_rawMaterialId_idx" ON "raw_material_tiers"("rawMaterialId");

-- CreateIndex
CREATE INDEX "finishing_tiers_finishingId_idx" ON "finishing_tiers"("finishingId");

-- CreateIndex
CREATE INDEX "product_quote_cache_cacheKey_idx" ON "product_quote_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "product_quote_cache_pricingFingerprint_idx" ON "product_quote_cache"("pricingFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "product_quote_cache_cacheKey_pricingFingerprint_key" ON "product_quote_cache"("cacheKey", "pricingFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "product_quoter_configs_productId_key" ON "product_quoter_configs"("productId");

-- CreateIndex
CREATE INDEX "product_quoter_configs_rawMaterialId_idx" ON "product_quoter_configs"("rawMaterialId");

-- CreateIndex
CREATE INDEX "product_quoter_option_groups_configId_sortOrder_idx" ON "product_quoter_option_groups"("configId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "product_quoter_option_groups_configId_key_key" ON "product_quoter_option_groups"("configId", "key");

-- CreateIndex
CREATE INDEX "product_quoter_options_groupId_sortOrder_idx" ON "product_quoter_options"("groupId", "sortOrder");

-- CreateIndex
CREATE INDEX "product_quoter_options_finishingId_idx" ON "product_quoter_options"("finishingId");

-- CreateIndex
CREATE UNIQUE INDEX "product_quoter_options_groupId_key_key" ON "product_quoter_options"("groupId", "key");

-- CreateIndex
CREATE INDEX "product_quoter_option_constraints_targetOptionId_idx" ON "product_quoter_option_constraints"("targetOptionId");

-- CreateIndex
CREATE INDEX "product_quoter_option_sizes_sizePresetId_idx" ON "product_quoter_option_sizes"("sizePresetId");

-- CreateIndex
CREATE INDEX "product_quoter_config_materials_rawMaterialId_idx" ON "product_quoter_config_materials"("rawMaterialId");

-- CreateIndex
CREATE INDEX "product_quoter_quantity_presets_configId_idx" ON "product_quoter_quantity_presets"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "product_quoter_quantity_presets_configId_quantity_key" ON "product_quoter_quantity_presets"("configId", "quantity");

-- CreateIndex
CREATE INDEX "product_quoter_size_presets_configId_idx" ON "product_quoter_size_presets"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "product_quoter_size_presets_configId_label_key" ON "product_quoter_size_presets"("configId", "label");

-- CreateIndex
CREATE INDEX "quoter_config_finishings_finishingId_idx" ON "quoter_config_finishings"("finishingId");

-- CreateIndex
CREATE INDEX "ClientWork_userId_updatedAt_idx" ON "ClientWork"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ClientWork_createdById_createdAt_idx" ON "ClientWork"("createdById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClientWorkFile_objectKey_key" ON "ClientWorkFile"("objectKey");

-- CreateIndex
CREATE INDEX "ClientWorkFile_workId_createdAt_idx" ON "ClientWorkFile"("workId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientWorkFile_uploadedById_createdAt_idx" ON "ClientWorkFile"("uploadedById", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_operationalSellerId_fkey" FOREIGN KEY ("operationalSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_assignedSellerId_fkey" FOREIGN KEY ("assignedSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_operationalSellerId_fkey" FOREIGN KEY ("operationalSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAccount" ADD CONSTRAINT "BusinessAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessContact" ADD CONSTRAINT "BusinessContact_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLead" ADD CONSTRAINT "SellerLead_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLead" ADD CONSTRAINT "SellerLead_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLead" ADD CONSTRAINT "SellerLead_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerLeadEvent" ADD CONSTRAINT "SellerLeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SellerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMatrixEntry" ADD CONSTRAINT "OfferMatrixEntry_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMatrixEntry" ADD CONSTRAINT "OfferMatrixEntry_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "Situation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMatrixEntry" ADD CONSTRAINT "OfferMatrixEntry_needId_fkey" FOREIGN KEY ("needId") REFERENCES "Need"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMatrixEntry" ADD CONSTRAINT "OfferMatrixEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguratorVersion" ADD CONSTRAINT "ConfiguratorVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pack" ADD CONSTRAINT "Pack_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackItem" ADD CONSTRAINT "PackItem_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackItem" ADD CONSTRAINT "PackItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultRequest" ADD CONSTRAINT "ConsultRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultRequest" ADD CONSTRAINT "ConsultRequest_businessTypeId_fkey" FOREIGN KEY ("businessTypeId") REFERENCES "BusinessType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "PartnerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapCreditPlan" ADD CONSTRAINT "ZapCreditPlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapCreditInstallment" ADD CONSTRAINT "ZapCreditInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ZapCreditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapCreditPaymentSubmission" ADD CONSTRAINT "ZapCreditPaymentSubmission_duplicateOfSubmissionId_fkey" FOREIGN KEY ("duplicateOfSubmissionId") REFERENCES "ZapCreditPaymentSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapCreditPaymentSubmission" ADD CONSTRAINT "ZapCreditPaymentSubmission_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ZapCreditInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZapCreditPaymentSubmission" ADD CONSTRAINT "ZapCreditPaymentSubmission_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ZapCreditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemOption" ADD CONSTRAINT "OrderItemOption_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_costs" ADD CONSTRAINT "product_variant_costs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_costs" ADD CONSTRAINT "product_variant_costs_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelation" ADD CONSTRAINT "ProductRelation_relatedProductId_fkey" FOREIGN KEY ("relatedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantOption" ADD CONSTRAINT "VariantOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCoupon" ADD CONSTRAINT "PromotionCoupon_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCoupon" ADD CONSTRAINT "PromotionCoupon_businessAccountId_fkey" FOREIGN KEY ("businessAccountId") REFERENCES "BusinessAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCoupon" ADD CONSTRAINT "PromotionCoupon_businessContactId_fkey" FOREIGN KEY ("businessContactId") REFERENCES "BusinessContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponScan" ADD CONSTRAINT "CouponScan_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "PromotionCoupon"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "PromotionCoupon"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofFile" ADD CONSTRAINT "ProofFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "ZapCreditInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerIncentiveProgress" ADD CONSTRAINT "SellerIncentiveProgress_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerIncentiveProgress" ADD CONSTRAINT "SellerIncentiveProgress_incentiveId_fkey" FOREIGN KEY ("incentiveId") REFERENCES "SellerIncentive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerRankEvent" ADD CONSTRAINT "SellerRankEvent_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommissionLedger" ADD CONSTRAINT "SellerCommissionLedger_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommissionLedger" ADD CONSTRAINT "SellerCommissionLedger_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommissionLedger" ADD CONSTRAINT "SellerCommissionLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommissionLedger" ADD CONSTRAINT "SellerCommissionLedger_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "SellerRecurringSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCommissionLedger" ADD CONSTRAINT "SellerCommissionLedger_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerRecurringSubscription" ADD CONSTRAINT "SellerRecurringSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerRecurringSubscription" ADD CONSTRAINT "SellerRecurringSubscription_portfolioSellerId_fkey" FOREIGN KEY ("portfolioSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerRecurringSubscription" ADD CONSTRAINT "SellerRecurringSubscription_operationalSellerId_fkey" FOREIGN KEY ("operationalSellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_material_tiers" ADD CONSTRAINT "raw_material_tiers_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finishing_tiers" ADD CONSTRAINT "finishing_tiers_finishingId_fkey" FOREIGN KEY ("finishingId") REFERENCES "finishing_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_configs" ADD CONSTRAINT "product_quoter_configs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_configs" ADD CONSTRAINT "product_quoter_configs_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_option_groups" ADD CONSTRAINT "product_quoter_option_groups_configId_fkey" FOREIGN KEY ("configId") REFERENCES "product_quoter_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_options" ADD CONSTRAINT "product_quoter_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_quoter_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_options" ADD CONSTRAINT "product_quoter_options_finishingId_fkey" FOREIGN KEY ("finishingId") REFERENCES "finishing_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_option_constraints" ADD CONSTRAINT "product_quoter_option_constraints_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_quoter_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_option_constraints" ADD CONSTRAINT "product_quoter_option_constraints_targetOptionId_fkey" FOREIGN KEY ("targetOptionId") REFERENCES "product_quoter_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_option_sizes" ADD CONSTRAINT "product_quoter_option_sizes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "product_quoter_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_option_sizes" ADD CONSTRAINT "product_quoter_option_sizes_sizePresetId_fkey" FOREIGN KEY ("sizePresetId") REFERENCES "product_quoter_size_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_config_materials" ADD CONSTRAINT "product_quoter_config_materials_configId_fkey" FOREIGN KEY ("configId") REFERENCES "product_quoter_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_config_materials" ADD CONSTRAINT "product_quoter_config_materials_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "raw_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_quantity_presets" ADD CONSTRAINT "product_quoter_quantity_presets_configId_fkey" FOREIGN KEY ("configId") REFERENCES "product_quoter_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_quoter_size_presets" ADD CONSTRAINT "product_quoter_size_presets_configId_fkey" FOREIGN KEY ("configId") REFERENCES "product_quoter_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoter_config_finishings" ADD CONSTRAINT "quoter_config_finishings_configId_fkey" FOREIGN KEY ("configId") REFERENCES "product_quoter_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quoter_config_finishings" ADD CONSTRAINT "quoter_config_finishings_finishingId_fkey" FOREIGN KEY ("finishingId") REFERENCES "finishing_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWork" ADD CONSTRAINT "ClientWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWork" ADD CONSTRAINT "ClientWork_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkFile" ADD CONSTRAINT "ClientWorkFile_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ClientWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkFile" ADD CONSTRAINT "ClientWorkFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
