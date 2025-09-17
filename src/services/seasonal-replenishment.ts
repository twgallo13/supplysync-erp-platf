/**
 * Seasonal Replenishment Service
 * Orchestrates ML-based seasonal demand forecasting with replenishment automation
 */

import { useKV } from '@github/spark/hooks'
import { ReplenishmentEngine, UsageHistory, InventoryLevel } from './replenishment-engine'
import { createMLForecastingService, ExternalFactors } from './ml-forecasting'
import { Product, Store, ReplenishmentRequest } from '@/types'

// Seasonal events and their impact multipliers
export interface SeasonalEvent {
  name: string
  start_date: Date
  end_date: Date
  product_categories: string[]
  impact_multiplier: number
  description: string
}

// Weather data integration
export interface WeatherData {
  store_id: string
  date: Date
  temperature: number
  precipitation: number
  humidity: number
  seasonal_event?: string
}

// External factors aggregator
export interface ExternalFactorsAggregator {
  holidays: string[]
  promotions: Array<{
    productId: string
    startDate: Date
    endDate: Date
    discountPercent: number
  }>
  events: Array<{
    type: string
    impact: number
    startDate: Date
    endDate: Date
  }>
  weather?: {
    temperature: number
    precipitation: number
    seasonalEvent: string
  }
}

/**
 * Service for managing seasonal demand patterns and automated replenishment
 */
export class SeasonalReplenishmentService {
  private replenishmentEngine: ReplenishmentEngine
  private mlForecasting = createMLForecastingService()

  constructor(replenishmentEngine: ReplenishmentEngine) {
    this.replenishmentEngine = replenishmentEngine
  }

  /**
   * Generate seasonal replenishment plan based on ML forecasts
   */
  async generateSeasonalReplenishmentPlan(
    stores: Store[],
    products: Product[],
    inventoryLevels: InventoryLevel[],
    usageHistory: UsageHistory[],
    seasonalEvents: SeasonalEvent[] = [],
    weatherData: WeatherData[] = []
  ): Promise<{
    replenishmentRequests: ReplenishmentRequest[]
    seasonalInsights: {
      highDemandPeriods: Array<{
        product_id: string
        store_id: string
        period: string
        expected_demand_increase: number
      }>
      stockoutRisks: Array<{
        product_id: string
        store_id: string
        risk_level: 'HIGH' | 'MEDIUM' | 'LOW'
        days_until_stockout: number
      }>
    }
  }> {
    const allRequests: ReplenishmentRequest[] = []
    const highDemandPeriods: Array<{
      product_id: string
      store_id: string
      period: string
      expected_demand_increase: number
    }> = []
    const stockoutRisks: Array<{
      product_id: string
      store_id: string
      risk_level: 'HIGH' | 'MEDIUM' | 'LOW'
      days_until_stockout: number
    }> = []

    // Process each store
    for (const store of stores) {
      // Aggregate external factors for this store
      const externalFactors = this.aggregateExternalFactors(
        store,
        seasonalEvents,
        weatherData
      )

      // Generate replenishment requests with ML forecasting
      const storeRequests = await this.replenishmentEngine.generateReplenishmentRequests(
        store,
        products,
        inventoryLevels.filter(inv => inv.store_id === store.store_id),
        usageHistory.filter(hist => hist.store_id === store.store_id),
        externalFactors
      )

      allRequests.push(...storeRequests)

      // Analyze seasonal patterns for insights
      for (const product of products) {
        const productUsageHistory = usageHistory.filter(
          h => h.product_id === product.product_id && h.store_id === store.store_id
        )

        if (productUsageHistory.length > 0) {
          // Generate ML forecast for trend analysis
          const forecast = await this.mlForecasting.generateForecast(
            product.product_id,
            store.store_id,
            productUsageHistory,
            externalFactors
          )

          // Identify high demand periods
          const seasonalIncrease = this.calculateSeasonalIncrease(forecast.seasonalityFactor)
          if (seasonalIncrease > 1.2) {
            highDemandPeriods.push({
              product_id: product.product_id,
              store_id: store.store_id,
              period: this.getCurrentSeasonalPeriod(),
              expected_demand_increase: seasonalIncrease
            })
          }

          // Calculate stockout risk
          const currentInventory = inventoryLevels.find(
            inv => inv.product_id === product.product_id && inv.store_id === store.store_id
          )

          if (currentInventory && forecast.forecastedDailyUsage > 0) {
            const daysUntilStockout = currentInventory.on_hand_quantity / forecast.forecastedDailyUsage
            let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'

            if (daysUntilStockout <= 7) {
              riskLevel = 'HIGH'
            } else if (daysUntilStockout <= 14) {
              riskLevel = 'MEDIUM'
            }

            if (riskLevel !== 'LOW') {
              stockoutRisks.push({
                product_id: product.product_id,
                store_id: store.store_id,
                risk_level: riskLevel,
                days_until_stockout: Math.round(daysUntilStockout)
              })
            }
          }
        }
      }
    }

    return {
      replenishmentRequests: allRequests,
      seasonalInsights: {
        highDemandPeriods,
        stockoutRisks
      }
    }
  }

  /**
   * Aggregate external factors for a specific store
   */
  private aggregateExternalFactors(
    store: Store,
    seasonalEvents: SeasonalEvent[],
    weatherData: WeatherData[]
  ): ExternalFactors {
    const currentDate = new Date()
    
    // Get active seasonal events
    const activeEvents = seasonalEvents.filter(event => 
      currentDate >= event.start_date && currentDate <= event.end_date
    )

    // Get weather data for this store
    const storeWeather = weatherData.find(w => 
      w.store_id === store.store_id && 
      this.isSameDay(w.date, currentDate)
    )

    // Default holidays (would be configurable in production)
    const holidays = this.getUpcomingHolidays()

    // Convert seasonal events to external factors format
    const events = activeEvents.map(event => ({
      type: event.name,
      impact: event.impact_multiplier,
      startDate: event.start_date,
      endDate: event.end_date
    }))

    return {
      holidays,
      promotions: [], // Would be fetched from promotion service
      events,
      weather: storeWeather ? {
        temperature: storeWeather.temperature,
        precipitation: storeWeather.precipitation,
        seasonalEvent: storeWeather.seasonal_event || ''
      } : {
        temperature: 70,
        precipitation: 0,
        seasonalEvent: ''
      }
    }
  }

  /**
   * Get upcoming holidays for the next 30 days
   */
  private getUpcomingHolidays(): string[] {
    const currentDate = new Date()
    const holidays: string[] = []
    
    // Simple holiday detection (in production, would use a proper calendar service)
    const month = currentDate.getMonth()
    const day = currentDate.getDate()
    
    // Christmas season
    if (month === 11 && day >= 15) {
      holidays.push('Christmas')
    }
    
    // Back to school (August/September)
    if ((month === 7 && day >= 15) || (month === 8 && day <= 15)) {
      holidays.push('BackToSchool')
    }
    
    // Spring cleaning (March/April)
    if (month === 2 || (month === 3 && day <= 15)) {
      holidays.push('SpringCleaning')
    }

    return holidays
  }

  /**
   * Calculate seasonal demand increase based on seasonality factor
   */
  private calculateSeasonalIncrease(seasonalityFactor: number): number {
    // Convert seasonality factor to demand increase multiplier
    return Math.max(1.0, seasonalityFactor)
  }

  /**
   * Get current seasonal period name
   */
  private getCurrentSeasonalPeriod(): string {
    const month = new Date().getMonth()
    
    if (month >= 2 && month <= 4) return 'Spring'
    if (month >= 5 && month <= 7) return 'Summer'
    if (month >= 8 && month <= 10) return 'Fall'
    return 'Winter'
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate()
  }

  /**
   * Run automated seasonal replenishment job
   */
  async runSeasonalReplenishmentJob(): Promise<{
    success: boolean
    requestsGenerated: number
    insights: {
      seasonalAlerts: number
      stockoutWarnings: number
    }
  }> {
    try {
      // In a real implementation, these would be fetched from the database
      const stores: Store[] = [] // Fetch from store service
      const products: Product[] = [] // Fetch from product service
      const inventoryLevels: InventoryLevel[] = [] // Fetch from inventory service
      const usageHistory: UsageHistory[] = [] // Fetch from usage service
      const seasonalEvents: SeasonalEvent[] = [] // Fetch from events service
      const weatherData: WeatherData[] = [] // Fetch from weather service

      const result = await this.generateSeasonalReplenishmentPlan(
        stores,
        products,
        inventoryLevels,
        usageHistory,
        seasonalEvents,
        weatherData
      )

      // Create system-initiated orders for high-priority requests
      const highPriorityRequests = result.replenishmentRequests.filter(
        req => req.priority === 'HIGH'
      )

      if (highPriorityRequests.length > 0) {
        await this.replenishmentEngine.createSystemReplenishmentOrders(highPriorityRequests)
      }

      // Log insights for monitoring
      console.log('Seasonal Replenishment Job Results:', {
        totalRequests: result.replenishmentRequests.length,
        highPriorityRequests: highPriorityRequests.length,
        highDemandPeriods: result.seasonalInsights.highDemandPeriods.length,
        stockoutRisks: result.seasonalInsights.stockoutRisks.length
      })

      return {
        success: true,
        requestsGenerated: result.replenishmentRequests.length,
        insights: {
          seasonalAlerts: result.seasonalInsights.highDemandPeriods.length,
          stockoutWarnings: result.seasonalInsights.stockoutRisks.filter(r => r.risk_level === 'HIGH').length
        }
      }
    } catch (error) {
      console.error('Seasonal replenishment job failed:', error)
      return {
        success: false,
        requestsGenerated: 0,
        insights: {
          seasonalAlerts: 0,
          stockoutWarnings: 0
        }
      }
    }
  }
}

/**
 * Default seasonal events configuration
 */
export const DEFAULT_SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    name: 'Spring Cleaning',
    start_date: new Date(new Date().getFullYear(), 2, 15), // March 15
    end_date: new Date(new Date().getFullYear(), 4, 15),   // May 15
    product_categories: ['Cleaning Supplies', 'Paper Products'],
    impact_multiplier: 1.4,
    description: 'Increased demand for cleaning supplies during spring cleaning season'
  },
  {
    name: 'Back to School',
    start_date: new Date(new Date().getFullYear(), 7, 15), // August 15
    end_date: new Date(new Date().getFullYear(), 8, 15),   // September 15
    product_categories: ['Office Supplies', 'Paper Products'],
    impact_multiplier: 1.3,
    description: 'Higher demand for office and school supplies'
  },
  {
    name: 'Holiday Season',
    start_date: new Date(new Date().getFullYear(), 10, 15), // November 15
    end_date: new Date(new Date().getFullYear() + 1, 0, 15), // January 15
    product_categories: ['Cleaning Supplies', 'Paper Products', 'Packaging'],
    impact_multiplier: 1.5,
    description: 'Peak demand during holiday shopping and preparation season'
  },
  {
    name: 'Winter Storm Season',
    start_date: new Date(new Date().getFullYear(), 11, 1), // December 1
    end_date: new Date(new Date().getFullYear() + 1, 2, 1), // March 1
    product_categories: ['Maintenance Supplies', 'Safety Equipment'],
    impact_multiplier: 1.2,
    description: 'Increased need for maintenance and safety supplies during winter'
  }
]

/**
 * Factory function to create seasonal replenishment service
 */
export function createSeasonalReplenishmentService(
  replenishmentEngine: ReplenishmentEngine
): SeasonalReplenishmentService {
  return new SeasonalReplenishmentService(replenishmentEngine)
}