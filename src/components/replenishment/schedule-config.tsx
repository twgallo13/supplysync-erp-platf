import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { 
  Clock, 
  Gear,
  Play,
  Pause,
  PencilSimple,
  Trash,
  Plus,
  Target,
  ShieldCheck,
  Brain,
  TrendUp,
  Calendar,
  CheckCircle,
  Warning,
  CurrencyDollar,
  Timer,
  Lightning,
  ChartBar,
  Activity
} from '@phosphor-icons/react'
import { ReplenishmentScheduleConfig, ConfidenceReport, ScheduleExecutionLog, ReplenishmentConfigService, createReplenishmentConfigService } from '@/services/replenishment-config'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface ScheduleConfigProps {
  onClose?: () => void
}

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily', icon: <Calendar size={16} /> },
  { value: 'WEEKLY', label: 'Weekly', icon: <Calendar size={16} /> },
  { value: 'MONTHLY', label: 'Monthly', icon: <Calendar size={16} /> },
  { value: 'ON_DEMAND', label: 'On Demand', icon: <Lightning size={16} /> }
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export function ScheduleConfig({ onClose }: ScheduleConfigProps) {
  const [configService] = useState(() => createReplenishmentConfigService())
  const [schedules, setSchedules] = useKV<ReplenishmentScheduleConfig[]>('replenishment-schedules', configService.getAllSchedules())
  const [selectedSchedule, setSelectedSchedule] = useState<ReplenishmentScheduleConfig | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('schedules')
  
  // Form state for creating/editing schedules
  const [formData, setFormData] = useState<Partial<ReplenishmentScheduleConfig>>({
    name: '',
    description: '',
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
        seasonal_items: true,
        high_cost_items: true
      }
    },
    ml_config: {
      use_seasonal_patterns: true,
      use_weather_data: true,
      use_external_factors: false,
      min_forecast_confidence: 0.75,
      lookback_days: 30,
      forecast_horizon_days: 14
    },
    vendor_preferences: {
      prefer_primary_vendors: true,
      allow_vendor_substitution: false,
      cost_optimization_priority: 3,
      lead_time_priority: 4
    },
    scope: {
      store_ids: [],
      product_categories: [],
      priority_products: [],
      exclude_products: []
    }
  })

  const toggleSchedule = (scheduleId: string, enabled: boolean) => {
    if (enabled) {
      configService.enableSchedule(scheduleId)
    } else {
      configService.disableSchedule(scheduleId)
    }
    setSchedules(configService.getAllSchedules())
    toast.success(`Schedule ${enabled ? 'enabled' : 'disabled'}`)
  }

  const deleteSchedule = (scheduleId: string) => {
    configService.deleteSchedule(scheduleId)
    setSchedules(configService.getAllSchedules())
    toast.success('Schedule deleted')
  }

  const saveSchedule = () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill in required fields')
      return
    }

    const scheduleId = selectedSchedule?.schedule_id || `schedule_${Date.now()}`
    
    if (selectedSchedule) {
      // Update existing schedule
      configService.updateSchedule(scheduleId, {
        ...formData,
        updated_by: 'current_user'
      } as ReplenishmentScheduleConfig)
    } else {
      // Create new schedule
      configService.createSchedule({
        ...formData,
        schedule_id: scheduleId,
        created_by: 'current_user',
        updated_by: 'current_user'
      } as ReplenishmentScheduleConfig)
    }

    setSchedules(configService.getAllSchedules())
    setIsCreateDialogOpen(false)
    setIsEditDialogOpen(false)
    setSelectedSchedule(null)
    toast.success(selectedSchedule ? 'Schedule updated' : 'Schedule created')
  }

  const openEditDialog = (schedule: ReplenishmentScheduleConfig) => {
    setSelectedSchedule(schedule)
    setFormData(schedule)
    setIsEditDialogOpen(true)
  }

  const openCreateDialog = () => {
    setSelectedSchedule(null)
    setFormData({
      name: '',
      description: '',
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
          seasonal_items: true,
          high_cost_items: true
        }
      },
      ml_config: {
        use_seasonal_patterns: true,
        use_weather_data: true,
        use_external_factors: false,
        min_forecast_confidence: 0.75,
        lookback_days: 30,
        forecast_horizon_days: 14
      },
      vendor_preferences: {
        prefer_primary_vendors: true,
        allow_vendor_substitution: false,
        cost_optimization_priority: 3,
        lead_time_priority: 4
      },
      scope: {
        store_ids: [],
        product_categories: [],
        priority_products: [],
        exclude_products: []
      }
    })
    setIsCreateDialogOpen(true)
  }

  const getFrequencyBadge = (frequency: string) => {
    const colors = {
      DAILY: 'bg-green-100 text-green-800',
      WEEKLY: 'bg-blue-100 text-blue-800',
      MONTHLY: 'bg-purple-100 text-purple-800',
      ON_DEMAND: 'bg-orange-100 text-orange-800'
    }
    return (
      <Badge className={colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {frequency}
      </Badge>
    )
  }

  const getNextRunDisplay = (schedule: ReplenishmentScheduleConfig) => {
    if (!schedule.next_run_at) return 'Not scheduled'
    const nextRun = new Date(schedule.next_run_at)
    const now = new Date()
    const diffHours = Math.ceil((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 24) {
      return `In ${diffHours} hours`
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return `In ${diffDays} days`
    }
  }

  const ScheduleFormDialog = ({ isOpen, onOpenChange, title }: { isOpen: boolean, onOpenChange: (open: boolean) => void, title: string }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure automated replenishment schedules with confidence thresholds and approval workflows
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="confidence">Confidence</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
            <TabsTrigger value="ml">ML Config</TabsTrigger>
            <TabsTrigger value="scope">Scope</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Daily Critical Items"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this schedule does and when it runs"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Time of Day</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time_of_day || '06:00'}
                  onChange={(e) => setFormData(prev => ({ ...prev, time_of_day: e.target.value }))}
                />
              </div>

              {formData.frequency === 'WEEKLY' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select 
                    value={formData.days_of_week?.[0]?.toString() || '1'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, days_of_week: [parseInt(value)] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'MONTHLY' && (
                <div className="space-y-2">
                  <Label htmlFor="dayOfMonth">Day of Month</Label>
                  <Input
                    id="dayOfMonth"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.day_of_month || 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: parseInt(e.target.value) }))}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Enable this schedule</Label>
            </div>
          </TabsContent>

          <TabsContent value="confidence" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Target size={16} className="text-blue-600" />
                Confidence Thresholds
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Auto-Approve Threshold</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {((formData.confidence_thresholds?.auto_approve_threshold || 0.90) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(formData.confidence_thresholds?.auto_approve_threshold || 0.90) * 100]}
                    onValueChange={([value]) => setFormData(prev => ({
                      ...prev,
                      confidence_thresholds: {
                        ...prev.confidence_thresholds!,
                        auto_approve_threshold: value / 100
                      }
                    }))}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Orders above this confidence level are automatically approved</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>FM Review Threshold</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {((formData.confidence_thresholds?.fm_review_threshold || 0.70) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(formData.confidence_thresholds?.fm_review_threshold || 0.70) * 100]}
                    onValueChange={([value]) => setFormData(prev => ({
                      ...prev,
                      confidence_thresholds: {
                        ...prev.confidence_thresholds!,
                        fm_review_threshold: value / 100
                      }
                    }))}
                    min={30}
                    max={90}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Orders below this confidence require FM review</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>High Confidence Threshold</Label>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {((formData.confidence_thresholds?.high_confidence_threshold || 0.85) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(formData.confidence_thresholds?.high_confidence_threshold || 0.85) * 100]}
                    onValueChange={([value]) => setFormData(prev => ({
                      ...prev,
                      confidence_thresholds: {
                        ...prev.confidence_thresholds!,
                        high_confidence_threshold: value / 100
                      }
                    }))}
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Orders above this confidence get priority processing</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-600" />
                Approval Workflow
              </h4>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoApprove"
                    checked={formData.approval_workflow?.auto_approve_enabled || false}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      approval_workflow: {
                        ...prev.approval_workflow!,
                        auto_approve_enabled: checked
                      }
                    }))}
                  />
                  <Label htmlFor="autoApprove">Enable automatic approvals</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxAutoApprove">Max Auto-Approve Amount ($)</Label>
                    <Input
                      id="maxAutoApprove"
                      type="number"
                      value={formData.approval_workflow?.max_auto_approve_amount || 500}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        approval_workflow: {
                          ...prev.approval_workflow!,
                          max_auto_approve_amount: parseFloat(e.target.value)
                        }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dmApprovalThreshold">DM Approval Required Above ($)</Label>
                    <Input
                      id="dmApprovalThreshold"
                      type="number"
                      value={formData.approval_workflow?.require_dm_approval_above || 2000}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        approval_workflow: {
                          ...prev.approval_workflow!,
                          require_dm_approval_above: parseFloat(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Escalation Rules</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="criticalItems"
                        checked={formData.approval_workflow?.escalation_rules?.critical_items || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          approval_workflow: {
                            ...prev.approval_workflow!,
                            escalation_rules: {
                              ...prev.approval_workflow!.escalation_rules,
                              critical_items: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="criticalItems">Auto-escalate critical stockouts</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="seasonalItems"
                        checked={formData.approval_workflow?.escalation_rules?.seasonal_items || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          approval_workflow: {
                            ...prev.approval_workflow!,
                            escalation_rules: {
                              ...prev.approval_workflow!.escalation_rules,
                              seasonal_items: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="seasonalItems">Auto-escalate seasonal predictions</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="highCostItems"
                        checked={formData.approval_workflow?.escalation_rules?.high_cost_items || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          approval_workflow: {
                            ...prev.approval_workflow!,
                            escalation_rules: {
                              ...prev.approval_workflow!.escalation_rules,
                              high_cost_items: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="highCostItems">Escalate high-cost items</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ml" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Brain size={16} className="text-purple-600" />
                Machine Learning Configuration
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Data Sources</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="seasonalPatterns"
                        checked={formData.ml_config?.use_seasonal_patterns || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          ml_config: {
                            ...prev.ml_config!,
                            use_seasonal_patterns: checked
                          }
                        }))}
                      />
                      <Label htmlFor="seasonalPatterns">Use seasonal patterns</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="weatherData"
                        checked={formData.ml_config?.use_weather_data || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          ml_config: {
                            ...prev.ml_config!,
                            use_weather_data: checked
                          }
                        }))}
                      />
                      <Label htmlFor="weatherData">Use weather data</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="externalFactors"
                        checked={formData.ml_config?.use_external_factors || false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          ml_config: {
                            ...prev.ml_config!,
                            use_external_factors: checked
                          }
                        }))}
                      />
                      <Label htmlFor="externalFactors">Use external factors</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="minConfidence">Minimum Forecast Confidence</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[(formData.ml_config?.min_forecast_confidence || 0.75) * 100]}
                        onValueChange={([value]) => setFormData(prev => ({
                          ...prev,
                          ml_config: {
                            ...prev.ml_config!,
                            min_forecast_confidence: value / 100
                          }
                        }))}
                        min={50}
                        max={95}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded w-12 text-center">
                        {((formData.ml_config?.min_forecast_confidence || 0.75) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lookbackDays">Lookback Days</Label>
                    <Input
                      id="lookbackDays"
                      type="number"
                      value={formData.ml_config?.lookback_days || 30}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ml_config: {
                          ...prev.ml_config!,
                          lookback_days: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forecastHorizon">Forecast Horizon Days</Label>
                    <Input
                      id="forecastHorizon"
                      type="number"
                      value={formData.ml_config?.forecast_horizon_days || 14}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        ml_config: {
                          ...prev.ml_config!,
                          forecast_horizon_days: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scope" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Schedule Scope</h4>
              <p className="text-sm text-muted-foreground">Define which stores and products this schedule applies to</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeIds">Store IDs (comma-separated, empty = all stores)</Label>
                  <Textarea
                    id="storeIds"
                    value={formData.scope?.store_ids?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scope: {
                        ...prev.scope!,
                        store_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    }))}
                    placeholder="s_12345, s_12346"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categories">Product Categories (comma-separated)</Label>
                  <Textarea
                    id="categories"
                    value={formData.scope?.product_categories?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scope: {
                        ...prev.scope!,
                        product_categories: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    }))}
                    placeholder="Cleaning Supplies, POS Supplies"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priorityProducts">Priority Product IDs</Label>
                  <Textarea
                    id="priorityProducts"
                    value={formData.scope?.priority_products?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scope: {
                        ...prev.scope!,
                        priority_products: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    }))}
                    placeholder="prod_paper_001, prod_cleaner_001"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excludeProducts">Exclude Product IDs</Label>
                  <Textarea
                    id="excludeProducts"
                    value={formData.scope?.exclude_products?.join(', ') || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      scope: {
                        ...prev.scope!,
                        exclude_products: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    }))}
                    placeholder="prod_seasonal_001"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSchedule} className="gap-2">
            <CheckCircle size={16} />
            {selectedSchedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Replenishment Automation</h2>
          <p className="text-muted-foreground">
            Configure automated schedules with confidence thresholds and approval workflows
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus size={16} />
          New Schedule
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedules">Active Schedules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid gap-4">
            {(schedules || []).map((schedule) => (
              <Card key={schedule.schedule_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{schedule.name}</CardTitle>
                        {getFrequencyBadge(schedule.frequency)}
                        {!schedule.enabled && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <CardDescription>{schedule.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={(checked) => toggleSchedule(schedule.schedule_id, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(schedule)}
                      >
                        <PencilSimple size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSchedule(schedule.schedule_id)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Next Run</p>
                        <p className="text-xs text-muted-foreground">
                          {getNextRunDisplay(schedule)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Auto-Approve</p>
                        <p className="text-xs text-muted-foreground">
                          {(schedule.confidence_thresholds.auto_approve_threshold * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CurrencyDollar size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Max Auto Amount</p>
                        <p className="text-xs text-muted-foreground">
                          ${schedule.approval_workflow.max_auto_approve_amount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Brain size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">ML Features</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            schedule.ml_config.use_seasonal_patterns && 'Seasonal',
                            schedule.ml_config.use_weather_data && 'Weather',
                            schedule.ml_config.use_external_factors && 'External'
                          ].filter(Boolean).join(', ') || 'Basic'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Updated {new Date(schedule.updated_at).toLocaleDateString()} • 
                        {schedule.last_run_at ? ` Last run ${new Date(schedule.last_run_at).toLocaleDateString()}` : ' Never run'}
                      </span>
                      {schedule.enabled && (
                        <Badge className="bg-green-100 text-green-800">
                          <Activity size={12} className="mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                <Target size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.3%</div>
                <Progress value={87.3} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Across all schedules</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Auto-Approval Rate</CardTitle>
                <CheckCircle size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">64%</div>
                <Progress value={64} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">Orders auto-approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
                <TrendUp size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$12.4K</div>
                <p className="text-xs text-green-600 mt-1">↑ 15% vs manual</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>
                Execution history and performance metrics for automated schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    schedule: 'Daily Critical Items',
                    time: '6:00 AM Today',
                    status: 'SUCCESS',
                    suggestions: 23,
                    autoApproved: 15,
                    duration: '2.3s'
                  },
                  {
                    schedule: 'Weekly Cost Optimization',
                    time: '5:00 AM Monday',
                    status: 'SUCCESS',
                    suggestions: 47,
                    autoApproved: 28,
                    duration: '5.7s'
                  },
                  {
                    schedule: 'Daily Critical Items',
                    time: '6:00 AM Yesterday',
                    status: 'PARTIAL_SUCCESS',
                    suggestions: 19,
                    autoApproved: 12,
                    duration: '3.1s'
                  }
                ].map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'SUCCESS' ? 'bg-green-500' : 
                        log.status === 'PARTIAL_SUCCESS' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{log.schedule}</p>
                        <p className="text-sm text-muted-foreground">{log.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{log.suggestions}</p>
                        <p className="text-xs text-muted-foreground">Suggestions</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{log.autoApproved}</p>
                        <p className="text-xs text-muted-foreground">Auto-approved</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{log.duration}</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <Badge className={
                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                        log.status === 'PARTIAL_SUCCESS' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create Replenishment Schedule"
      />

      <ScheduleFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Edit Replenishment Schedule"
      />
    </div>
  )
}