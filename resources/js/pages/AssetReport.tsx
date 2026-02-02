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
import XLSX from "xlsx-js-style";
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
  assignedUsers?: any[];
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
    const workbook = XLSX.utils.book_new();
    
    // 1. Header
    const summaryData = [
      ["ASSET INVENTORY REPORT"],
      ["Report Date:", format(new Date(), "yyyy-MM-dd HH:mm")],
      [],
      ["ASSET RECORDS"],
    ];

    // 2. Data
    const exportData = filteredAssets.map(asset => {
      const assignedUsers = asset.assignedUsers || [];
      return {
        "Asset Name": asset.name,
        "Asset Type": asset.type,
        "Status": asset.status,
        "Serial Number": asset.serial_number || "-",
        "Assigned To": assignedUsers.map(u => u.name).join(", ") || asset.assignedto || "Unassigned",
        "User Email": assignedUsers.map(u => u.email).join(", ") || "-",
        "User Phone": assignedUsers.map(u => u.phone || u.mobile_phone || "-").join(", ") || "-",
        "User License": assignedUsers.map(u => u.license_name || "No License").join(", ") || "-",
        "Purchase Date": format(new Date(asset.created_at), "yyyy-MM-dd"),
        "Warranty Date": asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "yyyy-MM-dd") : "N/A",
      };
    });

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.sheet_add_json(worksheet, exportData, { origin: "A6" });

    // 3. Styles
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
    
    const titleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
      fill: { fgColor: { rgb: "1E293B" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "475569" } },
      alignment: { horizontal: "center" }
    };

    worksheet['A1'].s = titleStyle;
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 5, c });
      if (worksheet[cellAddress]) worksheet[cellAddress].s = headerStyle;
    }

    // Apply Auto-Alignment and Borders to Data Rows
    const dataCellStyle = {
      alignment: { vertical: "center", horizontal: "left" },
      border: {
        top: { style: "thin", color: { rgb: "E2E8F0" } },
        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
        left: { style: "thin", color: { rgb: "E2E8F0" } },
        right: { style: "thin", color: { rgb: "E2E8F0" } }
      }
    };

    for (let r = 6; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (worksheet[cellAddress]) {
          // Center align Type, Status, and Dates
          const isCenterCol = [1, 2, 8, 9].includes(c); 
          worksheet[cellAddress].s = {
            ...dataCellStyle,
            alignment: { ...dataCellStyle.alignment, horizontal: isCenterCol ? "center" : "left" }
          };
        }
      }
    }

    // Enable AutoFilter
    const tableRange = XLSX.utils.encode_range({
      s: { r: 5, c: range.s.c },
      e: { r: range.e.r, c: range.e.c }
    });
    worksheet['!autofilter'] = { ref: tableRange };

    worksheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, 
      { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }
    ];

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
