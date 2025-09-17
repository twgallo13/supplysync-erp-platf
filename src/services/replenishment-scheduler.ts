/**
 * Replenishment Scheduler
 * Manages automated replenishment cycles with ML-based forecasting and intelligent scheduling
 */

import { ReplenishmentEngine, ReplenishmentConfig, DEFAULT_REPLENISHMENT_CONFIG } from './replenishment-engine'
import { ExternalFactors } from './ml-forecasting'
import { Product, Store, Vendor } from '@/types'

// Scheduler configuration
export interface SchedulerConfig {
  replenishmentEngine: ReplenishmentConfig
  schedulingRules: {
    nightlyRunTime: string // "02:00" format
    weeklyRunDay: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
    monthlyRunDate: number // 1-28
    emergencyThreshold: number // Stockout hours before emergency replenishment
  }
  weatherIntegration: {
    enabled: boolean
    apiKey?: string
    lookAheadDays: number
  }
  promotionIntegration: {
    enabled: boolean
    bufferDays: number // Days before promotion to increase stock
  }
}

// Scheduled job result
export interface ScheduledJobResult {
  job_id: string
  job_type: 'NIGHTLY' | 'WEEKLY' | 'MONTHLY' | 'EMERGENCY' | 'EVENT_DRIVEN'
  executed_at: Date
  stores_processed: number
  products_analyzed: number
  orders_generated: number
  total_cost: number
  success_rate: number
  errors: Array<{
    store_id: string
    product_id?: string
    error_message: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
  ml_performance: {
    forecasts_generated: number
    average_confidence: number
    model_accuracy: number
  }
}

// Event-driven trigger
export interface ReplenishmentTrigger {
  trigger_id: string
  trigger_type: 'STOCKOUT_ALERT' | 'WEATHER_EVENT' | 'PROMOTION_LAUNCH' | 'SEASONAL_DEMAND' | 'VENDOR_DISRUPTION'
  store_ids: string[]
  product_ids?: string[]
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  trigger_data: Record<string, any>
  created_at: Date
  processed: boolean
}

/**
 * Advanced replenishment scheduler with ML integration
 */
export class ReplenishmentScheduler {
  private config: SchedulerConfig
  private replenishmentEngine: ReplenishmentEngine
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map()
  private isRunning: boolean = false

  constructor(config: SchedulerConfig) {
    this.config = config
    this.replenishmentEngine = new ReplenishmentEngine(config.replenishmentEngine)
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Replenishment scheduler is already running')
      return
    }

    this.isRunning = true
    this.scheduleNightlyJob()
    this.scheduleWeeklyJob()
    this.scheduleMonthlyJob()

    console.log('Replenishment scheduler started')
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false
    
    // Clear all scheduled jobs
    this.scheduledJobs.forEach((timeout, jobId) => {
      clearTimeout(timeout)
    })
    this.scheduledJobs.clear()

    console.log('Replenishment scheduler stopped')
  }

  /**
   * Schedule nightly replenishment job
   */
  private scheduleNightlyJob(): void {
    const scheduleNext = () => {
      if (!this.isRunning) return

      const now = new Date()
      const [hour, minute] = this.config.schedulingRules.nightlyRunTime.split(':').map(Number)
      
      let nextRun = new Date()
      nextRun.setHours(hour, minute, 0, 0)
      
      // If the time has already passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }

      const timeUntilRun = nextRun.getTime() - now.getTime()

      const timeoutId = setTimeout(async () => {
        try {
          await this.executeNightlyReplenishment()
        } catch (error) {
          console.error('Nightly replenishment job failed:', error)
        } finally {
          scheduleNext() // Schedule next run
        }
      }, timeUntilRun)

      this.scheduledJobs.set('nightly', timeoutId)
    }

    scheduleNext()
  }

  /**
   * Schedule weekly replenishment job
   */
  private scheduleWeeklyJob(): void {
    const scheduleNext = () => {
      if (!this.isRunning) return

      const now = new Date()
      const targetDay = this.getDayNumber(this.config.schedulingRules.weeklyRunDay)
      const currentDay = now.getDay()
      
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7 // Next week
      }

      const nextRun = new Date(now)
      nextRun.setDate(now.getDate() + daysUntilTarget)
      nextRun.setHours(3, 0, 0, 0) // 3 AM

      const timeUntilRun = nextRun.getTime() - now.getTime()

      const timeoutId = setTimeout(async () => {
        try {
          await this.executeWeeklyReplenishment()
        } catch (error) {
          console.error('Weekly replenishment job failed:', error)
        } finally {
          scheduleNext() // Schedule next run
        }
      }, timeUntilRun)

      this.scheduledJobs.set('weekly', timeoutId)
    }

    scheduleNext()
  }

  /**
   * Schedule monthly replenishment job
   */
  private scheduleMonthlyJob(): void {
    const scheduleNext = () => {
      if (!this.isRunning) return

      const now = new Date()
      const targetDate = this.config.schedulingRules.monthlyRunDate
      
      let nextRun = new Date(now.getFullYear(), now.getMonth(), targetDate, 4, 0, 0, 0) // 4 AM
      
      // If the date has already passed this month, schedule for next month
      if (nextRun <= now) {
        nextRun = new Date(now.getFullYear(), now.getMonth() + 1, targetDate, 4, 0, 0, 0)
      }

      const timeUntilRun = nextRun.getTime() - now.getTime()

      const timeoutId = setTimeout(async () => {
        try {
          await this.executeMonthlyReplenishment()
        } catch (error) {
          console.error('Monthly replenishment job failed:', error)
        } finally {
          scheduleNext() // Schedule next run
        }
      }, timeUntilRun)

      this.scheduledJobs.set('monthly', timeoutId)
    }

    scheduleNext()
  }

  /**
   * Execute nightly replenishment cycle
   */
  async executeNightlyReplenishment(): Promise<ScheduledJobResult> {
    const startTime = new Date()
    const jobId = `nightly_${startTime.getTime()}`

    console.log(`Starting nightly replenishment job ${jobId}`)

    try {
      // Fetch external factors for ML forecasting
      const externalFactors = await this.gatherExternalFactors()

      // Get all active stores and products
      const stores = await this.fetchActiveStores()
      const products = await this.fetchActiveProducts()

      let storesProcessed = 0
      let productsAnalyzed = 0
      let ordersGenerated = 0
      let totalCost = 0
      let forecastsGenerated = 0
      let totalConfidence = 0
      const errors: Array<{ store_id: string; product_id?: string; error_message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }> = []

      // Process each store
      for (const store of stores) {
        try {
          const inventoryLevels = await this.fetchInventoryLevels(store.store_id)
          const usageHistory = await this.fetchUsageHistory(store.store_id, 90) // 90 days of history

          const replenishmentRequests = await this.replenishmentEngine.generateReplenishmentRequests(
            store,
            products,
            inventoryLevels,
            usageHistory,
            externalFactors
          )

          if (replenishmentRequests.length > 0) {
            const orderIds = await this.replenishmentEngine.createSystemReplenishmentOrders(replenishmentRequests)
            
            ordersGenerated += orderIds.length
            totalCost += replenishmentRequests.reduce((sum, req) => sum + req.calculated_cost, 0)

            // Track ML forecasting performance
            replenishmentRequests.forEach(req => {
              if (req.ml_forecast) {
                forecastsGenerated++
                totalConfidence += req.ml_forecast.confidence
              }
            })
          }

          productsAnalyzed += products.length
          storesProcessed++

        } catch (error) {
          errors.push({
            store_id: store.store_id,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'MEDIUM'
          })
          console.error(`Error processing store ${store.store_id}:`, error)
        }
      }

      const averageConfidence = forecastsGenerated > 0 ? totalConfidence / forecastsGenerated : 0

      const result: ScheduledJobResult = {
        job_id: jobId,
        job_type: 'NIGHTLY',
        executed_at: startTime,
        stores_processed: storesProcessed,
        products_analyzed: productsAnalyzed,
        orders_generated: ordersGenerated,
        total_cost: totalCost,
        success_rate: storesProcessed > 0 ? (storesProcessed - errors.length) / storesProcessed : 0,
        errors,
        ml_performance: {
          forecasts_generated: forecastsGenerated,
          average_confidence: averageConfidence,
          model_accuracy: 0.85 // Would be calculated from historical accuracy
        }
      }

      console.log(`Completed nightly replenishment job ${jobId}:`, {
        storesProcessed,
        ordersGenerated,
        totalCost: `$${totalCost.toFixed(2)}`,
        averageConfidence: `${(averageConfidence * 100).toFixed(1)}%`
      })

      return result

    } catch (error) {
      console.error(`Nightly replenishment job ${jobId} failed:`, error)
      throw error
    }
  }

  /**
   * Execute weekly replenishment cycle (more comprehensive analysis)
   */
  async executeWeeklyReplenishment(): Promise<ScheduledJobResult> {
    const startTime = new Date()
    const jobId = `weekly_${startTime.getTime()}`

    console.log(`Starting weekly replenishment job ${jobId}`)

    // Weekly jobs perform more comprehensive analysis:
    // - Review seasonal patterns
    // - Analyze vendor performance
    // - Update forecasting models
    // - Generate bulk purchase recommendations

    // For now, delegate to nightly logic but could be enhanced
    return await this.executeNightlyReplenishment()
  }

  /**
   * Execute monthly replenishment cycle (strategic planning)
   */
  async executeMonthlyReplenishment(): Promise<ScheduledJobResult> {
    const startTime = new Date()
    const jobId = `monthly_${startTime.getTime()}`

    console.log(`Starting monthly replenishment job ${jobId}`)

    // Monthly jobs perform strategic analysis:
    // - Review and retrain ML models
    // - Analyze seasonal trends
    // - Generate vendor performance reports
    // - Plan for upcoming seasonal demands

    // For now, delegate to nightly logic but could be enhanced
    return await this.executeNightlyReplenishment()
  }

  /**
   * Handle event-driven replenishment triggers
   */
  async processTrigger(trigger: ReplenishmentTrigger): Promise<ScheduledJobResult> {
    const startTime = new Date()
    const jobId = `trigger_${trigger.trigger_type}_${startTime.getTime()}`

    console.log(`Processing replenishment trigger ${trigger.trigger_id} of type ${trigger.trigger_type}`)

    try {
      const externalFactors = await this.gatherExternalFactors()
      
      // Process only the affected stores and products
      const stores = await this.fetchStores(trigger.store_ids)
      const products = trigger.product_ids 
        ? await this.fetchProducts(trigger.product_ids)
        : await this.fetchActiveProducts()

      let storesProcessed = 0
      let ordersGenerated = 0
      let totalCost = 0
      const errors: Array<{ store_id: string; product_id?: string; error_message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }> = []

      for (const store of stores) {
        try {
          const inventoryLevels = await this.fetchInventoryLevels(store.store_id)
          const usageHistory = await this.fetchUsageHistory(store.store_id, 30) // Shorter history for urgent triggers

          // Apply trigger-specific adjustments to external factors
          const adjustedExternalFactors = this.applyTriggerAdjustments(externalFactors, trigger)

          const replenishmentRequests = await this.replenishmentEngine.generateReplenishmentRequests(
            store,
            products,
            inventoryLevels,
            usageHistory,
            adjustedExternalFactors
          )

          if (replenishmentRequests.length > 0) {
            const orderIds = await this.replenishmentEngine.createSystemReplenishmentOrders(replenishmentRequests)
            ordersGenerated += orderIds.length
            totalCost += replenishmentRequests.reduce((sum, req) => sum + req.calculated_cost, 0)
          }

          storesProcessed++
        } catch (error) {
          errors.push({
            store_id: store.store_id,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            severity: trigger.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM'
          })
        }
      }

      // Mark trigger as processed
      await this.markTriggerProcessed(trigger.trigger_id)

      return {
        job_id: jobId,
        job_type: 'EVENT_DRIVEN',
        executed_at: startTime,
        stores_processed: storesProcessed,
        products_analyzed: products.length,
        orders_generated: ordersGenerated,
        total_cost: totalCost,
        success_rate: storesProcessed > 0 ? (storesProcessed - errors.length) / storesProcessed : 0,
        errors,
        ml_performance: {
          forecasts_generated: 0, // Event-driven triggers use simpler logic
          average_confidence: 0.7,
          model_accuracy: 0.8
        }
      }

    } catch (error) {
      console.error(`Event-driven replenishment job ${jobId} failed:`, error)
      throw error
    }
  }

  /**
   * Gather external factors for ML forecasting
   */
  private async gatherExternalFactors(): Promise<ExternalFactors> {
    const factors: ExternalFactors = {
      weather: {
        temperature: 70,
        precipitation: 0,
        seasonalEvent: ''
      },
      holidays: [],
      promotions: [],
      events: []
    }

    try {
      // Weather integration
      if (this.config.weatherIntegration.enabled) {
        factors.weather = await this.fetchWeatherData()
      }

      // Holiday calendar
      factors.holidays = await this.fetchHolidayCalendar()

      // Active promotions
      if (this.config.promotionIntegration.enabled) {
        factors.promotions = await this.fetchActivePromotions()
      }

      // Store events
      factors.events = await this.fetchStoreEvents()

    } catch (error) {
      console.warn('Failed to gather some external factors:', error)
    }

    return factors
  }

  // Helper methods (placeholder implementations)
  
  private getDayNumber(day: string): number {
    const days = {
      'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
      'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    }
    return days[day as keyof typeof days] || 1
  }

  private async fetchActiveStores(): Promise<Store[]> {
    // Placeholder - would fetch from database
    return []
  }

  private async fetchStores(storeIds: string[]): Promise<Store[]> {
    // Placeholder - would fetch specific stores from database
    return []
  }

  private async fetchActiveProducts(): Promise<Product[]> {
    // Placeholder - would fetch from database
    return []
  }

  private async fetchProducts(productIds: string[]): Promise<Product[]> {
    // Placeholder - would fetch specific products from database
    return []
  }

  private async fetchInventoryLevels(storeId: string): Promise<any[]> {
    // Placeholder - would fetch from database
    return []
  }

  private async fetchUsageHistory(storeId: string, days: number): Promise<any[]> {
    // Placeholder - would fetch from database
    return []
  }

  private async fetchWeatherData(): Promise<any> {
    // Placeholder - would integrate with weather API
    return {
      temperature: 70,
      precipitation: 0,
      seasonalEvent: ''
    }
  }

  private async fetchHolidayCalendar(): Promise<string[]> {
    // Placeholder - would fetch holiday dates
    return []
  }

  private async fetchActivePromotions(): Promise<any[]> {
    // Placeholder - would fetch from promotions system
    return []
  }

  private async fetchStoreEvents(): Promise<any[]> {
    // Placeholder - would fetch from events system
    return []
  }

  private applyTriggerAdjustments(factors: ExternalFactors, trigger: ReplenishmentTrigger): ExternalFactors {
    const adjusted = { ...factors }

    switch (trigger.trigger_type) {
      case 'WEATHER_EVENT':
        if (trigger.trigger_data.eventType === 'storm') {
          adjusted.weather.seasonalEvent = 'storm'
          adjusted.weather.precipitation = 1.0
        }
        break
      
      case 'PROMOTION_LAUNCH':
        // Add promotion impact
        break
      
      default:
        break
    }

    return adjusted
  }

  private async markTriggerProcessed(triggerId: string): Promise<void> {
    // Placeholder - would update database
    console.log(`Marked trigger ${triggerId} as processed`)
  }
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  replenishmentEngine: DEFAULT_REPLENISHMENT_CONFIG,
  schedulingRules: {
    nightlyRunTime: "02:00",
    weeklyRunDay: 'MONDAY',
    monthlyRunDate: 1,
    emergencyThreshold: 4 // 4 hours before stockout
  },
  weatherIntegration: {
    enabled: true,
    lookAheadDays: 7
  },
  promotionIntegration: {
    enabled: true,
    bufferDays: 3
  }
}

/**
 * Create and configure replenishment scheduler
 */
export function createReplenishmentScheduler(config?: Partial<SchedulerConfig>): ReplenishmentScheduler {
  const fullConfig = { ...DEFAULT_SCHEDULER_CONFIG, ...config }
  return new ReplenishmentScheduler(fullConfig)
}