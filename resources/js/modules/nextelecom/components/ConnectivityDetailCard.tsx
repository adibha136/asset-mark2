import React from "react";
import {
  MapPin,
  Wifi,
  Zap,
  Package,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConnectivityDetail {
  connectivityID: string;
  name: string;
  carrier: string;
  provisioning: { status: string };
  serviceAvailability: { currentStatus: string; cpeMac: string | null };
  productDetails: Array<{
    name: string;
    fields: { Speed: string };
    priceGST: string;
  }>;
  serviceLocation: {
    streetNumber: string;
    streetName: string;
    streetType: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  ipAddressing: { ipList: (string | null)[] };
  accessDetails: { AVCID: string };
  outage: { plannedOutage: boolean; unplannedOutage: boolean };
}

interface ConnectivityDetailCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionID: string | null;
  data: ConnectivityDetail | null;
  loading: boolean;
  error: string | null;
}

const getStatusColor = (status: string) => {
  if (status === "LIVE" || status === "Complete") return "text-emerald-600";
  if (status?.includes("CANCELLED")) return "text-rose-600";
  if (status?.includes("PROVISIONING") || status === "In Progress")
    return "text-amber-600";
  return "text-slate-600";
};

const getStatusBgColor = (status: string) => {
  if (status === "LIVE" || status === "Complete")
    return "bg-emerald-500/10 text-emerald-600";
  if (status?.includes("CANCELLED")) return "bg-rose-500/10 text-rose-600";
  if (status?.includes("PROVISIONING") || status === "In Progress")
    return "bg-amber-500/10 text-amber-600";
  return "bg-slate-500/10 text-slate-600";
};

export default function ConnectivityDetailCard({
  open,
  onOpenChange,
  connectionID,
  data,
  loading,
  error,
}: ConnectivityDetailCardProps) {
  if (!data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              <span className="text-sm font-medium">Loading details...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/5 p-4 text-rose-600 text-sm">
              {error}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <AlertCircle className="w-10 h-10 opacity-20" />
              <p className="text-sm">No data found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  const fullAddress = `${data?.serviceLocation?.streetNumber || ""} ${data?.serviceLocation?.streetName || ""} ${data?.serviceLocation?.streetType || ""}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{data.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Header Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg mb-2">{data?.name || "N/A"}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Carrier: <span className="font-medium">{data?.carrier || "N/A"}</span>
                  </p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBgColor(data?.serviceAvailability?.currentStatus || "")}`}
                >
                  {data?.serviceAvailability?.currentStatus || "UNKNOWN"}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Status Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" />
                <h3 className="font-semibold">Status Information</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Provision Status</span>
                <span
                  className={`font-medium ${getStatusColor(data?.provisioning?.status || "")}`}
                >
                  {data?.provisioning?.status || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Status</span>
                <span
                  className={`font-medium ${getStatusColor(data?.serviceAvailability?.currentStatus || "")}`}
                >
                  {data?.serviceAvailability?.currentStatus || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Product Details Section */}
          {data?.productDetails && data.productDetails.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4" />
                  <h3 className="font-semibold">Product Details</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Product Name</span>
                  <span className="font-medium">{data.productDetails[0]?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Speed</span>
                  <span className="font-medium">
                    {data.productDetails[0]?.fields?.Speed || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    {data.productDetails[0]?.priceGST || "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No product info</p>
              </CardContent>
            </Card>
          )}

          {/* Location Details Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                <h3 className="font-semibold">Location Details</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Address:</span>
                <p className="font-medium">{fullAddress || "N/A"}</p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Suburb:</span>
                <p className="font-medium">{data?.serviceLocation?.suburb || "N/A"}</p>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium">{data?.serviceLocation?.state || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Postcode</span>
                <span className="font-medium">{data?.serviceLocation?.postcode || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Network Details Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4" />
                <h3 className="font-semibold">Network Details</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">IP Address(es):</span>
                {data?.ipAddressing?.ipList &&
                data.ipAddressing.ipList.length > 0 &&
                data.ipAddressing.ipList[0] ? (
                  <div className="font-medium space-y-1 mt-1">
                    {data.ipAddressing.ipList.map((ip, idx) => (
                      <div key={idx}>{ip || "N/A"}</div>
                    ))}
                  </div>
                ) : (
                  <p className="font-medium">No IP available</p>
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">MAC Address</span>
                <span className="font-medium">
                  {data?.serviceAvailability?.cpeMac || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Access Details Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4" />
                <h3 className="font-semibold">Access Details</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">AVCID</span>
                <span className="font-medium">{data?.accessDetails?.AVCID || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Outage Information Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                <h3 className="font-semibold">Outage Information</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Planned Outage</span>
                <span className="font-medium">
                  {data?.outage?.plannedOutage ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Unplanned Outage</span>
                <span className="font-medium">
                  {data?.outage?.unplannedOutage ? "Yes" : "No"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
