import { useState, useEffect } from 'react'
import { Vibrate, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  getHapticSettings, 
  saveHapticSettings, 
  isHapticSupported, 
  isAdvancedHapticSupported,
  haptics,
  type HapticSettings 
} from '@/lib/haptics'
import { toast } from 'sonner'

interface HapticSettingsProps {
  className?: string
}

export function HapticSettingsCard({ className }: HapticSettingsProps) {
  const [settings, setSettings] = useState<HapticSettings>({
    enabled: true,
    intensity: 'medium'
  })

  useEffect(() => {
    setSettings(getHapticSettings())
  }, [])

  const updateSettings = (newSettings: Partial<HapticSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    saveHapticSettings(updated)
    
    // Provide immediate feedback
    if (updated.enabled) {
      haptics.select()
      toast.success('Haptic settings updated')
    }
  }

  const testHaptic = (type: 'light' | 'medium' | 'heavy') => {
    if (!settings.enabled) {
      toast.warning('Enable haptic feedback to test')
      return
    }

    switch (type) {
      case 'light':
        haptics.light()
        break
      case 'medium':
        haptics.medium()
        break
      case 'heavy':
        haptics.heavy()
        break
    }
    
    toast.success(`Testing ${type} haptic`)
  }

  const testScenarios = () => {
    if (!settings.enabled) {
      toast.warning('Enable haptic feedback to test scenarios')
      return
    }

    let delay = 0
    
    // Test scan success
    setTimeout(() => {
      haptics.scanSuccess()
      toast.success('Successful scan')
    }, delay)
    
    delay += 1500
    
    // Test scan error
    setTimeout(() => {
      haptics.scanError()
      toast.error('Scan error')
    }, delay)
    
    delay += 1500
    
    // Test warning
    setTimeout(() => {
      haptics.warning()
      toast.warning('Warning haptic')
    }, delay)
  }

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Vibrate size={20} className={settings.enabled ? "text-primary" : "text-muted-foreground"} weight={settings.enabled ? "fill" : "regular"} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Haptic Feedback</h3>
            <p className="text-sm text-muted-foreground">
              Customize vibration settings
            </p>
          </div>
          {!isHapticSupported() && (
            <Badge variant="secondary" className="text-xs">
              Not Supported
            </Badge>
          )}
        </div>

        {/* Device Support Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Device Support:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <span>Basic Vibration:</span>
              <Badge variant={isHapticSupported() ? "default" : "secondary"} className="text-xs">
                {isHapticSupported() ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Advanced Haptics:</span>
              <Badge variant={isAdvancedHapticSupported() ? "default" : "secondary"} className="text-xs">
                {isAdvancedHapticSupported() ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="haptic-enabled" className="text-sm font-medium">
              Enable Haptic Feedback
            </Label>
            <p className="text-xs text-muted-foreground">
              Vibrate for scan results and interactions
            </p>
          </div>
          <Switch
            id="haptic-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateSettings({ enabled })}
            disabled={!isHapticSupported()}
          />
        </div>

        {/* Intensity Selection */}
        {settings.enabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Intensity Level</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'medium', 'heavy'] as const).map((intensity) => (
                <Button
                  key={intensity}
                  variant={settings.intensity === intensity ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    updateSettings({ intensity })
                    testHaptic(intensity)
                  }}
                  className="h-12 flex-col gap-1 text-xs"
                >
                  <Vibrate 
                    size={intensity === 'light' ? 14 : intensity === 'medium' ? 16 : 18} 
                  />
                  {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Test Scenarios */}
        {settings.enabled && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Test Scenarios</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testScenarios()}
                className="h-10 text-xs"
              >
                Test All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  haptics.select()
                  toast.success('Quick test')
                }}
                className="h-10 text-xs"
              >
                Quick Test
              </Button>
            </div>
          </div>
        )}

        {/* Usage Tips */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <h4 className="text-xs font-medium mb-1 text-muted-foreground">Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• Success scans provide double pulse feedback</li>
            <li>• Error scans provide long pulse feedback</li>
            <li>• Button interactions use light pulses</li>
            <li>• Exceptions and warnings use error patterns</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}