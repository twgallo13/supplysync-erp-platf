/**
 * Replenishment Engine Service
 * Implements automated replenishment logic according to SupplySync ERP specification v8.1
 */

import { Product, Store, Vendor, LineItem } from '@/types'
import { MLForecastingService, createMLForecastingService, ExternalFactors } from './ml-forecasting'

// Replenishment request interface
export interface ReplenishmentRequest {
  product_id: string
  store_id: string
  current_quantity: number
  reorder_point: number
  target_quantity: number
  suggested_vendor_id: string
  calculated_cost: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  ml_forecast?: {
    confidence: number
    seasonality_factor: number
    predicted_daily_usage: number
  }
}

// Configuration for replenishment calculations
export interface ReplenishmentConfig {
  // Days of cover targets by store tier
  standardDaysOfCover: number
  premiumDaysOfCover: number
  basicDaysOfCover: number
  
  // Safety stock multipliers
  safetyStockMultiplier: number
  
  // Demand forecasting parameters
  forecastingHorizonDays: number
  seasonalityWeights: Record<string, number>
}

// Historical usage data for demand forecasting
export interface UsageHistory {
  product_id: string
  store_id: string
  usage_date: string
  quantity_used: number
  is_seasonal: boolean
  event_type?: string // 'promo', 'holiday', 'weather', etc.
}

// Current inventory levels
export interface InventoryLevel {
  product_id: string
  store_id: string
  on_hand_quantity: number
  reserved_quantity: number
  in_transit_quantity: number
  last_updated: string
}

// Need group configuration for functional substitution
export interface NeedGroup {
  need_group_id: string
  name: string
  equivalent_unit: string
  store_minimums: Record<string, number> // store_id -> minimum quantity
  substitution_preferences: string[] // ordered list of product_ids
}

/**
 * Core replenishment engine implementing the specification's formulas and logic
 * Enhanced with ML-based seasonal demand forecasting
 */
export class ReplenishmentEngine {
  private config: ReplenishmentConfig
  private mlForecasting: MLForecastingService
  
  constructor(config: ReplenishmentConfig) {
    this.config = config
    this.mlForecasting = createMLForecastingService()
  }

  /**
   * Calculate reorder point using the formula:
   * ROP = Safety Stock + (Lead Time Days × Forecasted Daily Usage)
   */
  private calculateReorderPoint(
    dailyUsage: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    return Math.ceil(safetyStock + (leadTimeDays * dailyUsage))
  }

  /**
   * Calculate target on-hand quantity using:
   * Target On-Hand = Days of Cover × Daily Usage
   */
  private calculateTargetOnHand(
    dailyUsage: number,
    daysOfCover: number
  ): number {
    return Math.ceil(dailyUsage * daysOfCover)
  }

  /**
   * Calculate safety stock based on demand variability
   */
  private calculateSafetyStock(
    averageDailyUsage: number,
    usageVariability: number
  ): number {
    return Math.ceil(averageDailyUsage * this.config.safetyStockMultiplier * (1 + usageVariability))
  }

  /**
   * Enhanced forecast daily usage using ML-based seasonal forecasting
   */
  private async forecastDailyUsageML(
    productId: string,
    storeId: string,
    usageHistory: UsageHistory[],
    externalFactors?: ExternalFactors,
    currentDate: Date = new Date()
  ): Promise<{ averageDaily: number; variability: number; confidence: number; seasonalityFactor: number }> {
    if (usageHistory.length === 0) {
      return { averageDaily: 0, variability: 0, confidence: 0, seasonalityFactor: 1.0 }
    }

    try {
      // Use ML forecasting service for sophisticated demand prediction
      const mlForecast = await this.mlForecasting.generateForecast(
        productId,
        storeId,
        usageHistory,
        externalFactors
      )

      // Calculate variability from confidence interval
      const prediction = mlForecast.prediction.next7Days
      const confidenceInterval = mlForecast.prediction.confidenceInterval
      const avgPrediction = prediction.reduce((sum, val) => sum + val, 0) / prediction.length
      const avgLower = confidenceInterval.lower.reduce((sum, val) => sum + val, 0) / confidenceInterval.lower.length
      const avgUpper = confidenceInterval.upper.reduce((sum, val) => sum + val, 0) / confidenceInterval.upper.length
      
      const variability = avgPrediction > 0 ? (avgUpper - avgLower) / (2 * avgPrediction) : 0

      return {
        averageDaily: mlForecast.forecastedDailyUsage,
        variability,
        confidence: mlForecast.confidence,
        seasonalityFactor: mlForecast.seasonalityFactor
      }
    } catch (error) {
      console.warn(`ML forecasting failed for product ${productId} in store ${storeId}, falling back to simple method:`, error)
      // Fallback to original simple forecasting method
      const simpleForecast = this.forecastDailyUsage(usageHistory, currentDate)
      return {
        ...simpleForecast,
        confidence: 0.5,
        seasonalityFactor: 1.0
      }
    }
  }

  /**
   * Original forecast daily usage based on historical data with seasonality (fallback method)
   */
  private forecastDailyUsage(
    usageHistory: UsageHistory[],
    currentDate: Date = new Date()
  ): { averageDaily: number; variability: number } {
    if (usageHistory.length === 0) {
      return { averageDaily: 0, variability: 0 }
    }

    // Apply seasonal weights based on current month
    const currentMonth = currentDate.getMonth()
    const seasonalWeight = this.config.seasonalityWeights[currentMonth.toString()] || 1.0

    // Calculate weighted average daily usage
    const recentUsage = usageHistory
      .slice(-this.config.forecastingHorizonDays)
      .map(u => u.quantity_used * (u.is_seasonal ? seasonalWeight : 1.0))

    const averageDaily = recentUsage.reduce((sum, usage) => sum + usage, 0) / recentUsage.length

    // Calculate coefficient of variation for variability
    const variance = recentUsage.reduce((sum, usage) => {
      const diff = usage - averageDaily
      return sum + (diff * diff)
    }, 0) / recentUsage.length

    const standardDeviation = Math.sqrt(variance)
    const variability = averageDaily > 0 ? standardDeviation / averageDaily : 0

    return { averageDaily, variability }
  }

  /**
   * Determine days of cover target based on store tier and product type
   */
  private getDaysOfCoverTarget(store: Store, product: Product): number {
    // Use product's supplyDurationDays if specified, otherwise use store tier defaults
    if (product.supplyDurationDays) {
      return product.supplyDurationDays
    }

    // Simple tiering logic - in real implementation, this would be more sophisticated
    const storeTier = this.determineStoreTier(store)
    
    switch (storeTier) {
      case 'PREMIUM':
        return this.config.premiumDaysOfCover
      case 'BASIC':
        return this.config.basicDaysOfCover
      default:
        return this.config.standardDaysOfCover
    }
  }

  /**
   * Simple store tier determination - in real implementation, 
   * this would use store attributes like volume, location type, etc.
   */
  private determineStoreTier(store: Store): 'PREMIUM' | 'STANDARD' | 'BASIC' {
    // Placeholder logic - would be enhanced with real store classification
    return 'STANDARD'
  }

  /**
   * Generate replenishment suggestions for products below reorder point
   * Enhanced with ML-based demand forecasting
   */
  async generateReplenishmentRequests(
    store: Store,
    products: Product[],
    inventoryLevels: InventoryLevel[],
    usageHistory: UsageHistory[],
    externalFactors?: ExternalFactors
  ): Promise<ReplenishmentRequest[]> {
    const requests: ReplenishmentRequest[] = []

    for (const product of products) {
      if (!product.is_active) continue

      const inventory = inventoryLevels.find(
        inv => inv.product_id === product.product_id && inv.store_id === store.store_id
      )

      if (!inventory) continue

      const productUsageHistory = usageHistory.filter(
        h => h.product_id === product.product_id && h.store_id === store.store_id
      )

      // Use ML forecasting for better demand prediction
      const forecast = await this.forecastDailyUsageML(
        product.product_id,
        store.store_id,
        productUsageHistory,
        externalFactors
      )
      
      if (forecast.averageDaily === 0) continue // No usage history, skip

      const safetyStock = this.calculateSafetyStock(forecast.averageDaily, forecast.variability)
      const daysOfCover = this.getDaysOfCoverTarget(store, product)
      
      // Get the best vendor for lead time calculation
      const bestVendor = this.selectOptimalVendor(product.vendors, store)
      if (!bestVendor) continue

      const reorderPoint = this.calculateReorderPoint(
        forecast.averageDaily,
        bestVendor.lead_time_days,
        safetyStock
      )

      const availableQuantity = inventory.on_hand_quantity - inventory.reserved_quantity
      
      // Check if replenishment is needed
      if (availableQuantity <= reorderPoint) {
        const targetOnHand = this.calculateTargetOnHand(forecast.averageDaily, daysOfCover)
        const quantityNeeded = Math.max(0, targetOnHand - availableQuantity - inventory.in_transit_quantity)

        if (quantityNeeded > 0) {
          // Determine priority based on how far below ROP we are and ML confidence
          let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
          
          // Factor in seasonality and confidence for priority calculation
          const adjustedReorderPoint = reorderPoint * forecast.seasonalityFactor
          const confidenceAdjustment = forecast.confidence > 0.8 ? 1.2 : forecast.confidence > 0.6 ? 1.0 : 0.8
          
          if (availableQuantity <= safetyStock * confidenceAdjustment) {
            priority = 'HIGH'
          } else if (availableQuantity <= adjustedReorderPoint * 0.8) {
            priority = 'MEDIUM'
          } else {
            priority = 'LOW'
          }

          requests.push({
            product_id: product.product_id,
            store_id: store.store_id,
            current_quantity: availableQuantity,
            reorder_point: Math.round(adjustedReorderPoint),
            target_quantity: quantityNeeded,
            suggested_vendor_id: bestVendor.vendor_id,
            calculated_cost: quantityNeeded * bestVendor.cost_per_item,
            priority,
            ml_forecast: {
              confidence: forecast.confidence,
              seasonality_factor: forecast.seasonalityFactor,
              predicted_daily_usage: forecast.averageDaily
            }
          })
        }
      }
    }

    return requests
  }

  /**
   * Select optimal vendor based on cost → lead time → preference → SLA priority
   */
  selectOptimalVendor(
    vendors: Vendor[],
    store: Store,
    requiredLeadTimeDays?: number
  ): Vendor | null {
    if (vendors.length === 0) return null

    // Filter vendors that can meet lead time requirement if specified
    let eligibleVendors = vendors.filter(v => 
      !requiredLeadTimeDays || v.lead_time_days <= requiredLeadTimeDays
    )

    if (eligibleVendors.length === 0) {
      eligibleVendors = vendors // Fall back to all vendors if none meet lead time
    }

    // Sort by: cost ASC, lead_time ASC, is_preferred DESC
    eligibleVendors.sort((a, b) => {
      // Primary: lowest cost
      if (a.cost_per_item !== b.cost_per_item) {
        return a.cost_per_item - b.cost_per_item
      }
      
      // Secondary: shortest lead time
      if (a.lead_time_days !== b.lead_time_days) {
        return a.lead_time_days - b.lead_time_days
      }
      
      // Tertiary: preferred vendor
      if (a.is_preferred !== b.is_preferred) {
        return b.is_preferred ? 1 : -1
      }
      
      return 0
    })

    return eligibleVendors[0]
  }

  /**
   * Handle functional-need replenishment with substitution logic
   */
  async generateFunctionalNeedReplenishment(
    store: Store,
    needGroup: NeedGroup,
    products: Product[],
    inventoryLevels: InventoryLevel[],
    usageHistory: UsageHistory[]
  ): Promise<{ lineItems: LineItem[]; totalCost: number }> {
    const needGroupProducts = products.filter(p => p.needGroup === needGroup.need_group_id)
    
    if (needGroupProducts.length === 0) {
      return { lineItems: [], totalCost: 0 }
    }

    // Calculate equivalent units for cost comparison
    const productCostPerUnit = needGroupProducts.map(product => {
      const bestVendor = this.selectOptimalVendor(product.vendors, store)
      if (!bestVendor || !product.equivalentUnit) return null

      return {
        product,
        vendor: bestVendor,
        costPerEquivalentUnit: bestVendor.cost_per_item / product.equivalentUnit.value
      }
    }).filter(Boolean) as Array<{
      product: Product
      vendor: Vendor
      costPerEquivalentUnit: number
    }>

    // Sort by cost per equivalent unit (ascending)
    productCostPerUnit.sort((a, b) => a.costPerEquivalentUnit - b.costPerEquivalentUnit)

    const lineItems: LineItem[] = []
    let totalCost = 0

    // First, ensure store minimums are met (e.g., minimum sprayers)
    const storeMinimum = needGroup.store_minimums[store.store_id] || 0
    if (storeMinimum > 0) {
      // Find products that satisfy store minimum requirements (e.g., sprayers)
      const minimumProducts = productCostPerUnit.filter(item => 
        item.product.tags.includes('sprayer') || item.product.tags.includes('minimum-required')
      )

      if (minimumProducts.length > 0) {
        const bestMinimumProduct = minimumProducts[0]
        const currentMinimumStock = inventoryLevels
          .filter(inv => inv.store_id === store.store_id && 
                        needGroupProducts.some(p => p.product_id === inv.product_id && 
                                                  p.tags.includes('sprayer')))
          .reduce((sum, inv) => sum + inv.on_hand_quantity, 0)

        if (currentMinimumStock < storeMinimum) {
          const quantityNeeded = storeMinimum - currentMinimumStock
          lineItems.push({
            product_id: bestMinimumProduct.product.product_id,
            vendor_id: bestMinimumProduct.vendor.vendor_id,
            quantity: quantityNeeded,
            unit_cost: bestMinimumProduct.vendor.cost_per_item
          })
          totalCost += quantityNeeded * bestMinimumProduct.vendor.cost_per_item
        }
      }
    }

    // Then, fulfill remaining need with lowest cost options (e.g., refills)
    // This would involve more complex logic to calculate total equivalent units needed
    // and select the most cost-effective mix of products

    return { lineItems, totalCost }
  }

  /**
   * Create system-initiated replenishment orders
   */
  async createSystemReplenishmentOrders(
    replenishmentRequests: ReplenishmentRequest[]
  ): Promise<string[]> {
    const orderIds: string[] = []

    // Group requests by store for batching
    const requestsByStore = replenishmentRequests.reduce((acc, request) => {
      if (!acc[request.store_id]) {
        acc[request.store_id] = []
      }
      acc[request.store_id].push(request)
      return acc
    }, {} as Record<string, ReplenishmentRequest[]>)

    for (const [storeId, requests] of Object.entries(requestsByStore)) {
      // Create order with SYSTEM_INITIATED type and PENDING_FM_APPROVAL status
      const orderId = await this.createReplenishmentOrder(storeId, requests)
      orderIds.push(orderId)
    }

    return orderIds
  }

  /**
   * Create a single replenishment order (placeholder - would integrate with orders service)
   */
  private async createReplenishmentOrder(
    storeId: string,
    requests: ReplenishmentRequest[]
  ): Promise<string> {
    // This would integrate with the actual orders service
    // For now, return a mock order ID
    const orderId = `ord_sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // In real implementation, this would:
    // 1. Create order record with SYSTEM_INITIATED type
    // 2. Set status to PENDING_FM_APPROVAL
    // 3. Add line items from requests
    // 4. Log audit entry for system creation
    // 5. Send notification to FM
    
    console.log(`Created system replenishment order ${orderId} for store ${storeId}`)
    
    return orderId
  }
}

/**
 * Default configuration for replenishment engine
 */
export const DEFAULT_REPLENISHMENT_CONFIG: ReplenishmentConfig = {
  standardDaysOfCover: 60,
  premiumDaysOfCover: 90,
  basicDaysOfCover: 30,
  safetyStockMultiplier: 1.5,
  forecastingHorizonDays: 90,
  seasonalityWeights: {
    '0': 1.2,  // January - winter cleaning
    '1': 1.0,  // February
    '2': 1.1,  // March - spring cleaning prep
    '3': 1.3,  // April - spring cleaning
    '4': 1.2,  // May - continued spring activity
    '5': 1.0,  // June
    '6': 0.9,  // July - slower period
    '7': 0.9,  // August - slower period
    '8': 1.1,  // September - back to school
    '9': 1.0,  // October
    '10': 1.4, // November - holiday prep
    '11': 1.5  // December - holiday season
  }
}