import React, { useState, useEffect } from "react";
import { 
  Phone, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  ChevronRight,
  User,
  MapPin,
  ClipboardList,
  Target,
  DollarSign,
  MessageSquare,
  ArrowLeft,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import { useNextElecomToken } from "@/hooks/useNextElecomToken";

interface Customer {
  id?: string;
  name: string;
  phone: string;
  email: string;
  type: string;
}

interface OtpState {
  stage: "customer-list" | "otp" | "lead-form";
  mobile: string;
  customerName: string;
  otp: string;
  timeRemaining: number;
}

interface LeadFormData {
  customer_name: string;
  address: string;
  purpose_of_visit: string;
  interested_product: string;
  budget: string;
  remarks: string;
}

export default function CustomerVerification() {
  const { getToken } = useNextElecomToken();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [otpState, setOtpState] = useState<OtpState>({
    stage: "customer-list",
    mobile: "",
    customerName: "",
    otp: "",
    timeRemaining: 0,
  });

  const [leadForm, setLeadForm] = useState<LeadFormData>({
    customer_name: "",
    address: "",
    purpose_of_visit: "",
    interested_product: "",
    budget: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const token = await getToken();
    if (!token) {
      setError("No API connection configured. Please configure in Settings first.");
      setLoadingCustomers(false);
      return;
    }

    try {
      setLoadingCustomers(true);
      const response = await fetch("/api/nextelecom/proxy-customers", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customers: HTTP ${response.status}`);
      }

      const data = await response.json();
      let items: Customer[] = [];
      
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data?.data?.customers)) {
        items = data.data.customers;
      } else if (Array.isArray(data?.data)) {
        items = data.data;
      }

      setCustomers(items);
      setFilteredCustomers(items);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const filtered = customers.filter(c =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customerSearch, customers]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpState.stage === "otp" && otpState.timeRemaining > 0) {
      timer = setInterval(() => {
        setOtpState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpState.stage, otpState.timeRemaining]);

  const selectCustomer = (customer: Customer) => {
    setOtpState(prev => ({
      ...prev,
      mobile: customer.phone,
      customerName: customer.name,
    }));
    sendOtp(customer.phone);
  };

  const sendOtp = async (mobile?: string) => {
    const phoneToUse = mobile || otpState.mobile;
    
    if (!phoneToUse.trim()) {
      setError("Please select a customer or enter a mobile number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phoneToUse.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpState(prev => ({
          ...prev,
          mobile: phoneToUse,
          stage: "otp",
          timeRemaining: 300,
        }));
        setSuccess("OTP sent successfully!");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpState.otp.trim() || otpState.otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: otpState.mobile,
          otp: otpState.otp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpState(prev => ({
          ...prev,
          stage: "lead-form",
        }));
        setSuccess("OTP verified successfully!");
      } else {
        setError(data.message || "Failed to verify OTP");
      }
    } catch (err: any) {
      setError(err.message || "Error verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: otpState.mobile }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpState(prev => ({
          ...prev,
          otp: "",
          timeRemaining: 300,
        }));
        setSuccess("OTP resent successfully!");
      } else {
        setError(data.message || "Failed to resend OTP");
      }
    } catch (err: any) {
      setError(err.message || "Error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  const submitLeadForm = async () => {
    if (!leadForm.customer_name.trim()) {
      setError("Please enter customer name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: otpState.mobile,
          ...leadForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Lead captured successfully!");
        setOtpState({ stage: "customer-list", mobile: "", customerName: "", otp: "", timeRemaining: 0 });
        setLeadForm({
          customer_name: "",
          address: "",
          purpose_of_visit: "",
          interested_product: "",
          budget: "",
          remarks: "",
        });
      } else {
        setError(data.message || "Failed to capture lead");
      }
    } catch (err: any) {
      setError(err.message || "Error submitting form");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const steps = [
    { id: "customer-list", title: "Select Customer", icon: Search },
    { id: "otp", title: "Verification", icon: Lock },
    { id: "lead-form", title: "Lead Details", icon: ClipboardList },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === otpState.stage);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Verification</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Complete the verification process to capture high-quality customer leads
        </p>
      </div>

      {/* Stepper */}
      <div className="relative flex justify-between items-center max-w-xl mx-auto px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isActive ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-background border-muted text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20 scale-110"
                )}
              >
                {idx < currentStepIndex ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-xs font-medium absolute -bottom-6 whitespace-nowrap",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-4">
        {error && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-emerald-500/50 bg-emerald-500/5 text-emerald-600 animate-in slide-in-from-top-2 duration-300 mb-6">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {otpState.stage === "customer-list" && (
          <Card className="shadow-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Select Customer
              </CardTitle>
              <CardDescription>
                Search and select a customer from NexTelecom to begin verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="search">Search Customer</Label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="search"
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or mobile..."
                    className="pl-10 h-12 bg-muted/30 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              <div className="border rounded-xl overflow-hidden bg-muted/5">
                <div className="max-h-[350px] overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">Fetching customers...</span>
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <Search className="w-10 h-10 opacity-20" />
                      <p className="text-sm">No customers found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {filteredCustomers.map((customer, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectCustomer(customer)}
                          disabled={loading}
                          className="w-full text-left px-5 py-4 hover:bg-primary/5 transition-all flex items-center justify-between group disabled:opacity-50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                              {customer.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {customer.name}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {customer.phone}
                                </span>
                                {customer.type && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                                    {customer.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              Select
                            </span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t py-4 justify-center">
              <p className="text-xs text-muted-foreground text-center">
                Can't find a customer? Make sure they are registered in NexTelecom CRM
              </p>
            </CardFooter>
          </Card>
        )}

        {otpState.stage === "otp" && (
          <Card className="shadow-xl border-border/50 animate-in zoom-in-95 duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Enter OTP</CardTitle>
              <CardDescription>
                We've sent a 6-digit verification code to
                <span className="block font-semibold text-foreground mt-1">{otpState.mobile}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 flex flex-col items-center">
              <InputOTP
                maxLength={6}
                value={otpState.otp}
                onChange={(val) => setOtpState({ ...otpState, otp: val })}
                className="gap-2"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                </InputOTPGroup>
              </InputOTP>

              <div className="w-full space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <RefreshCw className={cn("w-3 h-3", otpState.timeRemaining > 0 && "animate-spin")} />
                    Resend available in {formatTime(otpState.timeRemaining)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resendOtp}
                    disabled={loading || otpState.timeRemaining > 0}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Resend Code
                  </Button>
                </div>

                <Button
                  onClick={verifyOtp}
                  disabled={loading || otpState.otp.length !== 6}
                  className="w-full h-12 text-base font-semibold"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setOtpState({ ...otpState, stage: "customer-list", otp: "", mobile: "", customerName: "" })}
                  className="w-full h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Customer List
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {otpState.stage === "lead-form" && (
          <Card className="shadow-xl border-border/50 animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle>Capture Lead Details</CardTitle>
                  <CardDescription>
                    Fill in the requirements for <strong>{otpState.customerName}</strong>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer_name" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="customer_name"
                      value={leadForm.customer_name || otpState.customerName}
                      onChange={(e) => setLeadForm({ ...leadForm, customer_name: e.target.value })}
                      className="pl-10 h-11 bg-muted/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Mobile Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={otpState.mobile}
                      disabled
                      className="pl-10 h-11 bg-muted/50 cursor-not-allowed opacity-80"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Installation Address
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={leadForm.address}
                      onChange={(e) => setLeadForm({ ...leadForm, address: e.target.value })}
                      placeholder="Street, City, Building..."
                      className="pl-10 min-h-[80px] bg-muted/20 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Purpose of Visit
                  </Label>
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="purpose"
                      value={leadForm.purpose_of_visit}
                      onChange={(e) => setLeadForm({ ...leadForm, purpose_of_visit: e.target.value })}
                      placeholder="e.g., New service inquiry"
                      className="pl-10 h-11 bg-muted/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Interested Product
                  </Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="product"
                      value={leadForm.interested_product}
                      onChange={(e) => setLeadForm({ ...leadForm, interested_product: e.target.value })}
                      placeholder="e.g., Broadband, Mobile"
                      className="pl-10 h-11 bg-muted/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Budget Range
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="budget"
                      value={leadForm.budget}
                      onChange={(e) => setLeadForm({ ...leadForm, budget: e.target.value })}
                      placeholder="e.g., $1000 - $5000"
                      className="pl-10 h-11 bg-muted/20"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="remarks" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                    Additional Remarks
                  </Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea
                      id="remarks"
                      value={leadForm.remarks}
                      onChange={(e) => setLeadForm({ ...leadForm, remarks: e.target.value })}
                      placeholder="Any specific customer requirements..."
                      className="pl-10 min-h-[80px] bg-muted/20 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button
                  onClick={submitLeadForm}
                  disabled={loading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg shadow-emerald-600/20"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Lead Capture"}
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOtpState({ stage: "customer-list", mobile: "", customerName: "", otp: "", timeRemaining: 0 });
                    setLeadForm({
                      customer_name: "",
                      address: "",
                      purpose_of_visit: "",
                      interested_product: "",
                      budget: "",
                      remarks: "",
                    });
                  }}
                  className="w-full h-11 text-muted-foreground hover:text-foreground"
                >
                  Cancel and Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
