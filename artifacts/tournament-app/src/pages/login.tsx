import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SolugenixLogo } from '@/components/SolugenixLogo';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    
    const success = login(username, password);
    if (success) {
      setLocation('/admin/dashboard');
    } else {
      setError('Invalid credentials. Only administrator access is permitted with username "admin" and password "admin123".');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-600/5 to-sky-500/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <SolugenixLogo size="lg" />
          </div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Enterprise Control Center
          </p>
        </div>

        <Card className="border border-sky-500/20 shadow-xl shadow-blue-500/5 backdrop-blur-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-['Outfit'] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Admin Portal Sign In
            </CardTitle>
            <CardDescription>Enter administrator credentials to access tournament management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4 pt-1" autoComplete="off">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold">Username</Label>
                <Input
                  id="username"
                  name="admin_user"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl text-sm"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                <Input
                  id="password"
                  name="admin_pwd"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl text-sm"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white shadow-lg shadow-blue-500/20 py-5 gap-2"
                data-testid="button-login"
              >
                <ShieldCheck className="h-4 w-4" />
                Sign In to Administration
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
