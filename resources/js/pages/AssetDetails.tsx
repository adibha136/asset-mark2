import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  ChevronLeft, 
  Package, 
  Calendar, 
  MapPin, 
  User, 
  History, 
  ShieldCheck, 
  FileText,
  Clock,
  ExternalLink,
  Edit,
  MoreVertical,
  Check,
  ChevronsUpDown,
  Zap,
  Download,
  Upload,
  Trash2
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import SummernoteEditor from "@/components/ui/summernote-editor";

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile_phone?: string;
  job_title?: string;
  profile_pic_url?: string;
  license_name?: string;
  department?: string;
  account_enabled?: boolean;
}

interface AssetDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  date: string;
}

interface AssetActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  date: string;
}

interface Asset {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  status: string;
  serialNumber: string;
  location: string;
  assignedTo: string;
  purchaseDate: string;
  warrantyUntil: string;
  cost: string;
  description: string;
  documents: AssetDocument[];
  history: AssetActivity[];
}

const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUserComboboxOpen, setIsUserComboboxOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    serial_number: "",
    status: "",
    description: "",
    warranty_expiry: "",
    cost: "",
    assignedTo: "",
  });

  const [statusForm, setStatusForm] = useState({
    status: "",
  });

  const { data: asset, isLoading, error, refetch } = useQuery<Asset>({
    queryKey: ["asset", id],
    queryFn: async () => {
      const response = await api.get(`/assets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: tenantUsers = [] } = useQuery<DirectoryUser[]>({
    queryKey: ["users", asset?.tenant_id],
    queryFn: async () => {
      const response = await api.get(`/tenants/${asset.tenant_id}/directory-users`);
      return response.data;
    },
    enabled: !!asset?.tenant_id && isAssignModalOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ userId, assetId }: { userId: string; assetId: string }) => {
      const response = await api.post(`/tenants/${asset.tenant_id}/assign-asset`, {
        user_id: userId,
        asset_id: assetId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset assigned successfully");
      setIsAssignModalOpen(false);
      setSelectedUser(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to assign asset");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(`/assets/${id}/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to upload document");
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  useEffect(() => {
    if (asset) {
      setEditForm({
        name: asset.name || "",
        type: asset.type || "",
        serial_number: asset.serialNumber || "",
        status: asset.status || "",
        description: asset.description || "",
        warranty_expiry: asset.warrantyUntil || "",
        cost: asset.cost || "",
        assignedTo: asset.assignedTo || "Unassigned",
      });
      setStatusForm({
        status: asset.status || "",
      });
    }
  }, [asset]);

  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      const response = await api.put(`/assets/${id}`, formData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Asset updated successfully");
      setIsEditModalOpen(false);
      setIsStatusModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update asset");
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(editForm);
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Merge status with other asset fields to satisfy backend validation
    updateMutation.mutate({
      ...editForm,
      status: statusForm.status
    });
  };

  if (isLoading) return <div className="p-8 text-center">Loading asset details...</div>;
  if (error || !asset) return <div className="p-8 text-center text-destructive">Error loading asset details.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/assets")}
            className="rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
              <Badge 
                variant={
                  editForm.status === 'active' || editForm.status === 'available' || editForm.status === 'assigned' ? "success" : 
                  editForm.status === 'damaged' ? "destructive" : 
                  "warning"
                } 
                className="capitalize"
              >
                {editForm.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">Serial: {asset.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button size="sm" className="btn-gradient">
            <ExternalLink className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        title="Edit Asset"
        description="Update the asset information below."
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm({ ...editForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="peripheral">Peripheral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={editForm.serial_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, serial_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
              <Input
                id="warranty_expiry"
                type="date"
                value={editForm.warranty_expiry}
                onChange={(e) => setEditForm(prev => ({ ...prev, warranty_expiry: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editForm.cost}
                onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <SummernoteEditor
                value={editForm.description}
                onChange={(content) => setEditForm(prev => ({ ...prev, description: content }))}
                placeholder="Additional details..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
      
      {/* Change Status Modal */}
      <Modal
        open={isStatusModalOpen}
        onOpenChange={setIsStatusModalOpen}
        title="Change Asset Status"
        description="Update the current status of this asset."
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status-dropdown">New Status</Label>
            <Select
              value={statusForm.status}
              onValueChange={(value) => setStatusForm({ status: value })}
            >
              <SelectTrigger id="status-dropdown">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Asset Modal */}
      <Modal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        title="Assign Asset"
        description={`Assign "${asset?.name}" to a user`}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="btn-gradient"
              onClick={() => {
                if (selectedUser && asset) {
                  assignMutation.mutate({ userId: selectedUser.id, assetId: asset.id });
                }
              }}
              disabled={!selectedUser || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Selected Asset</p>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{asset?.name}</p>
                <p className="text-xs text-muted-foreground">{asset?.type}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Select User</Label>
            <Popover open={isUserComboboxOpen} onOpenChange={setIsUserComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isUserComboboxOpen}
                  className="w-full justify-between font-normal bg-background"
                >
                  {selectedUser ? selectedUser.name : "Search for a user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      {tenantUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => {
                            setSelectedUser(user);
                            setIsUserComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{asset.type}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{asset.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned To:</span>
                  <span 
                    className="font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => setIsAssignModalOpen(true)}
                  >
                    {editForm.assignedTo}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Purchased:</span>
                  <span className="font-medium">{asset.purchaseDate}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Warranty:</span>
                  <span className="font-medium">{asset.warrantyUntil || "No warranty info"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="specs" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="specs" className="rounded-lg">Specifications</TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg">Activity History</TabsTrigger>
              <TabsTrigger value="files" className="rounded-lg">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="specs" className="mt-4">
              <Card className="glass-card border-none shadow-none">
                <CardContent className="pt-6">
                  {asset.description && (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div dangerouslySetInnerHTML={{ __html: asset.description }} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <Card className="glass-card border-none shadow-none">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {asset.history.map((item, index) => (
                      <div key={item.id} className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-[-24px] before:w-[2px] before:bg-border last:before:hidden">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">{item.action}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">by {item.user}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.date}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <Card className="glass-card border-none shadow-none">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-medium">Asset Documents</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        View and manage all documents related to this asset.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending}
                      >
                        {uploadMutation.isPending ? (
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload File
                      </Button>
                    </div>
                  </div>

                  {asset.documents && asset.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {asset.documents.map((doc: AssetDocument) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 group hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-background rounded-md border shadow-sm">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                <span className="uppercase">{doc.type || 'FILE'}</span>
                                <span>•</span>
                                <span>{doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'N/A'}</span>
                                <span>•</span>
                                <span>{doc.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-medium">No documents uploaded</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                        Upload purchase receipts, manuals, or warranty certificates.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Quick Stats/Actions */}
        <div className="space-y-6">
          <Card className="glass-card bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button 
                variant="outline" 
                className="w-full justify-start text-xs h-9 bg-background/50"
                onClick={() => setIsStatusModalOpen(true)}
              >
                <Edit className="h-3.5 w-3.5 mr-2" /> Change Status
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-background/50" onClick={() => setIsAssignModalOpen(true)}>
                <User className="h-3.5 w-3.5 mr-2" /> Assign to Someone
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-background/50">
                <MapPin className="h-3.5 w-3.5 mr-2" /> Relocate
              </Button>
              <Separator className="my-1" />
              <Button variant="ghost" className="w-full justify-start text-xs h-9 text-destructive hover:bg-destructive/10">
                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Report Issue
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Asset Lifecycle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Registered</span>
                <span className="font-medium">{asset.purchaseDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Age</span>
                <span className="font-medium">
                  {asset.purchaseDate ? `${Math.floor((new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))} months` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cost of Asset</span>
                <span className="font-medium">${asset.cost ? parseFloat(asset.cost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : "0.00"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
