/**
 * Vendor Selection Service
 * Implements deterministic vendor selection logic: cost → lead time → preference → SLA
 */

import { Vendor, Product, Store } from '@/types'

export interface VendorPerformanceMetrics {
  vendor_id: string
  sla_compliance_rate: number // 0-1
  average_delivery_days: number
  quality_score: number // 0-1
  invoice_accuracy_rate: number // 0-1
  last_updated: string
}

export interface VendorSelectionCriteria {
  maxLeadTimeDays?: number
  requirePreferred?: boolean
  requireMinSlaCompliance?: number
  costWeight: number // 0-1, how much to weight cost vs other factors
  leadTimeWeight: number
  slaWeight: number
}

export interface VendorScore {
  vendor: Vendor
  totalScore: number
  costScore: number
  leadTimeScore: number
  preferenceScore: number
  slaScore: number
  reasoning: string
}

/**
 * Advanced vendor selection engine with performance tracking
 */
export class VendorSelectionService {
  
  /**
   * Select optimal vendor using the deterministic algorithm:
   * Primary: Lowest cost per item
   * Secondary: Shortest lead time
   * Tertiary: Preferred vendor status
   * Quaternary: SLA performance
   */
  selectOptimalVendor(
    vendors: Vendor[],
    store: Store,
    performanceMetrics: VendorPerformanceMetrics[] = [],
    criteria: VendorSelectionCriteria = this.getDefaultCriteria()
  ): VendorScore | null {
    if (vendors.length === 0) return null

    // Filter vendors based on hard requirements
    let eligibleVendors = this.filterEligibleVendors(vendors, performanceMetrics, criteria)
    
    if (eligibleVendors.length === 0) {
      // If no vendors meet criteria, fall back to all vendors
      eligibleVendors = vendors
    }

    // Calculate scores for each vendor
    const vendorScores = eligibleVendors.map(vendor => 
      this.calculateVendorScore(vendor, vendors, performanceMetrics, criteria)
    )

    // Sort by total score (descending - higher is better)
    vendorScores.sort((a, b) => b.totalScore - a.totalScore)
    
    return vendorScores[0]
  }

  /**
   * Select multiple vendors for a multi-line order to minimize total cost
   */
  selectOptimalVendorMix(
    products: Product[],
    quantities: number[],
    store: Store,
    performanceMetrics: VendorPerformanceMetrics[] = []
  ): { product_id: string; vendor: Vendor; quantity: number; cost: number }[] {
    if (products.length !== quantities.length) {
      throw new Error('Products and quantities arrays must have same length')
    }

    const selections: { product_id: string; vendor: Vendor; quantity: number; cost: number }[] = []

    // For each product, select the optimal vendor
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const quantity = quantities[i]
      
      const vendorScore = this.selectOptimalVendor(
        product.vendors,
        store,
        performanceMetrics
      )

      if (vendorScore) {
        selections.push({
          product_id: product.product_id,
          vendor: vendorScore.vendor,
          quantity,
          cost: quantity * vendorScore.vendor.cost_per_item
        })
      }
    }

    return selections
  }

  /**
   * Filter vendors based on hard requirements
   */
  private filterEligibleVendors(
    vendors: Vendor[],
    performanceMetrics: VendorPerformanceMetrics[],
    criteria: VendorSelectionCriteria
  ): Vendor[] {
    return vendors.filter(vendor => {
      // Lead time requirement
      if (criteria.maxLeadTimeDays && vendor.lead_time_days > criteria.maxLeadTimeDays) {
        return false
      }

      // Preferred vendor requirement
      if (criteria.requirePreferred && !vendor.is_preferred) {
        return false
      }

      // SLA compliance requirement
      if (criteria.requireMinSlaCompliance) {
        const metrics = performanceMetrics.find(m => m.vendor_id === vendor.vendor_id)
        if (!metrics || metrics.sla_compliance_rate < criteria.requireMinSlaCompliance) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Calculate comprehensive score for a vendor
   */
  private calculateVendorScore(
    vendor: Vendor,
    allVendors: Vendor[],
    performanceMetrics: VendorPerformanceMetrics[],
    criteria: VendorSelectionCriteria
  ): VendorScore {
    // Get vendor performance metrics
    const metrics = performanceMetrics.find(m => m.vendor_id === vendor.vendor_id)

    // Calculate individual scores (0-1 scale, higher is better)
    const costScore = this.calculateCostScore(vendor, allVendors)
    const leadTimeScore = this.calculateLeadTimeScore(vendor, allVendors)  
    const preferenceScore = vendor.is_preferred ? 1 : 0
    const slaScore = metrics ? metrics.sla_compliance_rate : 0.5 // Default to neutral if no data

    // Calculate weighted total score
    const totalScore = (
      costScore * criteria.costWeight +
      leadTimeScore * criteria.leadTimeWeight +
      preferenceScore * 0.1 + // Small fixed weight for preference
      slaScore * criteria.slaWeight
    )

    // Generate reasoning explanation
    const reasoning = this.generateSelectionReasoning(
      vendor, costScore, leadTimeScore, preferenceScore, slaScore, metrics
    )

    return {
      vendor,
      totalScore,
      costScore,
      leadTimeScore,
      preferenceScore,
      slaScore,
      reasoning
    }
  }

  /**
   * Calculate cost score (inverse - lower cost = higher score)
   */
  private calculateCostScore(vendor: Vendor, allVendors: Vendor[]): number {
    const costs = allVendors.map(v => v.cost_per_item)
    const minCost = Math.min(...costs)
    const maxCost = Math.max(...costs)
    
    if (minCost === maxCost) return 1 // All same cost
    
    // Inverse score - lower cost gets higher score
    return 1 - ((vendor.cost_per_item - minCost) / (maxCost - minCost))
  }

  /**
   * Calculate lead time score (inverse - shorter lead time = higher score)
   */
  private calculateLeadTimeScore(vendor: Vendor, allVendors: Vendor[]): number {
    const leadTimes = allVendors.map(v => v.lead_time_days)
    const minLeadTime = Math.min(...leadTimes)
    const maxLeadTime = Math.max(...leadTimes)
    
    if (minLeadTime === maxLeadTime) return 1 // All same lead time
    
    // Inverse score - shorter lead time gets higher score
    return 1 - ((vendor.lead_time_days - minLeadTime) / (maxLeadTime - minLeadTime))
  }

  /**
   * Generate human-readable reasoning for vendor selection
   */
  private generateSelectionReasoning(
    vendor: Vendor,
    costScore: number,
    leadTimeScore: number,
    preferenceScore: number,
    slaScore: number,
    metrics?: VendorPerformanceMetrics
  ): string {
    const reasons: string[] = []

    if (costScore >= 0.9) {
      reasons.push(`lowest cost ($${vendor.cost_per_item.toFixed(2)})`)
    } else if (costScore >= 0.7) {
      reasons.push(`competitive cost ($${vendor.cost_per_item.toFixed(2)})`)
    }

    if (leadTimeScore >= 0.9) {
      reasons.push(`fastest delivery (${vendor.lead_time_days} days)`)
    } else if (leadTimeScore >= 0.7) {
      reasons.push(`good delivery time (${vendor.lead_time_days} days)`)
    }

    if (preferenceScore === 1) {
      reasons.push('preferred vendor status')
    }

    if (metrics && slaScore >= 0.9) {
      reasons.push(`excellent SLA performance (${(metrics.sla_compliance_rate * 100).toFixed(1)}%)`)
    } else if (metrics && slaScore >= 0.7) {
      reasons.push(`good SLA performance (${(metrics.sla_compliance_rate * 100).toFixed(1)}%)`)
    }

    return reasons.length > 0 
      ? `Selected for: ${reasons.join(', ')}`
      : 'Selected as best available option'
  }

  /**
   * Validate vendor selection against business rules
   */
  validateVendorSelection(
    vendor: Vendor,
    product: Product,
    store: Store,
    performanceMetrics: VendorPerformanceMetrics[]
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = []
    const errors: string[] = []

    // Check if vendor is in product's approved vendor list
    const isApprovedVendor = product.vendors.some(v => v.vendor_id === vendor.vendor_id)
    if (!isApprovedVendor) {
      errors.push('Vendor is not in product\'s approved vendor list')
    }

    // Check vendor performance
    const metrics = performanceMetrics.find(m => m.vendor_id === vendor.vendor_id)
    if (metrics) {
      if (metrics.sla_compliance_rate < 0.8) {
        warnings.push(`Vendor has low SLA compliance (${(metrics.sla_compliance_rate * 100).toFixed(1)}%)`)
      }
      
      if (metrics.quality_score < 0.8) {
        warnings.push(`Vendor has low quality score (${(metrics.quality_score * 100).toFixed(1)}%)`)
      }

      if (metrics.invoice_accuracy_rate < 0.95) {
        warnings.push(`Vendor has invoice accuracy issues (${(metrics.invoice_accuracy_rate * 100).toFixed(1)}%)`)
      }
    } else {
      warnings.push('No performance metrics available for this vendor')
    }

    // Check lead time reasonableness
    if (vendor.lead_time_days > 14) {
      warnings.push(`Long lead time (${vendor.lead_time_days} days)`)
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Get default selection criteria emphasizing cost optimization
   */
  private getDefaultCriteria(): VendorSelectionCriteria {
    return {
      costWeight: 0.5,      // 50% weight on cost
      leadTimeWeight: 0.3,  // 30% weight on lead time
      slaWeight: 0.2,       // 20% weight on SLA performance
    }
  }

  /**
   * Get vendor performance summary for reporting
   */
  getVendorPerformanceSummary(
    vendorId: string,
    performanceMetrics: VendorPerformanceMetrics[]
  ): {
    vendor_id: string
    overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    metrics: VendorPerformanceMetrics | null
    recommendations: string[]
  } {
    const metrics = performanceMetrics.find(m => m.vendor_id === vendorId)
    
    if (!metrics) {
      return {
        vendor_id: vendorId,
        overallRating: 'FAIR',
        metrics: null,
        recommendations: ['Establish performance tracking for this vendor']
      }
    }

    // Calculate overall rating
    const avgScore = (
      metrics.sla_compliance_rate + 
      metrics.quality_score + 
      metrics.invoice_accuracy_rate
    ) / 3

    let overallRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    if (avgScore >= 0.9) overallRating = 'EXCELLENT'
    else if (avgScore >= 0.8) overallRating = 'GOOD'
    else if (avgScore >= 0.7) overallRating = 'FAIR'
    else overallRating = 'POOR'

    // Generate recommendations
    const recommendations: string[] = []
    if (metrics.sla_compliance_rate < 0.8) {
      recommendations.push('Review delivery performance with vendor')
    }
    if (metrics.quality_score < 0.8) {
      recommendations.push('Address quality issues with vendor')
    }
    if (metrics.invoice_accuracy_rate < 0.95) {
      recommendations.push('Improve invoice accuracy processes')
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain current performance standards')
    }

    return {
      vendor_id: vendorId,
      overallRating,
      metrics,
      recommendations
    }
  }
}