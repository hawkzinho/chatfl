import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Loader2, Sparkles, Users, Zap, Shield, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up form state
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signInSchema.safeParse({
      email: signInEmail,
      password: signInPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    const { error } = await signIn(signInEmail, signInPassword);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
      return;
    }
    
    navigate('/');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signUpSchema.safeParse({
      username: signUpUsername,
      email: signUpEmail,
      password: signUpPassword,
      confirmPassword: signUpConfirmPassword,
    });
    
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpUsername);
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    
    setActiveTab('signin');
  };

  const features = [
    { icon: Zap, label: 'Lightning Fast', desc: 'Real-time messaging with instant delivery', color: 'from-primary to-cyan-400' },
    { icon: Users, label: 'Team Channels', desc: 'Create rooms & invite your squad', color: 'from-accent to-pink-400' },
    { icon: Shield, label: 'Secure', desc: 'End-to-end encrypted conversations', color: 'from-green-400 to-emerald-500' },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="absolute inset-0 pattern-grid opacity-30" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-20 right-[15%] w-96 h-96 bg-accent/15 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
      
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center p-12 relative z-10">
        <div className="max-w-lg text-center space-y-10">
          {/* Logo */}
          <div className="inline-flex items-center justify-center animate-fade-in">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-primary rounded-[2rem] opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500" />
              <div className="relative w-28 h-28 rounded-3xl bg-gradient-primary flex items-center justify-center glow-neon">
                <MessageCircle className="w-14 h-14 text-primary-foreground" />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center animate-bounce-in" style={{ animationDelay: '0.3s' }}>
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
            </div>
          </div>

          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-6xl font-bold">
              <span className="text-gradient">ChatFlow</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Where conversations come alive
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 pt-6">
            {features.map((feature, i) => (
              <div 
                key={feature.label} 
                className="flex items-center gap-5 p-5 rounded-2xl glass hover-lift cursor-default animate-fade-in-up"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-lg text-foreground">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 pt-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="text-center">
              <p className="text-3xl font-bold text-gradient">10K+</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Users</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gradient">1M+</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Messages</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Global</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center space-y-4 animate-fade-in">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center glow">
                  <MessageCircle className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gradient">ChatFlow</h1>
          </div>

          {/* Auth Card */}
          <div className="glass-strong rounded-3xl p-8 animate-scale-in neon-border">
            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-muted/30 mb-8">
              <button
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'signin'
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'signup'
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Sign In Form */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="glow"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="text-sm font-medium text-foreground">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="cooluser123"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">Confirm</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-xl bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  variant="glow"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
            By continuing, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;