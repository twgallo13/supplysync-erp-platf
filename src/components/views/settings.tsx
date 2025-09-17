import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Gear,
  Users,
  Shield,
  Bell,
  Database,
  Warning,
  CheckCircle
} from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { toast } from 'sonner'

interface SettingsProps {
  onViewChange: (view: string) => void
}

const systemSettings = {
  autoReplenishment: true,
  vendorPreferences: 'cost_first',
  approvalTimeouts: 72,
  notificationFrequency: 'immediate',
  auditRetention: 90,
  backupFrequency: 'daily'
}

const userRoles = [
  { role: 'SM', label: 'Store Manager', count: 127 },
  { role: 'DM', label: 'District Manager', count: 23 },
  { role: 'FM', label: 'Facility Manager', count: 8 },
  { role: 'COST_ANALYST', label: 'Cost Analyst', count: 5 },
  { role: 'ADMIN', label: 'Administrator', count: 3 }
]

const systemLogs = [
  {
    timestamp: '2024-01-20T14:30:00Z',
    level: 'INFO',
    service: 'auth-service',
    message: 'User login successful',
    user: 'sarah.chen@retailcorp.com'
  },
  {
    timestamp: '2024-01-20T14:25:00Z',
    level: 'WARN',
    service: 'orders-service',
    message: 'Vendor SLA breach detected',
    details: 'Staples delivery 2 days overdue'
  },
  {
    timestamp: '2024-01-20T14:20:00Z',
    level: 'ERROR',
    service: 'fulfillment-service',
    message: 'Failed to generate tracking number',
    order: 'ord_abc123'
  },
  {
    timestamp: '2024-01-20T14:15:00Z',
    level: 'INFO',
    service: 'replenishment-engine',
    message: 'Automated order created',
    details: '5 items below reorder point'
  }
]

export function Settings({ onViewChange }: SettingsProps) {
  const { user } = useAuth()
  const [settings, setSettings] = useState(systemSettings)

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access system settings.</p>
      </div>
    )
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    toast.success('Settings updated successfully')
  }

  const getLogLevelBadge = (level: string) => {
    const variants = {
      'INFO': 'default',
      'WARN': 'secondary',
      'ERROR': 'destructive'
    } as const
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || 'default'}>
        {level}
      </Badge>
    )
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <Warning size={16} className="text-red-500" />
      case 'WARN': return <Warning size={16} className="text-yellow-500" />
      default: return <CheckCircle size={16} className="text-green-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">
          Configure system parameters and manage platform settings
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Replenishment Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gear size={20} />
                  Replenishment Engine
                </CardTitle>
                <CardDescription>Configure automated supply replenishment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-replenishment">Auto Replenishment</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automated reorder suggestions
                    </p>
                  </div>
                  <Switch
                    id="auto-replenishment"
                    checked={settings.autoReplenishment}
                    onCheckedChange={(checked) => handleSettingChange('autoReplenishment', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor-preferences">Vendor Selection Logic</Label>
                  <Select 
                    value={settings.vendorPreferences}
                    onValueChange={(value) => handleSettingChange('vendorPreferences', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cost_first">Cost First</SelectItem>
                      <SelectItem value="lead_time_first">Lead Time First</SelectItem>
                      <SelectItem value="preferred_vendors">Preferred Vendors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="approval-timeout">Approval Timeout (hours)</Label>
                  <Input
                    id="approval-timeout"
                    type="number"
                    value={settings.approvalTimeouts}
                    onChange={(e) => handleSettingChange('approvalTimeouts', parseInt(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} />
                  Notifications
                </CardTitle>
                <CardDescription>Configure system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-frequency">Notification Frequency</Label>
                  <Select 
                    value={settings.notificationFrequency}
                    onValueChange={(value) => handleSettingChange('notificationFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audit-retention">Audit Log Retention (days)</Label>
                  <Input
                    id="audit-retention"
                    type="number"
                    value={settings.auditRetention}
                    onChange={(e) => handleSettingChange('auditRetention', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <Select 
                    value={settings.backupFrequency}
                    onValueChange={(value) => handleSettingChange('backupFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Advanced system parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-rate-limit">API Rate Limit (requests/min)</Label>
                  <Input id="api-rate-limit" type="number" defaultValue="1000" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="480" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-order-value">Max Order Value ($)</Label>
                  <Input id="max-order-value" type="number" defaultValue="10000" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reorder-threshold">Reorder Threshold (%)</Label>
                  <Input id="reorder-threshold" type="number" defaultValue="20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                User Role Distribution
              </CardTitle>
              <CardDescription>Active users by role across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userRoles.map((role, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-sm text-muted-foreground">Role: {role.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{role.count} users</Badge>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bulk User Operations</CardTitle>
              <CardDescription>Perform operations on multiple users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button variant="outline">Export User List</Button>
                <Button variant="outline">Import Users</Button>
                <Button variant="outline">Send Notification</Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bulk-message">Bulk Notification Message</Label>
                <Textarea
                  id="bulk-message"
                  placeholder="Enter message to send to all users..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Security Configuration
              </CardTitle>
              <CardDescription>Manage security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require MFA for admin actions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password Rotation</Label>
                    <p className="text-sm text-muted-foreground">Force password changes every 90 days</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Monitoring</Label>
                    <p className="text-sm text-muted-foreground">Track concurrent sessions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>IP Whitelist</Label>
                    <p className="text-sm text-muted-foreground">Restrict access by IP address</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
                <Textarea
                  id="allowed-ips"
                  placeholder="Enter IP addresses, one per line..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={20} />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Connection Pool</span>
                    <Badge variant="default">Healthy</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Query Performance</span>
                    <Badge variant="default">Optimal</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Storage Usage</span>
                    <Badge variant="secondary">68%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="text-sm font-medium">145ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">99.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Requests/min</span>
                    <span className="text-sm font-medium">2,341</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <span className="text-sm font-medium">847</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Recent system events and error logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {systemLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getLogIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getLogLevelBadge(log.level)}
                        <span className="text-xs text-muted-foreground">{log.service}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      )}
                      {log.user && (
                        <p className="text-xs text-muted-foreground">User: {log.user}</p>
                      )}
                      {log.order && (
                        <p className="text-xs text-muted-foreground">Order: {log.order}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}