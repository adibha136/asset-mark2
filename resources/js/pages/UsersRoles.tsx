import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye, 
  Shield, User, Mail, Phone, Lock, Check, X, ShieldAlert 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Modal, ConfirmModal } from "@/components/shared/Modal";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  avatar?: string;
  lastActive: string;
}

interface Permission {
  id: number;
  menu: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
}

const roleColors: Record<string, string> = {
  admin: "bg-primary/15 text-primary",
  manager: "bg-accent/15 text-accent",
  user: "bg-success/15 text-success",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersRoles() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  
  // User Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  
  // Role Modals
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editRole, setEditRole] = useState<Partial<Role>>({});

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
  });
  const [editUser, setEditUser] = useState<Partial<UserData>>({});

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<UserData[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get("/users");
      return response.data;
    },
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await api.get("/roles");
      return response.data;
    },
  });

  // User Mutations
  const addUserMutation = useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsAddUserModalOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "user",
        phone: "",
      });
      toast.success("User added successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to add user";
      const errors = error.response?.data?.errors;
      
      if (errors) {
        const firstError = Object.values(errors)[0] as string[];
        toast.error(firstError[0] || message);
      } else {
        toast.error(message);
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => api.put(`/users/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsEditUserModalOpen(false);
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to update user";
      const errors = error.response?.data?.errors;
      
      if (errors) {
        const firstError = Object.values(errors)[0] as string[];
        toast.error(firstError[0] || message);
      } else {
        toast.error(message);
      }
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDeleteUserModalOpen(false);
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete user";
      toast.error(message);
    }
  });

  // Role Mutations
  const addRoleMutation = useMutation({
    mutationFn: (data: any) => api.post("/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsAddRoleModalOpen(false);
      toast.success("Role created successfully");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: any) => api.put(`/roles/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsEditRoleModalOpen(false);
      toast.success("Role permissions updated");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsDeleteRoleModalOpen(false);
      toast.success("Role deleted successfully");
    }
  });

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userColumns = [
    {
      key: "name",
      header: "User",
      render: (user: UserData) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user: UserData) => (
        <Badge variant="outline" className={cn("capitalize", roleColors[user.role] || "bg-muted")}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user: UserData) => (
        <Badge variant={user.status === "active" ? "success" : "muted"} className="capitalize">
          {user.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user: UserData) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedUser(user);
              setEditUser(user);
              setIsEditUserModalOpen(true);
            }}>
              <Edit className="w-4 h-4 mr-2" /> Edit User
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedUser(user);
                setIsDeleteUserModalOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  const handleTogglePermission = (menu: string, action: string, value: boolean) => {
    if (!editRole.permissions) return;
    
    const updatedPermissions = editRole.permissions.map(p => {
      if (p.menu === menu) {
        return { ...p, [action]: value };
      }
      return p;
    });
    
    setEditRole({ ...editRole, permissions: updatedPermissions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground">Manage accounts and menu-wise permissions</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "users" ? (
            <Button variant="gradient" onClick={() => setIsAddUserModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          ) : (
            <Button variant="gradient" onClick={() => setIsAddRoleModalOpen(true)}>
              <Shield className="w-4 h-4 mr-2" /> Create Role
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-2">
            <User className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <DataTable 
              columns={userColumns} 
              data={filteredUsers} 
              isLoading={isLoadingUsers}
            />
          </div>
        </TabsContent>

        <TabsContent value="roles" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="md:col-span-1 space-y-4">
            {roles.map((role) => (
              <Card 
                key={role.id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedRole?.id === role.id ? "border-primary bg-primary/5" : ""
                )}
                onClick={() => {
                  setSelectedRole(role);
                  setEditRole(role);
                }}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className={cn("w-4 h-4", selectedRole?.id === role.id ? "text-primary" : "text-muted-foreground")} />
                      {role.name}
                    </CardTitle>
                    {role.slug !== 'admin' && (
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(role);
                          setIsDeleteRoleModalOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-xs line-clamp-1">{role.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Permissions Matrix */}
          <div className="md:col-span-2">
            {selectedRole ? (
              <Card className="opacity-0 animate-fade-in">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Permissions: {selectedRole.name}</CardTitle>
                      <CardDescription>Configure menu-wise access for this role</CardDescription>
                    </div>
                    <Button 
                      variant="gradient" 
                      size="sm"
                      disabled={updateRoleMutation.isPending}
                      onClick={() => updateRoleMutation.mutate(editRole)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save Permissions
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left p-4 font-medium">Menu Module</th>
                          <th className="text-center p-4 font-medium">View</th>
                          <th className="text-center p-4 font-medium">Add</th>
                          <th className="text-center p-4 font-medium">Edit</th>
                          <th className="text-center p-4 font-medium">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {editRole.permissions?.map((perm) => (
                          <tr key={perm.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4 capitalize font-medium">{perm.menu}</td>
                            <td className="p-4 text-center">
                              <Switch 
                                checked={perm.can_view} 
                                onCheckedChange={(v) => handleTogglePermission(perm.menu, 'can_view', v)}
                              />
                            </td>
                            <td className="p-4 text-center">
                              <Switch 
                                checked={perm.can_add} 
                                onCheckedChange={(v) => handleTogglePermission(perm.menu, 'can_add', v)}
                              />
                            </td>
                            <td className="p-4 text-center">
                              <Switch 
                                checked={perm.can_edit} 
                                onCheckedChange={(v) => handleTogglePermission(perm.menu, 'can_edit', v)}
                              />
                            </td>
                            <td className="p-4 text-center">
                              <Switch 
                                checked={perm.can_delete} 
                                onCheckedChange={(v) => handleTogglePermission(perm.menu, 'can_delete', v)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a role to manage its permissions</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals for Users */}
      <Modal
        open={isAddUserModalOpen}
        onOpenChange={setIsAddUserModalOpen}
        title="Add New User"
        description="Create a new system user"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={() => addUserMutation.mutate(newUser)} disabled={addUserMutation.isPending}>Add User</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="email@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={isEditUserModalOpen}
        onOpenChange={setIsEditUserModalOpen}
        title="Edit User"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditUserModalOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={() => updateUserMutation.mutate(editUser)}>Save Changes</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={editUser.name || ""} onChange={e => setEditUser({...editUser, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={editUser.phone || ""} onChange={e => setEditUser({...editUser, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={editUser.role} onValueChange={v => setEditUser({...editUser, role: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={editUser.status} onValueChange={(v: any) => setEditUser({...editUser, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      {/* Delete User Confirm */}
      <ConfirmModal
        open={isDeleteUserModalOpen}
        onOpenChange={setIsDeleteUserModalOpen}
        title="Delete User"
        description={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone.`}
        onConfirm={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
      />

      {/* Add Role Modal */}
      <Modal
        open={isAddRoleModalOpen}
        onOpenChange={setIsAddRoleModalOpen}
        title="Create New Role"
        description="Define a new role for system access"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddRoleModalOpen(false)}>Cancel</Button>
            <Button variant="gradient" onClick={() => addRoleMutation.mutate(editRole)}>Create Role</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label>Role Name</Label>
            <Input 
              placeholder="e.g. Technician" 
              onChange={e => setEditRole({...editRole, name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="What this role does..." 
              onChange={e => setEditRole({...editRole, description: e.target.value})} 
            />
          </div>
        </div>
      </Modal>

      {/* Delete Role Confirm */}
      <ConfirmModal
        open={isDeleteRoleModalOpen}
        onOpenChange={setIsDeleteRoleModalOpen}
        title="Delete Role"
        description={`Are you sure you want to delete the "${selectedRole?.name}" role? Users assigned to this role may lose access.`}
        onConfirm={() => selectedRole && deleteRoleMutation.mutate(selectedRole.id)}
      />
    </div>
  );
}
