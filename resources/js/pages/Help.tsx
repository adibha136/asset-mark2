import { ChevronLeft, Info, Key, Shield, Globe, Terminal, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Help = () => {
  const navigate = useNavigate();

  const steps = [
    {
      title: "Register Application in Azure",
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      description: "Sign in to the Azure Portal and go to 'App registrations'. Create a new registration for this platform.",
      details: [
        "Go to Azure Portal > Entra ID (Active Directory) > App registrations",
        "Click '+ New registration'",
        "Name it something like 'AssetFlow Connector'",
        "Set redirect URI to Web: http://localhost:8000 (or your production URL)"
      ]
    },
    {
      title: "Configure API Permissions",
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      description: "Grant the application necessary permissions to read directory data using Microsoft Graph.",
      details: [
        "Select 'API permissions' > '+ Add a permission' > 'Microsoft Graph'",
        "Choose 'Application permissions'",
        "Add: 'User.Read.All', 'Organization.Read.All', 'Directory.Read.All'",
        "IMPORTANT: Click 'Grant admin consent for [Your Org]'"
      ]
    },
    {
      title: "Generate Client Secret",
      icon: <Key className="w-5 h-5 text-orange-500" />,
      description: "Create a secure secret that the platform will use to authenticate with Azure.",
      details: [
        "Select 'Certificates & secrets' > '+ New client secret'",
        "Add a description and set expiry (e.g., 24 months)",
        "COPY THE VALUE IMMEDIATELY (it will be hidden later)"
      ]
    },
    {
      title: "Enter Details in AssetFlow",
      icon: <Terminal className="w-5 h-5 text-green-500" />,
      description: "Copy the IDs from Azure and paste them into the Add Tenant form.",
      details: [
        "Tenant ID: Found on 'Overview' page",
        "Client ID: Found on 'Overview' page",
        "Client Secret: The value you copied in Step 3",
        "Domain: Your primary Microsoft domain (e.g., acme.onmicrosoft.com)"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuration Guide</h1>
          <p className="text-muted-foreground">How to connect a new organization via Microsoft Graph</p>
        </div>
      </div>

      <div className="grid gap-6">
        {steps.map((step, index) => (
          <Card key={index} className="glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 border-b pb-4">
              <div className="w-10 h-10 rounded-xl bg-background border flex items-center justify-center shadow-sm">
                {step.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">Step {index + 1}: {step.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {step.details.map((detail, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground font-medium">{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex gap-4 items-start">
            <Info className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Need technical assistance?</h3>
              <p className="text-sm text-primary/80">
                If you encounter "Unauthorized" or "Consent Required" errors, ensure that you have clicked 
                <strong> 'Grant admin consent'</strong> in the Azure Portal API Permissions tab. 
                This is a common step that is often missed.
              </p>
              <Button variant="primary" size="sm" className="mt-2" onClick={() => window.open('https://learn.microsoft.com/en-us/graph/auth-v2-service', '_blank')}>
                Read Official Graph Docs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
