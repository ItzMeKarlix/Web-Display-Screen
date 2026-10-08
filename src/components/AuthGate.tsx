import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Lock, Loader2, PlayCircle, Eye, EyeOff } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

export const IS_AUTHENTICATED_KEY = 'display_board_auth';

// Helper for Password Input
function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input 
        {...props} 
        type={show ? "text" : "password"} 
        className={`pr-10 ${props.className || ''}`} 
      />
      <button 
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean; 
}

export default function AuthGate({ children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkSecurity();
  },[]);

  const checkSecurity = async () => {
    try {
      // 1. Check if security is enabled in DB
      const { data: settings, error } = await supabase
        .from('settings')
        .select('security_enabled')
        .single();
      
      if (error) throw error;

      if (!settings?.security_enabled) {
        setIsLocked(false);
        setLoading(false);
        return;
      }

      // 2. Security Enabled - Check if Password is Set
      const { data: isPasswordSet, error: rpcError } = await supabase
        .rpc('is_password_set');

      if (rpcError) {
         console.warn('RPC check failed, assuming password set', rpcError);
      }

      if (isPasswordSet === false) {
         setIsLocked(true);
         setIsSetupMode(true);
         setLoading(false);
         return;
      }

      // 3. Password Set - Check Local Session
      const localAuth = sessionStorage.getItem(IS_AUTHENTICATED_KEY);
      if (localAuth === 'true') {
         setIsLocked(false);
         setIsAuthenticated(true);
      } else {
         setIsLocked(true);
         setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Auth Check Error:', err);
      setIsLocked(true); 
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
    }
    if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
    }

    setVerifying(true);
    try {
        const { data: created, error } = await supabase
            .rpc('setup_admin_password', { new_password: password });

        if (error) throw error;
        if (!created) throw new Error('Password is already configured or does not meet requirements');

        sessionStorage.setItem(IS_AUTHENTICATED_KEY, 'true');
        toast.success("Security Configured");
        setIsLocked(false);
        setIsAuthenticated(true);
    } catch (error) {
        console.error('Setup Error:', error);
        toast.error('Failed to set password');
    } finally {
        setVerifying(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) return;

    setVerifying(true);
    try {
      const { data: isValid, error } = await supabase
        .rpc('verify_admin_password', { attempt: password });

      if (error) throw error;

      if (isValid) {
        sessionStorage.setItem(IS_AUTHENTICATED_KEY, 'true');
        setIsLocked(false);
        setIsAuthenticated(true);
        toast.success('Access Granted');
      } else {
        toast.error('Incorrect Password');
        setPassword('');
      }
    } catch (err) {
      console.error('Login Error:', err);
      toast.error('Login Failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Setup Mode
  if (isLocked && isSetupMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Toaster position="bottom-right" />
        <Card className="w-full max-w-md shadow-xl border-blue-200">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Setup Security</CardTitle>
            <CardDescription>
              Security is enabled but no password is set. Please configure an admin password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <PasswordInput
                  placeholder="Create Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={verifying}
                  autoFocus
                />
                <PasswordInput
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={verifying}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Password & Login
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t p-4">
             <p className="text-xs text-slate-400">Display Board System</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If locked, show Login Screen
  if (isLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Toaster position="bottom-right" />
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-slate-200 p-3">
                <Lock className="h-6 w-6 text-slate-700" />
              </div>
            </div>
            <CardTitle className="text-2xl">Restricted Access</CardTitle>
            <CardDescription>
              Please enter the access password to view this content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <PasswordInput
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={verifying}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unlock
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t p-4">
             <p className="text-xs text-slate-400">Display Board System</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If not locked, render children
  return <>{children}</>;
}
