import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import { useUpdatePassword } from '@/hooks/useUpdatePassword'
import { useTenantUsers } from '@/hooks/useTenantUsers'
import { useRoles } from '@/hooks/useRoles'
import { useInviteUser } from '@/hooks/useInviteUser'
import { useDeleteUser } from '@/hooks/useDeleteUser'
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole'
import { useUpdateTenantCredentials } from '@/hooks/useUpdateTenantCredentials'
import { useTenant } from '@/hooks/useTenant'
import { RoleGuard } from '@/components/auth/RoleGuard'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional()
})

const passwordSchema = z.object({
  current_password: z.string().min(8, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Confirm password is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password']
})

const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role_id: z.coerce.number().int().positive('Role is required')
})

const integrationsSchema = z.object({
  resend_api_key: z.string().optional(),
  wa_access_token: z.string().optional(),
  wa_phone_number_id: z.string().optional(),
  wa_business_account_id: z.string().optional()
})

type ProfileFormValues = z.infer<typeof profileSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>
type InviteFormValues = z.infer<typeof inviteSchema>

export default function Settings() {
  const { user, updateUser } = useAuth()
  const updateProfileMutation = useUpdateProfile()
  const updatePasswordMutation = useUpdatePassword()
  const { data: tenantUsers, isLoading: usersLoading } = useTenantUsers()
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const inviteUserMutation = useInviteUser()
  const deleteUserMutation = useDeleteUser()
  const updateUserRoleMutation = useUpdateUserRole()
  const updateTenantCredentialsMutation = useUpdateTenantCredentials()
  const { data: tenant } = useTenant(user?.tenant_id || null)

  const [activeTab, setActiveTab] = useState('profile')
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<number | null>(null)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || ''
    }
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    }
  })

  const inviteForm = useForm<z.input<typeof inviteSchema>, any, z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: '',
      email: '',
      role_id: 0
    }
  })

  const integrationsForm = useForm<z.infer<typeof integrationsSchema>>({
    resolver: zodResolver(integrationsSchema),
    defaultValues: {
      resend_api_key: '',
      wa_access_token: '',
      wa_phone_number_id: '',
      wa_business_account_id: ''
    }
  })

  useEffect(() => {
    if (roles && inviteForm.getValues('role_id') === 0) {
      const staffRole = roles.find(r => r.name.toLowerCase() === 'staff')
      if (staffRole) {
        inviteForm.setValue('role_id', staffRole.id)
      }
    }
  }, [roles, inviteForm])

  const onProfileSubmit = async (values: ProfileFormValues) => {
    try {
      // Strip email from payload per API contract - email is immutable
      const payload = {
        name: values.name,
        phone_number: values.phone_number
      }
      
      const updatedUser = await updateProfileMutation.mutateAsync(payload)
      updateUser(updatedUser)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update profile')
    }
  }

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    // Client side validation for password confirmation
    if (values.new_password !== values.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    
    try {
      // Strip confirm_password from payload per API contract
      const payload = {
        current_password: values.current_password,
        new_password: values.new_password
      }
      
      await updatePasswordMutation.mutateAsync(payload)
      toast.success('Password updated successfully')
      passwordForm.reset()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update password')
    }
  }

  const onInviteSubmit = async (values: InviteFormValues) => {
    try {
      const response = await inviteUserMutation.mutateAsync(values)
      setTemporaryPassword(response.temporary_password)
      inviteForm.reset()
      toast.success('User invited successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to invite user')
    }
  }

  const onIntegrationsSubmit = async (values: z.infer<typeof integrationsSchema>) => {
    if (!user?.tenant_id) return
    try {
      // Filter out empty strings so we don't accidentally overwrite existing keys with blanks
      const payload = Object.fromEntries(
        Object.entries(values).filter(([_, v]) => v !== '')
      )
      
      await updateTenantCredentialsMutation.mutateAsync({ tenantId: user.tenant_id, data: payload })
      toast.success('Integrations updated successfully')
      integrationsForm.reset()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update integrations')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Password copied to clipboard')
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account profile information</CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...profileForm.register('name')} />
                  {profileForm.formState.errors.name && <p className="text-sm text-red-500">{profileForm.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...profileForm.register('email')} disabled className="opacity-70" />
                  <p className="text-xs text-zinc-500">Email address cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input id="phone_number" {...profileForm.register('phone_number')} value={profileForm.watch('phone_number') || ''} />
                  {profileForm.formState.errors.phone_number && <p className="text-sm text-red-500">{profileForm.formState.errors.phone_number.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input id="current_password" type="password" {...passwordForm.register('current_password')} />
                  {passwordForm.formState.errors.current_password && <p className="text-sm text-red-500">{passwordForm.formState.errors.current_password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input id="new_password" type="password" {...passwordForm.register('new_password')} />
                  {passwordForm.formState.errors.new_password && <p className="text-sm text-red-500">{passwordForm.formState.errors.new_password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input id="confirm_password" type="password" {...passwordForm.register('confirm_password')} />
                  {passwordForm.formState.errors.confirm_password && <p className="text-sm text-red-500">{passwordForm.formState.errors.confirm_password.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updatePasswordMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <RoleGuard allowedRoles={['admin']}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage workspace users and invitations</CardDescription>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Invite Employee</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite New Team Member</DialogTitle>
                      <DialogDescription>Send an invitation to join your workspace. A temporary password will be generated.</DialogDescription>
                    </DialogHeader>
                    
                    {temporaryPassword ? (
                      <div className="space-y-4 py-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-800 mb-2">✅ User invited successfully!</p>
                          <p className="text-sm text-green-700 mb-3">Share this temporary password with the new user:</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-white px-3 py-2 rounded border font-mono text-sm">{temporaryPassword}</code>
                            <Button size="sm" variant="secondary" onClick={() => copyToClipboard(temporaryPassword)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => {
                            setTemporaryPassword(null)
                            setInviteDialogOpen(false)
                          }}>
                            Done
                          </Button>
                        </DialogFooter>
                      </div>
                    ) : (
                      <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)}>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="invite-name">Full Name</Label>
                            <Input id="invite-name" {...inviteForm.register('name')} />
                            {inviteForm.formState.errors.name && <p className="text-sm text-red-500">{inviteForm.formState.errors.name.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input id="invite-email" type="email" {...inviteForm.register('email')} />
                            {inviteForm.formState.errors.email && <p className="text-sm text-red-500">{inviteForm.formState.errors.email.message}</p>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invite-role">Role</Label>
                            <Select 
                              onValueChange={(value) => inviteForm.setValue('role_id', parseInt(value))} 
                              value={String(inviteForm.watch('role_id'))}
                            >
                              <SelectTrigger id="invite-role" className="w-full">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                {rolesLoading ? (
                                  <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                                ) : roles?.map((role) => (
                                  <SelectItem key={role.id} value={role.id.toString()} className="capitalize">
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {inviteForm.formState.errors.role_id && <p className="text-sm text-red-500">{inviteForm.formState.errors.role_id.message}</p>}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={inviteUserMutation.isPending}>
                            {inviteUserMutation.isPending ? 'Inviting...' : 'Send Invitation'}
                          </Button>
                        </DialogFooter>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading team members...</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Name</TableHead>
                           <TableHead>Email</TableHead>
                           <TableHead>Role</TableHead>
                           <TableHead>Joined</TableHead>
                           <TableHead className="w-[70px]"></TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {tenantUsers?.map((teamUser) => (
                           <TableRow key={teamUser.id}>
                             <TableCell className="font-medium">{teamUser.name}</TableCell>
                             <TableCell>{teamUser.email}</TableCell>
                             <TableCell className="capitalize">
                               {teamUser.id !== user?.id && user?.role_name?.toLowerCase() === 'admin' ? (
                                 <Select
                                   defaultValue={teamUser.role_name || 'member'}
                                   onValueChange={async (value) => {
                                     try {
                                       await updateUserRoleMutation.mutateAsync({ user_id: teamUser.id, role_name: value })
                                       toast.success(`Role updated to ${value}`)
                                     } catch (error: any) {
                                       toast.error(error.response?.data?.detail || 'Failed to update role')
                                     }
                                   }}
                                   disabled={updateUserRoleMutation.isPending}
                                 >
                                   <SelectTrigger className="w-[120px] h-8 text-xs capitalize">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     {roles?.map((role) => (
                                       <SelectItem key={role.id} value={role.name.toLowerCase()} className="capitalize">
                                         {role.name}
                                       </SelectItem>
                                     ))}
                                   </SelectContent>
                                 </Select>
                               ) : (
                                 teamUser.role_name || 'Member'
                               )}
                             </TableCell>
                             <TableCell className="text-zinc-500 text-sm">{new Date(teamUser.created_at).toLocaleDateString()}</TableCell>
                             <TableCell>
                               {teamUser.id !== user?.id && (
                                 <Button
                                   variant="ghost"
                                   size="icon-xs"
                                   onClick={() => setDeleteConfirmOpen(teamUser.id)}
                                   className="text-zinc-500 hover:text-red-600 hover:bg-red-50"
                                 >
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                 </Button>
                               )}
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                  </ScrollArea>
                )}
               </CardContent>
             </Card>

             {/* Delete User Confirmation Dialog */}
             <Dialog open={deleteConfirmOpen !== null} onOpenChange={(open) => !open && setDeleteConfirmOpen(null)}>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>Remove Team Member</DialogTitle>
                   <DialogDescription>
                     Are you sure you want to remove <strong>{tenantUsers?.find(u => u.id === deleteConfirmOpen)?.name}</strong>? This action cannot be undone.
                   </DialogDescription>
                 </DialogHeader>
                 <DialogFooter className="gap-2 sm:justify-end">
                   <Button 
                     variant="outline" 
                     onClick={() => setDeleteConfirmOpen(null)}
                   >
                     Cancel
                   </Button>
                   <Button 
                     variant="destructive"
                     onClick={async () => {
                       if (deleteConfirmOpen) {
                         try {
                           await deleteUserMutation.mutateAsync(deleteConfirmOpen)
                           toast.success('User removed from workspace')
                           setDeleteConfirmOpen(null)
                         } catch (error: any) {
                           toast.error(error.response?.data?.detail || 'Failed to remove user')
                         }
                       }
                     }}
                   >
                     Remove User
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           </RoleGuard>
         </TabsContent>

         <TabsContent value="integrations">
           <RoleGuard allowedRoles={['admin']}>
             <Card>
               <CardHeader>
                 <CardTitle>Connected Integrations</CardTitle>
                 <CardDescription>Configure third-party services and webhooks for your workspace.</CardDescription>
               </CardHeader>
               <form onSubmit={integrationsForm.handleSubmit(onIntegrationsSubmit)}>
                 <CardContent className="space-y-6">
                   {/* Resend.com Details */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <h3 className="text-lg font-medium">Resend Email Delivery</h3>
                         {tenant?.has_resend_key ? (
                           <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
                         ) : (
                           <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Pending Setup</span>
                         )}
                       </div>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="resend_api_key">Resend API Key</Label>
                       <Input id="resend_api_key" type="password" placeholder="re_..." {...integrationsForm.register('resend_api_key')} />
                       <p className="text-xs text-zinc-500">Only provide a new key if you want to replace the existing one.</p>
                     </div>
                   </div>
                   
                   <hr className="border-zinc-200" />
                   
                   {/* WhatsApp Cloud API Details */}
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <h3 className="text-lg font-medium">WhatsApp Cloud API</h3>
                         {tenant?.has_wa_credentials ? (
                           <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded">Connected</span>
                         ) : (
                           <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Pending Setup</span>
                         )}
                       </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="wa_phone_number_id">Phone Number ID</Label>
                         <Input id="wa_phone_number_id" type="password" {...integrationsForm.register('wa_phone_number_id')} />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="wa_business_account_id">Business Account ID</Label>
                         <Input id="wa_business_account_id" type="password" {...integrationsForm.register('wa_business_account_id')} />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="wa_access_token">System User Access Token</Label>
                       <Input id="wa_access_token" type="password" placeholder="EAA..." {...integrationsForm.register('wa_access_token')} />
                       <p className="text-xs text-zinc-500">Ensure this token has whatsapp_business_messaging, whatsapp_business_management permissions and is set to never expire.</p>
                     </div>
                   </div>
                 </CardContent>
                 <CardFooter className="flex justify-end bg-zinc-50 py-4 mt-6 border-t rounded-b-lg">
                   <Button 
                     type="submit" 
                     disabled={updateTenantCredentialsMutation.isPending}
                     className="w-full sm:w-auto"
                   >
                     {updateTenantCredentialsMutation.isPending ? 'Saving...' : 'Save Integrations'}
                   </Button>
                 </CardFooter>
               </form>
             </Card>
           </RoleGuard>
         </TabsContent>
       </Tabs>
     </div>
   )
 }