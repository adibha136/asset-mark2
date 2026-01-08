import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Attempt real login with your Laravel backend
      const response = await api.post("/login", {
        email,
        password,
      });

      if (response.data.token) {
        login(response.data.user, response.data.token);
        window.location.href = "/";
      } else {
        throw new Error("No token received");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      const message = err.response?.data?.message || "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="bg-primary p-3 rounded-2xl shadow-glow">
            <LogIn className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <Card className="glass-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
            {error && (
              <div className="mt-2 p-2 text-xs text-center bg-destructive/10 text-destructive rounded-lg border border-destructive/20 animate-in fade-in zoom-in duration-200">
                {error}
              </div>
            )}
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  required
                  className="input-focus"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button variant="link" type="button" className="px-0 font-normal text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  className="input-focus"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full btn-gradient" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="px-1 font-medium text-primary hover:underline">
            Request access
          </Button>
        </p>
      </div>
    </div>
  );
};

export default Login;
