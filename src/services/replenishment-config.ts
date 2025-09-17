/**
 * ReplenishmentConfigService
 * 
 * Manages automated replenishment schedules with confidence thresholds
 * and approval workflows. Provides centralized configuration for the
 * entire replenishment automation system.
 */
export interface ReplenishmentScheduleConfig {
  schedule_id: string
  name: string
  description: string
  enabled: boolean
  
  // Schedule timing
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DEMAND'
  time_of_day: string // HH:MM format
  days_of_week?: number[] // 0-6, Sunday = 0
  day_of_month?: number // 1-31 for monthly schedules
  
  // Confidence & automation thresholds
  confidence_thresholds: {
    auto_approve_threshold: number // 0.0-1.0, orders above this confidence are auto-approved
    fm_review_threshold: number // Below this requires FM review
    high_confidence_threshold: number // Above this gets priority processing
  }
  
  // Approval workflow configuration
  approval_workflow: {
    auto_approve_enabled: boolean
    max_auto_approve_amount: number // Dollar limit for auto-approval
    require_dm_approval_above: number // Dollar amount requiring DM approval
    escalation_rules: {
      critical_items: boolean // Auto-escalate critical stockouts
      seasonal_items: boolean // Auto-escalate seasonal predictions
      high_cost_items: boolean // Escalate items above cost threshold
    }
  }
  
  // Product/store scope
  scope: {
    store_ids: string[] // Empty array = all stores
    product_categories: string[] // Empty array = all categories
    priority_products: string[] // High-priority product IDs
    exclude_products: string[] // Products to skip
  }
  
  // ML/AI configuration
  ml_config: {
    use_seasonal_patterns: boolean
    use_weather_data: boolean
    use_external_factors: boolean
    min_forecast_confidence: number
    lookback_days: number // Historical data window
    forecast_horizon_days: number // How far ahead to forecast
  }
  
  // Vendor selection preferences
  vendor_preferences: {
    prefer_primary_vendors: boolean
    allow_vendor_substitution: boolean
    cost_optimization_priority: number // 1-5, higher = more aggressive cost optimization
    lead_time_priority: number // 1-5, higher = prioritize faster delivery
  }
  
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
  last_run_at?: string
  next_run_at?: string
}

export interface ConfidenceReport {
  schedule_id: string
  report_date: string
  total_suggestions: number
  confidence_distribution: {
    high_confidence: number // Above high_confidence_threshold
    medium_confidence: number // Between thresholds
    low_confidence: number // Below fm_review_threshold
  }
  auto_approved_count: number
  manual_review_count: number
  average_confidence: number
  accuracy_metrics: {
    last_30_days_accuracy: number
    prediction_vs_actual_variance: number
  }
}

export interface ScheduleExecutionLog {
  execution_id: string
  schedule_id: string
  executed_at: string
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  suggestions_generated: number
  auto_approved: number
  pending_review: number
  errors?: string[]
  performance_metrics: {
    execution_time_ms: number
    ml_processing_time_ms: number
    vendor_selection_time_ms: number
  }
}

export const DEFAULT_REPLENISHMENT_SCHEDULES: ReplenishmentScheduleConfig[] = [
  {
    schedule_id: 'daily_critical',
    name: 'Daily Critical Items Monitor',
    description: 'Daily check for critical stockouts and high-priority items requiring immediate attention',
    enabled: true,
    frequency: 'DAILY',
    time_of_day: '06:00',
    
    confidence_thresholds: {
      auto_approve_threshold: 0.90,
      fm_review_threshold: 0.70,
      high_confidence_threshold: 0.85
    },
    
    approval_workflow: {
      auto_approve_enabled: true,
      max_auto_approve_amount: 500,
      require_dm_approval_above: 2000,
      escalation_rules: {
        critical_items: true,
        seasonal_items: false,
        high_cost_items: true
      }
    },
    
    scope: {
      store_ids: [],
      product_categories: ['POS Supplies', 'Cleaning Supplies'],
      priority_products: [],
      exclude_products: []
    },
    
    ml_config: {
      use_seasonal_patterns: false,
      use_weather_data: true,
      use_external_factors: false,
      min_forecast_confidence: 0.75,
      lookback_days: 14,
      forecast_horizon_days: 7
    },
    
    vendor_preferences: {
      prefer_primary_vendors: true,
      allow_vendor_substitution: false,
      cost_optimization_priority: 3,
      lead_time_priority: 5
    },
    
    created_by: 'system',
    created_at: '2024-01-01T00:00:00Z',
    updated_by: 'system',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  {
    schedule_id: 'weekly_optimization',
    name: 'Weekly Cost Optimization Review',
    description: 'Weekly comprehensive analysis optimizing for cost while maintaining service levels',
    enabled: true,
    frequency: 'WEEKLY',
    time_of_day: '05:00',
    days_of_week: [1], // Monday
    
    confidence_thresholds: {
      auto_approve_threshold: 0.80,
      fm_review_threshold: 0.60,
      high_confidence_threshold: 0.75
    },
    
    approval_workflow: {
      auto_approve_enabled: true,
      max_auto_approve_amount: 1000,
      require_dm_approval_above: 5000,
      escalation_rules: {
        critical_items: true,
        seasonal_items: true,
        high_cost_items: true
      }
    },
    
    scope: {
      store_ids: [],
      product_categories: [],
      priority_products: [],
      exclude_products: []
    },
    
    ml_config: {
      use_seasonal_patterns: true,
      use_weather_data: true,
      use_external_factors: true,
      min_forecast_confidence: 0.65,
      lookback_days: 90,
      forecast_horizon_days: 30
    },
    
    vendor_preferences: {
      prefer_primary_vendors: false,
      allow_vendor_substitution: true,
      cost_optimization_priority: 5,
      lead_time_priority: 2
    },
    
    created_by: 'system',
    created_at: '2024-01-01T00:00:00Z',
    updated_by: 'system',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  {
    schedule_id: 'monthly_seasonal',
    name: 'Monthly Seasonal Planning',
    description: 'Monthly deep analysis incorporating seasonal patterns and long-term forecasting',
    enabled: true,
    frequency: 'MONTHLY',
    time_of_day: '04:00',
    day_of_month: 1,
    
    confidence_thresholds: {
      auto_approve_threshold: 0.70,
      fm_review_threshold: 0.50,
      high_confidence_threshold: 0.65
    },
    
    approval_workflow: {
      auto_approve_enabled: false, // Monthly review requires human oversight
      max_auto_approve_amount: 0,
      require_dm_approval_above: 1000,
      escalation_rules: {
        critical_items: true,
        seasonal_items: true,
        high_cost_items: true
      }
    },
    
    scope: {
      store_ids: [],
      product_categories: [],
      priority_products: [],
      exclude_products: []
    },
    
    ml_config: {
      use_seasonal_patterns: true,
      use_weather_data: true,
      use_external_factors: true,
      min_forecast_confidence: 0.55,
      lookback_days: 365,
      forecast_horizon_days: 90
    },
    
    vendor_preferences: {
      prefer_primary_vendors: false,
      allow_vendor_substitution: true,
      cost_optimization_priority: 4,
      lead_time_priority: 3
    },
    
    created_by: 'system',
    created_at: '2024-01-01T00:00:00Z',
    updated_by: 'system',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export class ReplenishmentConfigService {
  private schedules: Map<string, ReplenishmentScheduleConfig> = new Map()
  private executionLogs: ScheduleExecutionLog[] = []
  private confidenceReports: ConfidenceReport[] = []

  constructor() {
    // Initialize with default schedules
    DEFAULT_REPLENISHMENT_SCHEDULES.forEach(schedule => {
      this.schedules.set(schedule.schedule_id, schedule)
    })
  }

  // Schedule management
  getAllSchedules(): ReplenishmentScheduleConfig[] {
    return Array.from(this.schedules.values())
  }

  getSchedule(scheduleId: string): ReplenishmentScheduleConfig | undefined {
    return this.schedules.get(scheduleId)
  }

  createSchedule(schedule: Omit<ReplenishmentScheduleConfig, 'created_at' | 'updated_at'>): ReplenishmentScheduleConfig {
    const newSchedule: ReplenishmentScheduleConfig = {
      ...schedule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    this.schedules.set(schedule.schedule_id, newSchedule)
    return newSchedule
  }

  updateSchedule(scheduleId: string, updates: Partial<ReplenishmentScheduleConfig>): ReplenishmentScheduleConfig | null {
    const existing = this.schedules.get(scheduleId)
    if (!existing) return null

    const updated: ReplenishmentScheduleConfig = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    this.schedules.set(scheduleId, updated)
    return updated
  }

  deleteSchedule(scheduleId: string): boolean {
    return this.schedules.delete(scheduleId)
  }

  enableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return false
    
    schedule.enabled = true
    schedule.updated_at = new Date().toISOString()
    return true
  }

  disableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return false
    
    schedule.enabled = false
    schedule.updated_at = new Date().toISOString()
    return true
  }

  // Execution tracking
  logExecution(log: Omit<ScheduleExecutionLog, 'execution_id' | 'executed_at'>): void {
    const executionLog: ScheduleExecutionLog = {
      ...log,
      execution_id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executed_at: new Date().toISOString()
    }
    
    this.executionLogs.push(executionLog)
    
    // Update schedule's last run time
    const schedule = this.schedules.get(log.schedule_id)
    if (schedule) {
      schedule.last_run_at = executionLog.executed_at
      schedule.next_run_at = this.calculateNextRun(schedule)
    }
    
    // Keep only last 100 execution logs per schedule
    this.executionLogs = this.executionLogs
      .filter(log => log.schedule_id === executionLog.schedule_id)
      .slice(-100)
      .concat(this.executionLogs.filter(log => log.schedule_id !== executionLog.schedule_id))
  }

  getExecutionHistory(scheduleId: string, limit: number = 50): ScheduleExecutionLog[] {
    return this.executionLogs
      .filter(log => log.schedule_id === scheduleId)
      .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
      .slice(0, limit)
  }

  // Confidence reporting
  generateConfidenceReport(scheduleId: string): ConfidenceReport {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`)
    }

    // Mock confidence data - in real implementation, this would come from actual execution data
    const report: ConfidenceReport = {
      schedule_id: scheduleId,
      report_date: new Date().toISOString(),
      total_suggestions: 45,
      confidence_distribution: {
        high_confidence: 28, // Above 0.85
        medium_confidence: 12, // 0.70-0.85
        low_confidence: 5 // Below 0.70
      },
      auto_approved_count: 22,
      manual_review_count: 23,
      average_confidence: 0.82,
      accuracy_metrics: {
        last_30_days_accuracy: 0.89,
        prediction_vs_actual_variance: 0.15
      }
    }

    this.confidenceReports.push(report)
    return report
  }

  getConfidenceReports(scheduleId?: string): ConfidenceReport[] {
    if (scheduleId) {
      return this.confidenceReports.filter(report => report.schedule_id === scheduleId)
    }
    return this.confidenceReports
  }

  // Utility methods
  private calculateNextRun(schedule: ReplenishmentScheduleConfig): string {
    const now = new Date()
    const [hours, minutes] = schedule.time_of_day.split(':').map(Number)
    
    let nextRun: Date
    
    switch (schedule.frequency) {
      case 'DAILY':
        nextRun = new Date(now)
        nextRun.setHours(hours, minutes, 0, 0)
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break
        
      case 'WEEKLY':
        const targetDay = schedule.days_of_week?.[0] || 1
        nextRun = new Date(now)
        nextRun.setHours(hours, minutes, 0, 0)
        const dayDiff = (targetDay - nextRun.getDay() + 7) % 7
        if (dayDiff === 0 && nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7)
        } else {
          nextRun.setDate(nextRun.getDate() + dayDiff)
        }
        break
        
      case 'MONTHLY':
        nextRun = new Date(now)
        nextRun.setDate(schedule.day_of_month || 1)
        nextRun.setHours(hours, minutes, 0, 0)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
        
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to tomorrow
    }
    
    return nextRun.toISOString()
  }

  // Schedule evaluation
  shouldAutoApprove(scheduleId: string, confidence: number, amount: number): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule || !schedule.approval_workflow.auto_approve_enabled) {
      return false
    }
    
    return confidence >= schedule.confidence_thresholds.auto_approve_threshold &&
           amount <= schedule.approval_workflow.max_auto_approve_amount
  }

  requiresFMReview(scheduleId: string, confidence: number): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return true
    
    return confidence < schedule.confidence_thresholds.fm_review_threshold
  }

  requiresDMApproval(scheduleId: string, amount: number): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return true
    
    return amount > schedule.approval_workflow.require_dm_approval_above
  }

  isHighConfidence(scheduleId: string, confidence: number): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) return false
    
    return confidence >= schedule.confidence_thresholds.high_confidence_threshold
  }
}

export const createReplenishmentConfigService = (): ReplenishmentConfigService => {
  return new ReplenishmentConfigService()
}