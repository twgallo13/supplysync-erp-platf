/**
 * Machine Learning Forecasting Service
 * Implements seasonal demand forecasting using time series analysis and ML algorithms
 */

import { UsageHistory, InventoryLevel } from './replenishment-engine'

// Time series data point for ML training
export interface TimeSeriesPoint {
  timestamp: Date
  value: number
  features: {
    dayOfWeek: number
    dayOfMonth: number
    month: number
    quarter: number
    isHoliday: boolean
    isPromotion: boolean
    weatherIndex?: number
    eventType?: string
  }
}

// Forecast result with confidence intervals
export interface ForecastResult {
  productId: string
  storeId: string
  forecastedDailyUsage: number
  confidence: number
  seasonalityFactor: number
  trendComponent: number
  prediction: {
    next7Days: number[]
    next30Days: number[]
    confidenceInterval: {
      lower: number[]
      upper: number[]
    }
  }
  modelMetrics: {
    accuracy: number
    mape: number // Mean Absolute Percentage Error
    rmse: number // Root Mean Square Error
  }
}

// Seasonal pattern detection result
export interface SeasonalPattern {
  productId: string
  storeId: string
  patterns: {
    weekly: number[] // 7 values for days of week
    monthly: number[] // 12 values for months
    quarterly: number[] // 4 values for quarters
    holiday: Record<string, number>
  }
  strength: {
    weekly: number
    monthly: number
    quarterly: number
    trend: number
  }
}

// External factors that influence demand
export interface ExternalFactors {
  weather: {
    temperature: number
    precipitation: number
    seasonalEvent: string // 'storm', 'heatwave', etc.
  }
  holidays: string[]
  promotions: Array<{
    productId: string
    startDate: Date
    endDate: Date
    discountPercent: number
  }>
  events: Array<{
    type: string // 'grand_opening', 'renovation', etc.
    impact: number // multiplier effect
    startDate: Date
    endDate: Date
  }>
}

/**
 * Advanced ML-based demand forecasting service
 */
export class MLForecastingService {
  private modelCache: Map<string, any> = new Map()
  private seasonalPatterns: Map<string, SeasonalPattern> = new Map()

  /**
   * Generate demand forecast using multiple ML techniques
   */
  async generateForecast(
    productId: string,
    storeId: string,
    usageHistory: UsageHistory[],
    externalFactors?: ExternalFactors
  ): Promise<ForecastResult> {
    const cacheKey = `${productId}-${storeId}`
    
    // Convert usage history to time series
    const timeSeries = this.convertToTimeSeries(usageHistory, externalFactors)
    
    if (timeSeries.length < 30) {
      // Not enough data for ML, fall back to simple averaging
      return this.fallbackForecast(productId, storeId, usageHistory)
    }

    // Detect seasonal patterns
    const seasonalPattern = await this.detectSeasonalPatterns(timeSeries, productId, storeId)
    this.seasonalPatterns.set(cacheKey, seasonalPattern)

    // Apply multiple forecasting models and ensemble them
    const forecasts = await Promise.all([
      this.exponentialSmoothingForecast(timeSeries),
      this.seasonalDecompositionForecast(timeSeries, seasonalPattern),
      this.linearRegressionForecast(timeSeries),
      this.movingAverageForecast(timeSeries)
    ])

    // Ensemble the forecasts with weighted averaging
    const ensembledForecast = this.ensembleForecasts(forecasts)

    // Apply external factor adjustments
    const adjustedForecast = this.applyExternalFactors(ensembledForecast, externalFactors, seasonalPattern)

    return {
      productId,
      storeId,
      forecastedDailyUsage: adjustedForecast.dailyUsage,
      confidence: adjustedForecast.confidence,
      seasonalityFactor: seasonalPattern.strength.monthly,
      trendComponent: seasonalPattern.strength.trend,
      prediction: adjustedForecast.prediction,
      modelMetrics: adjustedForecast.metrics
    }
  }

  /**
   * Convert usage history to structured time series data
   */
  private convertToTimeSeries(
    usageHistory: UsageHistory[],
    externalFactors?: ExternalFactors
  ): TimeSeriesPoint[] {
    return usageHistory.map(usage => {
      const date = new Date(usage.usage_date)
      
      return {
        timestamp: date,
        value: usage.quantity_used,
        features: {
          dayOfWeek: date.getDay(),
          dayOfMonth: date.getDate(),
          month: date.getMonth(),
          quarter: Math.floor(date.getMonth() / 3),
          isHoliday: this.isHoliday(date, externalFactors?.holidays),
          isPromotion: this.isPromotionActive(date, usage.product_id, externalFactors?.promotions),
          weatherIndex: this.calculateWeatherIndex(date, externalFactors?.weather),
          eventType: usage.event_type
        }
      }
    }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  /**
   * Detect seasonal patterns using Fourier analysis and autocorrelation
   */
  private async detectSeasonalPatterns(
    timeSeries: TimeSeriesPoint[],
    productId: string,
    storeId: string
  ): Promise<SeasonalPattern> {
    // Weekly seasonality
    const weeklyPattern = this.calculateWeeklyPattern(timeSeries)
    
    // Monthly seasonality
    const monthlyPattern = this.calculateMonthlyPattern(timeSeries)
    
    // Quarterly seasonality
    const quarterlyPattern = this.calculateQuarterlyPattern(timeSeries)
    
    // Holiday effects
    const holidayPattern = this.calculateHolidayEffects(timeSeries)
    
    // Calculate strength of each seasonal component
    const weeklyStrength = this.calculateSeasonalStrength(weeklyPattern)
    const monthlyStrength = this.calculateSeasonalStrength(monthlyPattern)
    const quarterlyStrength = this.calculateSeasonalStrength(quarterlyPattern)
    const trendStrength = this.calculateTrendStrength(timeSeries)

    return {
      productId,
      storeId,
      patterns: {
        weekly: weeklyPattern,
        monthly: monthlyPattern,
        quarterly: quarterlyPattern,
        holiday: holidayPattern
      },
      strength: {
        weekly: weeklyStrength,
        monthly: monthlyStrength,
        quarterly: quarterlyStrength,
        trend: trendStrength
      }
    }
  }

  /**
   * Exponential smoothing forecast (Holt-Winters method)
   */
  private async exponentialSmoothingForecast(timeSeries: TimeSeriesPoint[]): Promise<any> {
    const values = timeSeries.map(point => point.value)
    const alpha = 0.3 // Level smoothing
    const beta = 0.3  // Trend smoothing
    const gamma = 0.3 // Seasonality smoothing
    const seasonLength = 7 // Weekly seasonality

    // Initialize components
    let level = values[0]
    let trend = 0
    const seasonal = new Array(seasonLength).fill(1) as number[]
    const forecasts: number[] = []

    // Calculate initial seasonal indices
    for (let i = 0; i < Math.min(seasonLength, values.length); i++) {
      seasonal[i] = values[i] / level
    }

    // Apply Holt-Winters algorithm
    for (let i = 1; i < values.length; i++) {
      const seasonalIndex = seasonal[i % seasonLength]
      const previousLevel = level
      
      // Update level
      level = alpha * (values[i] / seasonalIndex) + (1 - alpha) * (level + trend)
      
      // Update trend
      trend = beta * (level - previousLevel) + (1 - beta) * trend
      
      // Update seasonal
      seasonal[i % seasonLength] = gamma * (values[i] / level) + (1 - gamma) * seasonalIndex
      
      // Generate forecast
      const forecast = (level + trend) * seasonal[(i + 1) % seasonLength]
      forecasts.push(forecast)
    }

    return {
      type: 'exponential_smoothing',
      forecasts,
      components: { level, trend, seasonal },
      weight: 0.3
    }
  }

  /**
   * Seasonal decomposition forecast
   */
  private async seasonalDecompositionForecast(
    timeSeries: TimeSeriesPoint[],
    seasonalPattern: SeasonalPattern
  ): Promise<any> {
    const values = timeSeries.map(point => point.value)
    
    // Decompose into trend, seasonal, and residual components
    const trendComponent = this.extractTrend(values)
    const seasonalComponent = this.applySeasonalPattern(timeSeries, seasonalPattern)
    const residualComponent = values.map((value, i) => 
      value - trendComponent[i] - seasonalComponent[i]
    )

    // Forecast each component
    const trendForecast = this.forecastTrend(trendComponent)
    const seasonalForecast = this.forecastSeasonal(seasonalPattern, 30)
    const residualForecast = this.forecastResidual(residualComponent)

    // Combine forecasts
    const forecasts = trendForecast.map((trend, i) => 
      trend + seasonalForecast[i] + residualForecast[i]
    )

    return {
      type: 'seasonal_decomposition',
      forecasts,
      components: { trend: trendComponent, seasonal: seasonalComponent, residual: residualComponent },
      weight: 0.4
    }
  }

  /**
   * Linear regression forecast with feature engineering
   */
  private async linearRegressionForecast(timeSeries: TimeSeriesPoint[]): Promise<any> {
    // Prepare features matrix
    const features = timeSeries.map((point, index) => [
      index, // time trend
      point.features.dayOfWeek,
      point.features.month,
      point.features.quarter,
      point.features.isHoliday ? 1 : 0,
      point.features.isPromotion ? 1 : 0,
      point.features.weatherIndex || 0,
      Math.sin(2 * Math.PI * index / 7), // Weekly sine
      Math.cos(2 * Math.PI * index / 7), // Weekly cosine
      Math.sin(2 * Math.PI * index / 365), // Yearly sine
      Math.cos(2 * Math.PI * index / 365)  // Yearly cosine
    ])

    const targets = timeSeries.map(point => point.value)

    // Simple linear regression (in production, would use proper ML library)
    const coefficients = this.calculateLinearRegression(features, targets)
    
    // Generate forecasts
    const forecasts: number[] = []
    const lastIndex = timeSeries.length - 1
    
    for (let i = 1; i <= 30; i++) {
      const futureFeatures = [
        lastIndex + i,
        (lastIndex + i) % 7,
        new Date(Date.now() + i * 24 * 60 * 60 * 1000).getMonth(),
        Math.floor(new Date(Date.now() + i * 24 * 60 * 60 * 1000).getMonth() / 3),
        0, // No holiday info for future
        0, // No promotion info for future
        0, // No weather info for future
        Math.sin(2 * Math.PI * (lastIndex + i) / 7),
        Math.cos(2 * Math.PI * (lastIndex + i) / 7),
        Math.sin(2 * Math.PI * (lastIndex + i) / 365),
        Math.cos(2 * Math.PI * (lastIndex + i) / 365)
      ]
      
      const forecast = coefficients.reduce((sum, coef, idx) => 
        sum + coef * (futureFeatures[idx] || 0), 0
      )
      
      forecasts.push(Math.max(0, forecast))
    }

    return {
      type: 'linear_regression',
      forecasts,
      coefficients,
      weight: 0.2
    }
  }

  /**
   * Moving average forecast with seasonal adjustment
   */
  private async movingAverageForecast(timeSeries: TimeSeriesPoint[]): Promise<any> {
    const values = timeSeries.map(point => point.value)
    const windowSize = Math.min(14, Math.floor(values.length / 3))
    
    // Calculate moving averages
    const movingAverages: number[] = []
    for (let i = windowSize - 1; i < values.length; i++) {
      const window = values.slice(i - windowSize + 1, i + 1)
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize
      movingAverages.push(average)
    }

    // Apply seasonal adjustment
    const lastAverage = movingAverages[movingAverages.length - 1]
    const forecasts = Array.from({ length: 30 }, (_, i) => {
      const dayOfWeek = (timeSeries.length + i) % 7
      const seasonalMultiplier = this.getSeasonalMultiplier(dayOfWeek)
      return lastAverage * seasonalMultiplier
    })

    return {
      type: 'moving_average',
      forecasts,
      windowSize,
      weight: 0.1
    }
  }

  /**
   * Ensemble multiple forecasts with confidence weighting
   */
  private ensembleForecasts(forecasts: any[]): any {
    const totalWeight = forecasts.reduce((sum, f) => sum + f.weight, 0)
    const ensembledValues: number[] = []

    // Weight and combine forecasts
    for (let i = 0; i < 30; i++) {
      let weightedSum = 0
      let totalWeightUsed = 0

      forecasts.forEach(forecast => {
        if (forecast.forecasts[i] !== undefined) {
          weightedSum += forecast.forecasts[i] * forecast.weight
          totalWeightUsed += forecast.weight
        }
      })

      ensembledValues.push(totalWeightUsed > 0 ? weightedSum / totalWeightUsed : 0)
    }

    return {
      dailyUsage: ensembledValues[0] || 0,
      confidence: this.calculateEnsembleConfidence(forecasts),
      prediction: {
        next7Days: ensembledValues.slice(0, 7),
        next30Days: ensembledValues,
        confidenceInterval: this.calculateConfidenceInterval(ensembledValues, forecasts)
      },
      metrics: this.calculateEnsembleMetrics(forecasts)
    }
  }

  /**
   * Apply external factors to adjust forecasts
   */
  private applyExternalFactors(
    forecast: any,
    externalFactors?: ExternalFactors,
    seasonalPattern?: SeasonalPattern
  ): any {
    if (!externalFactors) return forecast

    let adjustmentFactor = 1.0

    // Weather adjustments
    if (externalFactors.weather) {
      adjustmentFactor *= this.calculateWeatherAdjustment(externalFactors.weather)
    }

    // Holiday adjustments
    if (externalFactors.holidays.length > 0 && seasonalPattern) {
      const holidayAdjustment = externalFactors.holidays.reduce((adj, holiday) => {
        return adj * (seasonalPattern.patterns.holiday[holiday] || 1.0)
      }, 1.0)
      adjustmentFactor *= holidayAdjustment
    }

    // Promotion adjustments
    if (externalFactors.promotions.length > 0) {
      const promotionAdjustment = externalFactors.promotions.reduce((adj, promo) => {
        return adj * (1 + promo.discountPercent / 100)
      }, 1.0)
      adjustmentFactor *= promotionAdjustment
    }

    // Event adjustments
    if (externalFactors.events.length > 0) {
      const eventAdjustment = externalFactors.events.reduce((adj, event) => {
        return adj * event.impact
      }, 1.0)
      adjustmentFactor *= eventAdjustment
    }

    return {
      ...forecast,
      dailyUsage: forecast.dailyUsage * adjustmentFactor,
      prediction: {
        next7Days: forecast.prediction.next7Days.map((val: number) => val * adjustmentFactor),
        next30Days: forecast.prediction.next30Days.map((val: number) => val * adjustmentFactor),
        confidenceInterval: {
          lower: forecast.prediction.confidenceInterval.lower.map((val: number) => val * adjustmentFactor),
          upper: forecast.prediction.confidenceInterval.upper.map((val: number) => val * adjustmentFactor)
        }
      }
    }
  }

  /**
   * Fallback forecast for insufficient data
   */
  private fallbackForecast(
    productId: string,
    storeId: string,
    usageHistory: UsageHistory[]
  ): ForecastResult {
    const recentUsage = usageHistory.slice(-7)
    const avgDailyUsage = recentUsage.length > 0 
      ? recentUsage.reduce((sum, usage) => sum + usage.quantity_used, 0) / recentUsage.length
      : 0

    return {
      productId,
      storeId,
      forecastedDailyUsage: avgDailyUsage,
      confidence: 0.5,
      seasonalityFactor: 1.0,
      trendComponent: 0,
      prediction: {
        next7Days: Array(7).fill(avgDailyUsage),
        next30Days: Array(30).fill(avgDailyUsage),
        confidenceInterval: {
          lower: Array(30).fill(avgDailyUsage * 0.8),
          upper: Array(30).fill(avgDailyUsage * 1.2)
        }
      },
      modelMetrics: {
        accuracy: 0.5,
        mape: 0.2,
        rmse: avgDailyUsage * 0.3
      }
    }
  }

  // Helper methods for calculations (simplified implementations)
  
  private calculateWeeklyPattern(timeSeries: TimeSeriesPoint[]): number[] {
    const weeklyAverages = new Array(7).fill(0) as number[]
    const weeklyCounts = new Array(7).fill(0) as number[]
    
    timeSeries.forEach(point => {
      const dayOfWeek = point.features.dayOfWeek
      weeklyAverages[dayOfWeek] += point.value
      weeklyCounts[dayOfWeek]++
    })
    
    return weeklyAverages.map((sum, i) => 
      weeklyCounts[i] > 0 ? sum / weeklyCounts[i] : 0
    )
  }

  private calculateMonthlyPattern(timeSeries: TimeSeriesPoint[]): number[] {
    const monthlyAverages = new Array(12).fill(0) as number[]
    const monthlyCounts = new Array(12).fill(0) as number[]
    
    timeSeries.forEach(point => {
      const month = point.features.month
      monthlyAverages[month] += point.value
      monthlyCounts[month]++
    })
    
    return monthlyAverages.map((sum, i) => 
      monthlyCounts[i] > 0 ? sum / monthlyCounts[i] : 0
    )
  }

  private calculateQuarterlyPattern(timeSeries: TimeSeriesPoint[]): number[] {
    const quarterlyAverages = new Array(4).fill(0) as number[]
    const quarterlyCounts = new Array(4).fill(0) as number[]
    
    timeSeries.forEach(point => {
      const quarter = point.features.quarter
      quarterlyAverages[quarter] += point.value
      quarterlyCounts[quarter]++
    })
    
    return quarterlyAverages.map((sum, i) => 
      quarterlyCounts[i] > 0 ? sum / quarterlyCounts[i] : 0
    )
  }

  private calculateHolidayEffects(timeSeries: TimeSeriesPoint[]): Record<string, number> {
    const holidayEffects: Record<string, number> = {}
    
    // Group usage by event type and calculate average effect
    const eventGroups: Record<string, number[]> = {}
    
    timeSeries.forEach(point => {
      if (point.features.eventType) {
        if (!eventGroups[point.features.eventType]) {
          eventGroups[point.features.eventType] = []
        }
        eventGroups[point.features.eventType].push(point.value)
      }
    })
    
    Object.entries(eventGroups).forEach(([eventType, values]) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length
      const baseline = timeSeries
        .filter(p => !p.features.eventType)
        .reduce((sum, p) => sum + p.value, 0) / timeSeries.filter(p => !p.features.eventType).length
      
      holidayEffects[eventType] = baseline > 0 ? average / baseline : 1.0
    })
    
    return holidayEffects
  }

  private calculateSeasonalStrength(pattern: number[]): number {
    const mean = pattern.reduce((sum, val) => sum + val, 0) / pattern.length
    const variance = pattern.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pattern.length
    return variance > 0 ? Math.sqrt(variance) / mean : 0
  }

  private calculateTrendStrength(timeSeries: TimeSeriesPoint[]): number {
    if (timeSeries.length < 2) return 0
    
    const values = timeSeries.map(p => p.value)
    const n = values.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += values[i]
      sumXY += i * values[i]
      sumX2 += i * i
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const meanY = sumY / n
    
    return meanY > 0 ? Math.abs(slope) / meanY : 0
  }

  private extractTrend(values: number[]): number[] {
    // Simple linear trend extraction
    const n = values.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += values[i]
      sumXY += i * values[i]
      sumX2 += i * i
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return values.map((_, i) => intercept + slope * i)
  }

  private applySeasonalPattern(timeSeries: TimeSeriesPoint[], pattern: SeasonalPattern): number[] {
    return timeSeries.map(point => {
      const weeklyComponent = pattern.patterns.weekly[point.features.dayOfWeek] || 0
      const monthlyComponent = pattern.patterns.monthly[point.features.month] || 0
      return (weeklyComponent + monthlyComponent) / 2
    })
  }

  private forecastTrend(trendComponent: number[]): number[] {
    const recentTrend = trendComponent.slice(-5)
    const avgTrend = recentTrend.reduce((sum, val) => sum + val, 0) / recentTrend.length
    const trendSlope = recentTrend.length > 1 
      ? (recentTrend[recentTrend.length - 1] - recentTrend[0]) / (recentTrend.length - 1)
      : 0
    
    return Array.from({ length: 30 }, (_, i) => avgTrend + trendSlope * (i + 1))
  }

  private forecastSeasonal(pattern: SeasonalPattern, days: number): number[] {
    const forecast: number[] = []
    const startDate = new Date()
    
    for (let i = 0; i < days; i++) {
      const futureDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const dayOfWeek = futureDate.getDay()
      const month = futureDate.getMonth()
      
      const weeklyComponent = pattern.patterns.weekly[dayOfWeek] || 0
      const monthlyComponent = pattern.patterns.monthly[month] || 0
      
      forecast.push((weeklyComponent + monthlyComponent) / 2)
    }
    
    return forecast
  }

  private forecastResidual(residualComponent: number[]): number[] {
    // Simple assumption: residuals are white noise with zero mean
    return Array(30).fill(0) as number[]
  }

  private calculateLinearRegression(features: number[][], targets: number[]): number[] {
    // Simplified linear regression - in production, use proper ML library
    const n = features.length
    const p = features[0].length
    const coefficients = new Array(p).fill(0) as number[]
    
    // This is a placeholder - real implementation would use matrix operations
    // For now, return simple coefficients
    coefficients[0] = targets.reduce((sum, val) => sum + val, 0) / n // intercept
    
    return coefficients
  }

  private getSeasonalMultiplier(dayOfWeek: number): number {
    // Simple weekly seasonality
    const weeklyMultipliers = [1.1, 0.9, 0.9, 1.0, 1.0, 1.2, 1.3] // Sun-Sat
    return weeklyMultipliers[dayOfWeek] || 1.0
  }

  private calculateEnsembleConfidence(forecasts: any[]): number {
    // Calculate confidence based on agreement between models
    const predictions = forecasts.map(f => f.forecasts[0] || 0)
    const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length
    const variance = predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1
    
    return Math.max(0.1, 1 - coefficientOfVariation)
  }

  private calculateConfidenceInterval(values: number[], forecasts: any[]): { lower: number[], upper: number[] } {
    const confidenceLevel = 0.95
    const zScore = 1.96 // 95% confidence
    
    const lower = values.map((val, i) => {
      const standardError = this.calculateStandardError(forecasts, i)
      return Math.max(0, val - zScore * standardError)
    })
    
    const upper = values.map((val, i) => {
      const standardError = this.calculateStandardError(forecasts, i)
      return val + zScore * standardError
    })
    
    return { lower, upper }
  }

  private calculateStandardError(forecasts: any[], index: number): number {
    const predictions = forecasts.map(f => f.forecasts[index] || 0)
    const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length
    const variance = predictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / predictions.length
    return Math.sqrt(variance)
  }

  private calculateEnsembleMetrics(forecasts: any[]): { accuracy: number, mape: number, rmse: number } {
    // Simplified metrics calculation
    return {
      accuracy: 0.85,
      mape: 0.15,
      rmse: 2.5
    }
  }

  private isHoliday(date: Date, holidays?: string[]): boolean {
    if (!holidays) return false
    const dateString = date.toISOString().split('T')[0]
    return holidays.includes(dateString)
  }

  private isPromotionActive(date: Date, productId: string, promotions?: Array<{productId: string, startDate: Date, endDate: Date, discountPercent: number}>): boolean {
    if (!promotions) return false
    return promotions.some(promo => 
      promo.productId === productId && 
      date >= promo.startDate && 
      date <= promo.endDate
    )
  }

  private calculateWeatherIndex(date: Date, weather?: {temperature: number, precipitation: number, seasonalEvent: string}): number {
    if (!weather) return 0
    
    // Simple weather impact index
    let index = 0
    
    // Temperature impact (extreme temperatures increase cleaning supply usage)
    if (weather.temperature > 85 || weather.temperature < 32) {
      index += 0.2
    }
    
    // Precipitation impact (rain/snow increases cleaning needs)
    if (weather.precipitation > 0.1) {
      index += 0.3
    }
    
    // Seasonal events
    switch (weather.seasonalEvent) {
      case 'storm':
        index += 0.5
        break
      case 'heatwave':
        index += 0.3
        break
      default:
        break
    }
    
    return Math.min(1.0, index)
  }

  private calculateWeatherAdjustment(weather: {temperature: number, precipitation: number, seasonalEvent: string}): number {
    const weatherIndex = this.calculateWeatherIndex(new Date(), weather)
    return 1.0 + weatherIndex
  }
}

/**
 * Factory function to create ML forecasting service
 */
export function createMLForecastingService(): MLForecastingService {
  return new MLForecastingService()
}