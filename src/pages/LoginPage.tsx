import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, Eye, EyeOff, HardDrive, Shield, Cloud, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast({
        title: 'Validation Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await signIn(email.toLowerCase(), password);
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('lastEmail');
      }

      toast({
        title: 'Welcome Back!',
        description: 'Successfully logged in to EpicBox',
      });
      navigate('/');
    } catch (error) {
      const description =
        error instanceof Error && error.message === 'Invalid login credentials'
          ? 'No account with this email and password was found in the new Supabase project. Create a new account first, or check your password.'
          : error instanceof Error
            ? error.message
            : 'Invalid credentials';
      toast({
        title: 'Login Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe');
    const lastEmail = localStorage.getItem('lastEmail');
    if (remembered === 'true' && lastEmail) {
      setEmail(lastEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden xl:flex xl:w-1/2 bg-gradient-to-br from-primary via-primary/95 to-secondary relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Floating icons */}
        <div className="absolute inset-0 pointer-events-none">
          <Shield className="absolute top-20 left-20 w-12 h-12 text-white/10 animate-float" />
          <Lock className="absolute top-40 right-32 w-10 h-10 text-white/10 animate-float" style={{ animationDelay: '1s' }} />
          <Cloud className="absolute bottom-32 left-40 w-14 h-14 text-white/10 animate-float" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <HardDrive className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">EpicBox</h1>
                <p className="text-white/80 text-sm">Enterprise File Storage</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6 mt-12">
              <h2 className="text-3xl font-bold">Secure Cloud Storage for Your Business</h2>
              <p className="text-white/90 text-lg">
                Store, manage, and share your files with enterprise-grade security and reliability.
              </p>

              <div className="space-y-4 mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">End-to-End Encryption</h3>
                    <p className="text-white/80 text-sm">Your files are encrypted during storage and transmission</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Cloud Accessibility</h3>
                    <p className="text-white/80 text-sm">Access your files from anywhere, anytime</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Advanced Security</h3>
                    <p className="text-white/80 text-sm">Multi-layer security with role-based access control</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="xl:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">EpicBox</h1>
              <p className="text-muted-foreground text-xs">Enterprise File Storage</p>
            </div>
          </div>

          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Link to="/forgot-password">
                    <button
                      type="button"
                      className="text-sm text-secondary hover:underline font-medium"
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    New to EpicBox?
                  </span>
                </div>
              </div>

              {/* Sign Up Link */}
              <div className="text-center">
                <Link to="/register">
                  <Button variant="outline" className="w-full h-11" disabled={loading}>
                    Create an Account
                  </Button>
                </Link>
              </div>

              {/* Additional Info */}
              <p className="text-xs text-center text-muted-foreground mt-6">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 EpicBox</p>
          </div>
        </div>
      </div>
    </div>
  );
}
