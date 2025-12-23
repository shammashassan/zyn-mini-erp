"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signIn, useSession } from "@/lib/auth-client";
import { Eye, EyeOff, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Preloader from "@/components/preloader";

interface SavedUser {
  name: string;
  email: string;
  image?: string | null;
  username?: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Form States
  const [emailOrUsername, setEmailOrUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  
  // UI States
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [savedUser, setSavedUser] = React.useState<SavedUser | null>(null);
  const [showPreloader, setShowPreloader] = React.useState(false);

  // 1. Check for saved user on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("ZynErp_recent_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedUser(parsed);
        // Pre-fill the input if they want to switch back to this user, 
        // or just use it for display.
        setEmailOrUsername(parsed.username || parsed.email);
      } catch (e) {
        localStorage.removeItem("ZynErp_recent_user");
      }
    }
  }, []);

  // 2. Handle redirect if ALREADY logged in (Session exists on mount)
  React.useEffect(() => {
    // We only redirect here if the preloader ISN'T showing.
    // If the preloader IS showing, it handles its own redirect via onComplete.
    if (session && !showPreloader && !isLoading) {
      router.replace("/dashboard");
    }
  }, [session, router, showPreloader, isLoading]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const isEmail = emailOrUsername.includes('@');
      let result;

      if (isEmail) {
        result = await signIn.email({
          email: emailOrUsername,
          password,
        });
      } else {
        result = await signIn.username({
          username: emailOrUsername,
          password,
        });
      }

      if (result.error) {
        toast.error("Invalid credentials", {
          description: "Please check your password and try again."
        });
        setIsLoading(false);
        return;
      }

      // ✅ FIX: Save User to LocalStorage IMMEDIATELY upon success
      if (rememberMe && result.data?.user) {
        const userData: SavedUser = {
          name: result.data.user.name,
          email: result.data.user.email,
          image: result.data.user.image,
          username: (result.data.user as any).username, // Type assertion if username isn't in default types
        };
        localStorage.setItem("ZynErp_recent_user", JSON.stringify(userData));
      }

      toast.success("Login successful!");
      
      // Start the preloader animation (which handles the redirect when finished)
      setShowPreloader(true);

    } catch (error: any) {
      console.log("Unexpected error:", error);
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    setSavedUser(null);
    setEmailOrUsername("");
    setPassword("");
    localStorage.removeItem("ZynErp_recent_user");
  };

  return (
    <div className={cn("flex flex-col gap-6 dark text-foreground", className)} {...props}>
      
      {showPreloader && (
        <Preloader 
          mode="wait"
          onComplete={() => {
            router.push('/dashboard?welcome=true');
          }} 
        />
      )}

      {/* Modern Glass Card */}
      <Card className="overflow-hidden p-0 border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          
          <form onSubmit={handleLogin} className="p-6 md:p-12 flex flex-col justify-center relative">
            <div className="flex flex-col gap-6">

              {/* AVATAR SECTION */}
              {savedUser && (
                <div className="flex justify-center animate-in fade-in zoom-in duration-300">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-indigo-500/30 shadow-2xl transition-transform group-hover:scale-105">
                      <AvatarImage src={savedUser.image || undefined} />
                      <AvatarFallback className="bg-indigo-600 text-white text-2xl font-semibold">
                        {savedUser.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={handleSwitchAccount}
                      className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 border border-white/10 shadow-lg hover:bg-red-900/80 transition-colors"
                      title="Switch Account"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* HEADER SECTION */}
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {savedUser ? `Welcome back, ${savedUser.name.split(' ')[0]}` : "Welcome back"}
                </h1>
                <div className="text-zinc-400 text-sm mt-2">
                  {savedUser ? (
                    <div className="flex flex-col gap-1 items-center">
                       <span className="font-medium text-zinc-300">{savedUser.email}</span>
                       <button 
                          type="button" 
                          onClick={handleSwitchAccount}
                          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          Not you? Switch account
                        </button>
                    </div>
                  ) : (
                    "Login to your Company Dashboard"
                  )}
                </div>
              </div>

              {/* INPUTS SECTION */}
              <div className="grid gap-4">
                
                {!savedUser && (
                  <div className="grid gap-2">
                    <Label htmlFor="email-username" className="text-zinc-300">Email or Username</Label>
                    <Input
                      id="email-username"
                      type="text"
                      required
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="Enter your Email or Username"
                      disabled={isLoading}
                      className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11"
                    />
                  </div>
                )}
                
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-zinc-300">Password</Label>
                    <Link
                      href="#"
                      className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {!savedUser && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/10 bg-zinc-900/50 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 accent-indigo-600"
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-400"
                    >
                      Remember login info
                    </Label>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 mt-2 font-medium transition-all duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border-0" 
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </div>
            </div>
          </form>
          
          <div className="relative hidden md:flex items-center justify-center p-12 bg-zinc-900/50">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 to-transparent" />
            <img
              src="/Company_logo.png"
              alt="Company Logo"
              className="relative z-10 w-full object-contain rounded-lg shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x800/1e1e2e/FFFFFF?text=Company Name'; }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}