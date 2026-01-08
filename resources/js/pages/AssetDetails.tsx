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
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Modal } from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    serial_number: "",
    status: "",
    description: "",
    warranty_expiry: "",
  });

  const { data: asset, isLoading, error, refetch } = useQuery({
    queryKey: ["asset", id],
    queryFn: async () => {
      const response = await api.get(`/assets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (asset) {
      setEditForm({
        name: asset.name || "",
        type: asset.type || "",
        serial_number: asset.serialNumber || "",
        status: asset.status || "",
        description: asset.description || "",
        warranty_expiry: asset.warrantyUntil || "",
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
              <Badge variant={asset.status === 'active' || asset.status === 'available' ? "success" : "warning"} className="capitalize">{asset.status}</Badge>
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
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
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
                onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
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
            <div className="space-y-2 col-span-2">
              <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
              <Input
                id="warranty_expiry"
                type="date"
                value={editForm.warranty_expiry}
                onChange={(e) => setEditForm({ ...editForm, warranty_expiry: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
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
                  <span className="font-medium text-primary hover:underline cursor-pointer">{asset.assignedTo}</span>
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
              {asset.description && (
                <div className="col-span-2 pt-4">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</span>
                  <p className="text-sm mt-1">{asset.description}</p>
                </div>
              )}
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
                <CardContent className="pt-6 grid sm:grid-cols-2 gap-x-12 gap-y-6">
                  {Object.entries(asset.specs).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{key}</p>
                      <p className="text-sm font-medium">{value}</p>
                      <Separator className="mt-2 opacity-50" />
                    </div>
                  ))}
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
                            <p className="text-xs text-muted-foreground">by {item.user}</p>
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
              <Card className="glass-card border-none shadow-none text-center py-12">
                <CardContent>
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium">No documents uploaded</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Upload purchase receipts, manuals, or warranty certificates.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Upload File
                  </Button>
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
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-background/50">
                <Edit className="h-3.5 w-3.5 mr-2" /> Change Status
              </Button>
              <Button variant="outline" className="w-full justify-start text-xs h-9 bg-background/50">
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
                <span className="text-muted-foreground">Estimated Value</span>
                <span className="font-medium">$2,499.00</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
