import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Shield, User, Mail, Phone, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Modal, ConfirmModal } from "@/components/shared/Modal";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "manager" | "user" | "viewer";
  status: "active" | "inactive";
  avatar?: string;
  lastActive: string;
}

const dummyUsers: UserData[] = [
  { id: "USR-001", name: "John Doe", email: "john.doe@acme.com", phone: "+1 (555) 123-4567", role: "admin", status: "active", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", lastActive: "2 min ago" },
  { id: "USR-002", name: "Sarah Johnson", email: "sarah.j@techstart.io", phone: "+1 (555) 234-5678", role: "manager", status: "active", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", lastActive: "15 min ago" },
  { id: "USR-003", name: "Mike Chen", email: "mike.chen@globalsys.net", phone: "+1 (555) 345-6789", role: "user", status: "active", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", lastActive: "1 hour ago" },
  { id: "USR-004", name: "Emily Davis", email: "emily.d@innovlabs.co", phone: "+1 (555) 456-7890", role: "viewer", status: "inactive", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", lastActive: "3 days ago" },
  { id: "USR-005", name: "Alex Thompson", email: "alex.t@nextgen.com", phone: "+1 (555) 567-8901", role: "manager", status: "active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", lastActive: "30 min ago" },
  { id: "USR-006", name: "Lisa Wang", email: "lisa.w@cloudfirst.io", phone: "+1 (555) 678-9012", role: "user", status: "active", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", lastActive: "45 min ago" },
];

const roleColors: Record<string, string> = {
  admin: "bg-primary/15 text-primary",
  manager: "bg-accent/15 text-accent",
  user: "bg-success/15 text-success",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersRoles() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isRoleChangeModalOpen, setIsRoleChangeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
  });
  const [editUser, setEditUser] = useState<Partial<UserData>>({});

  const { data: users = [], isLoading, refetch } = useQuery<UserData[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get("/users");
      return response.data;
    },
  });

  const handleAddUser = async () => {
    try {
      await api.post("/users", newUser);
      setIsAddUserModalOpen(false);
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "user",
        phone: "",
      });
      refetch();
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/users/${selectedUser.id}`, editUser);
      setIsEditUserModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = (user: UserData, role: string) => {
    setSelectedUser(user);
    setNewRole(role);
    setIsRoleChangeModalOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/users/${selectedUser.id}`, { role: newRole });
      setIsRoleChangeModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to change role:", error);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const columns = [
    {
      key: "name",
      header: "User",
      render: (user: UserData) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} loading="lazy" />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (user: UserData) => (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{user.email}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (user: UserData) => (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{user.phone}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user: UserData) => (
        <Select
          value={user.role}
          onValueChange={(value) => handleRoleChange(user, value)}
        >
          <SelectTrigger className="w-32 h-8">
            <div className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", roleColors[user.role])}>
              {user.role}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" /> Admin
              </div>
            </SelectItem>
            <SelectItem value="manager">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" /> Manager
              </div>
            </SelectItem>
            <SelectItem value="user">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" /> User
              </div>
            </SelectItem>
            <SelectItem value="viewer">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> Viewer
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
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
      key: "lastActive",
      header: "Last Active",
      render: (user: UserData) => (
        <span className="text-sm text-muted-foreground">{user.lastActive}</span>
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
              setIsProfileModalOpen(true);
            }}>
              <Eye className="w-4 h-4 mr-2" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedUser(user);
              setEditUser(user);
              setIsEditUserModalOpen(true);
            }}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setSelectedUser(user);
                setIsDeleteModalOpen(true);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between opacity-0 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Button variant="gradient" onClick={() => setIsAddUserModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md opacity-0 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <DataTable columns={columns} data={filteredUsers} />
      </div>

      {/* Add User Modal */}
      <Modal
        open={isAddUserModalOpen}
        onOpenChange={setIsAddUserModalOpen}
        title="Add New User"
        description="Create a new user account with specific permissions"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleAddUser}>
              Add User
            </Button>
          </div>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="John Doe" 
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                placeholder="john@example.com" 
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password"
                placeholder="min. 8 characters" 
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                placeholder="+1 (555) 000-0000" 
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Initial Role</Label>
            <Select
              value={newUser.role}
              onValueChange={(value) => setNewUser({ ...newUser, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={isEditUserModalOpen}
        onOpenChange={setIsEditUserModalOpen}
        title="Edit User"
        description="Update user account details and permissions"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleUpdateUser}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="John Doe" 
                value={editUser.name || ""}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email"
                placeholder="john@example.com" 
                value={editUser.email || ""}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password"
                placeholder="Leave blank to keep current" 
                value={editUser.password || ""}
                onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                placeholder="+1 (555) 000-0000" 
                value={editUser.phone || ""}
                onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={editUser.role}
              onValueChange={(value) => setEditUser({ ...editUser, role: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={editUser.status}
              onValueChange={(value) => setEditUser({ ...editUser, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        title="User Profile"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>
              Close
            </Button>
            <Button variant="gradient" onClick={() => {
              setEditUser(selectedUser!);
              setIsEditUserModalOpen(true);
              setIsProfileModalOpen(false);
            }}>Edit Profile</Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={selectedUser.avatar} />
                <AvatarFallback className="text-2xl">{selectedUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                <p className="text-muted-foreground">{selectedUser.id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={selectedUser.status === "active" ? "success" : "muted"} className="capitalize">
                    {selectedUser.status}
                  </Badge>
                  <Badge className={cn("capitalize", roleColors[selectedUser.role])}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedUser.email}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Phone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedUser.phone}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">User ID</Label>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedUser.id}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Last Active</Label>
                <span>{selectedUser.lastActive}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Account Status</Label>
                  <p className="text-sm text-muted-foreground">Toggle user account activation</p>
                </div>
                <Switch checked={selectedUser.status === "active"} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Change Confirmation */}
      <ConfirmModal
        open={isRoleChangeModalOpen}
        onOpenChange={setIsRoleChangeModalOpen}
        title="Confirm Role Change"
        description={`Are you sure you want to change ${selectedUser?.name}'s role to "${newRole}"? This will update their permissions immediately.`}
        confirmLabel="Change Role"
        onConfirm={confirmRoleChange}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
