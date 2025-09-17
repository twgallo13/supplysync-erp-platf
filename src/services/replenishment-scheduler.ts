/**
 * Replenishment Scheduler Service
 * Manages automated replenishment cycles and job scheduling
 */

import { ReplenishmentEngine, ReplenishmentConfig, UsageHistory, InventoryLevel } from './replenishment-engine'
import { VendorSelectionService } from './vendor-selection'
import { Product, Store, ReplenishmentRequest } from '@/types'

export interface ReplenishmentSchedule {
  schedule_id: string
  store_id: string
  schedule_type: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  schedule_time: string // HH:MM format
  is_active: boolean
  last_run: string | null
  next_run: string
  created_at: string
}

export interface ReplenishmentJob {
  job_id: string
  schedule_id: string
  store_id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  started_at: string
  completed_at: string | null
  products_analyzed: number
  orders_created: number
  total_cost: number
  error_message: string | null
}

export interface ReplenishmentAlert {
  alert_id: string
  alert_type: 'STOCKOUT_RISK' | 'VENDOR_ISSUE' | 'COST_VARIANCE' | 'FORECAST_ACCURACY'
  store_id: string
  product_id?: string
  vendor_id?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  created_at: string
  acknowledged: boolean
}

/**
 * Service for managing automated replenishment scheduling and execution
 */
export class ReplenishmentScheduler {
  private engine: ReplenishmentEngine
  private vendorService: VendorSelectionService
  
  constructor(config: ReplenishmentConfig) {
    this.engine = new ReplenishmentEngine(config)
    this.vendorService = new VendorSelectionService()
  }

  /**
   * Execute replenishment analysis for a specific store
   */
  async executeReplenishmentJob(
    store: Store,
    scheduleId: string
  ): Promise<ReplenishmentJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date().toISOString()

    const job: ReplenishmentJob = {
      job_id: jobId,
      schedule_id: scheduleId,
      store_id: store.store_id,
      status: 'RUNNING',
      started_at: startTime,
      completed_at: null,
      products_analyzed: 0,
      orders_created: 0,
      total_cost: 0,
      error_message: null
    }

    try {
      // Load required data
      const products = await this.loadActiveProducts(store.store_id)
      const inventoryLevels = await this.loadInventoryLevels(store.store_id)
      const usageHistory = await this.loadUsageHistory(store.store_id)

      job.products_analyzed = products.length

      // Generate replenishment requests
      const replenishmentRequests = await this.engine.generateReplenishmentRequests(
        store,
        products,
        inventoryLevels,
        usageHistory
      )

      if (replenishmentRequests.length > 0) {
        // Create system-initiated orders
        const orderIds = await this.engine.createSystemReplenishmentOrders(replenishmentRequests)
        
        job.orders_created = orderIds.length
        job.total_cost = replenishmentRequests.reduce((sum, req) => sum + req.calculated_cost, 0)

        // Generate alerts for high-priority items
        await this.generateReplenishmentAlerts(replenishmentRequests, store.store_id)
      }

      job.status = 'COMPLETED'
      job.completed_at = new Date().toISOString()

    } catch (error) {
      job.status = 'FAILED'
      job.error_message = error instanceof Error ? error.message : 'Unknown error'
      job.completed_at = new Date().toISOString()
    }

    // Log job completion
    await this.logReplenishmentJob(job)

    return job
  }

  /**
   * Create or update replenishment schedules for stores
   */
  async createReplenishmentSchedule(
    storeId: string,
    scheduleType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    scheduleTime: string
  ): Promise<ReplenishmentSchedule> {
    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const schedule: ReplenishmentSchedule = {
      schedule_id: scheduleId,
      store_id: storeId,
      schedule_type: scheduleType,
      schedule_time: scheduleTime,
      is_active: true,
      last_run: null,
      next_run: this.calculateNextRun(scheduleType, scheduleTime),
      created_at: new Date().toISOString()
    }

    // In real implementation, this would save to database
    console.log(`Created replenishment schedule ${scheduleId} for store ${storeId}`)
    
    return schedule
  }

  /**
   * Calculate next run time based on schedule type and time
   */
  private calculateNextRun(scheduleType: string, scheduleTime: string): string {
    const now = new Date()
    const [hours, minutes] = scheduleTime.split(':').map(Number)
    
    let nextRun = new Date()
    nextRun.setHours(hours, minutes, 0, 0)

    switch (scheduleType) {
      case 'DAILY':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break
      case 'WEEKLY':
        // Run every Monday at scheduled time
        const daysUntilMonday = (1 - nextRun.getDay() + 7) % 7
        nextRun.setDate(nextRun.getDate() + daysUntilMonday)
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7)
        }
        break
      case 'MONTHLY':
        // Run on first day of month at scheduled time
        nextRun.setDate(1)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
    }

    return nextRun.toISOString()
  }

  /**
   * Generate alerts for critical replenishment situations
   */
  private async generateReplenishmentAlerts(
    requests: ReplenishmentRequest[],
    storeId: string
  ): Promise<ReplenishmentAlert[]> {
    const alerts: ReplenishmentAlert[] = []

    for (const request of requests) {
      if (request.priority === 'HIGH') {
        alerts.push({
          alert_id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          alert_type: 'STOCKOUT_RISK',
          store_id: storeId,
          product_id: request.product_id,
          severity: 'HIGH',
          message: `Product ${request.product_id} is critically low (${request.current_quantity} units, ROP: ${request.reorder_point})`,
          created_at: new Date().toISOString(),
          acknowledged: false
        })
      }

      // Check for cost variances
      if (request.calculated_cost > 1000) {
        alerts.push({
          alert_id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          alert_type: 'COST_VARIANCE',
          store_id: storeId,
          product_id: request.product_id,
          vendor_id: request.suggested_vendor_id,
          severity: 'MEDIUM',
          message: `High-cost replenishment order: $${request.calculated_cost.toFixed(2)} for ${request.target_quantity} units`,
          created_at: new Date().toISOString(),
          acknowledged: false
        })
      }
    }

    // In real implementation, would save alerts to database and send notifications
    if (alerts.length > 0) {
      console.log(`Generated ${alerts.length} replenishment alerts for store ${storeId}`)
    }

    return alerts
  }

  /**
   * Load active products for a store (mock implementation)
   */
  private async loadActiveProducts(storeId: string): Promise<Product[]> {
    // Mock data - in real implementation, would query database
    return [
      {
        product_id: 'prod_paper_towels',
        sku: 'PT-001',
        display_name: 'Paper Towels, 12-pack',
        description: 'Absorbent paper towels for cleaning',
        category: 'Cleaning Supplies',
        pack_quantity: 12,
        requires_dm_approval: false,
        is_active: true,
        tags: ['cleaning', 'paper'],
        supplyDurationDays: 30,
        vendors: [
          {
            vendor_id: 'ven_costco',
            vendor_sku: 'CO-PT-001',
            vendor_name: 'Costco Wholesale',
            cost_per_item: 24.99,
            lead_time_days: 2,
            is_preferred: true
          },
          {
            vendor_id: 'ven_amazon',
            vendor_sku: 'AMZ-PT-001', 
            vendor_name: 'Amazon Business',
            cost_per_item: 27.50,
            lead_time_days: 1,
            is_preferred: false
          }
        ]
      }
    ]
  }

  /**
   * Load current inventory levels (mock implementation)
   */
  private async loadInventoryLevels(storeId: string): Promise<InventoryLevel[]> {
    // Mock data - in real implementation, would query inventory system
    return [
      {
        product_id: 'prod_paper_towels',
        store_id: storeId,
        on_hand_quantity: 8,
        reserved_quantity: 2,
        in_transit_quantity: 0,  
        last_updated: new Date().toISOString()
      }
    ]
  }

  /**
   * Load usage history for forecasting (mock implementation)
   */
  private async loadUsageHistory(storeId: string): Promise<UsageHistory[]> {
    // Mock data - in real implementation, would query usage tracking system
    const history: UsageHistory[] = []
    const now = new Date()

    // Generate 90 days of mock usage data
    for (let i = 0; i < 90; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      history.push({
        product_id: 'prod_paper_towels',
        store_id: storeId,
        usage_date: date.toISOString().split('T')[0],
        quantity_used: Math.floor(Math.random() * 3) + 1, // 1-3 units per day
        is_seasonal: false
      })
    }

    return history
  }

  /**
   * Log replenishment job results (mock implementation)
   */
  private async logReplenishmentJob(job: ReplenishmentJob): Promise<void> {
    // In real implementation, would save to database and update metrics
    console.log(`Replenishment job ${job.job_id} completed:`, {
      status: job.status,
      products_analyzed: job.products_analyzed,
      orders_created: job.orders_created,
      total_cost: job.total_cost,
      duration: job.completed_at 
        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        : null
    })
  }

  /**
   * Get replenishment job history for a store
   */
  async getReplenishmentHistory(
    storeId: string,
    limit: number = 50
  ): Promise<ReplenishmentJob[]> {
    // Mock implementation - would query database
    return []
  }

  /**
   * Get active alerts for a store
   */
  async getActiveAlerts(storeId: string): Promise<ReplenishmentAlert[]> {
    // Mock implementation - would query database
    return []
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    // Mock implementation - would update database
    console.log(`Alert ${alertId} acknowledged by user ${userId}`)
  }
}