import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
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
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Tenant {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  serial_number?: string;
  warranty_expiry?: string;
  created_at: string;
  assignedto?: string;
}

export default function AssetReport() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const response = await api.get("/tenants");
      return response.data;
    },
  });

  useEffect(() => {
    if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["assets", "report", selectedTenantId],
    queryFn: async () => {
      const response = await api.get(`/tenants/${selectedTenantId}/assets`);
      return response.data;
    },
    enabled: !!selectedTenantId,
  });

  const selectedTenant = useMemo(() => 
    tenants.find(t => t.id === selectedTenantId),
  [tenants, selectedTenantId]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assignedto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchesType = typeFilter === "all" || asset.type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [assets, searchQuery, statusFilter, typeFilter]);

  const columns = [
    { key: "name", header: "Asset Name", className: "font-medium" },
    { key: "assignedto", header: "Assigned To" },
    { key: "type", header: "Asset Type" },
    { 
      key: "created_at", 
      header: "Purchase Date",
      render: (item: Asset) => format(new Date(item.created_at), "MMM dd, yyyy")
    },
    { 
      key: "warranty_expiry", 
      header: "Warranty Date",
      render: (item: Asset) => item.warranty_expiry 
        ? format(new Date(item.warranty_expiry), "MMM dd, yyyy") 
        : "N/A"
    },
  ];

  const exportToExcel = () => {
    const exportData = filteredAssets.map(asset => ({
      "Asset Name": asset.name,
      "Assigned To": asset.assignedto || "Unassigned",
      "Asset Type": asset.type,
      "Purchase Date": format(new Date(asset.created_at), "yyyy-MM-dd"),
      "Warranty Date": asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "yyyy-MM-dd") : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, `Asset_Report_${selectedTenant?.name || "All"}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `${selectedTenant?.name || "All Tenants"} Asset Report`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "PPP")}`, 14, 30);

    const tableData = filteredAssets.map(asset => [
      asset.name,
      asset.assignedto || "Unassigned",
      asset.type,
      format(new Date(asset.created_at), "yyyy-MM-dd"),
      asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "yyyy-MM-dd") : "N/A",
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Asset Name", "Assigned To", "Asset Type", "Purchase Date", "Warranty Date"]],
      body: tableData,
    });

    doc.save(`Asset_Report_${selectedTenant?.name || "All"}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedTenant ? `${selectedTenant.name} Asset Report` : "Asset Report"}
          </h1>
          <p className="text-muted-foreground">
            View and export asset inventory reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF} className="gap-2">
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="license">License</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={statusFilter !== 'all' ? "secondary" : "outline"} size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                  {statusFilter !== 'all' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter By Status</div>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Records
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('available')}>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Available Assets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('assigned')}>
                  <Zap className="w-4 h-4 mr-2 text-blue-500" /> Assigned Assets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
                className="h-9 px-2 text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredAssets}
          isLoading={isLoading}
          emptyState={
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-muted/10">
              <Filter className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold">No assets found</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                No assets match your search or selected filters.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
