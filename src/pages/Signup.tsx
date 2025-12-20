// src/pages/Signup.jsx

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const OtpInput = ({ otp, setOtp, disabled }) => {
    const inputRefs = useRef([]);

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (!/^[0-9]$/.test(value) && value !== '') return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    
    return (
        <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
                <Input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-14 text-center text-2xl font-bold"
                    disabled={disabled}
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
};


const Signup = () => {
    // --- START OF THE FIX ---
    // Use the new functions from the AuthContext
    const { registerUser, verifyOtpAndLogin, loginWithGoogle, authLoading } = useAuth();
    // --- END OF THE FIX ---

    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);

    useEffect(() => {
        // Load Google Identity Services
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                });

                // Render the Google Sign-In button
                const buttonContainer = document.getElementById('google-signup-container');
                if (buttonContainer && window.google.accounts.id) {
                    window.google.accounts.id.renderButton(buttonContainer, {
                        theme: 'outline',
                        size: 'large',
                        width: '100%',
                        text: 'signup_with',
                        shape: 'rectangular',
                    });
                }
            }
        };

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleCredentialResponse = (response) => {
        loginWithGoogle(response.credential);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords do not match!");
        }

        // --- START OF THE FIX ---
        // Call the new registerUser function
        const result = await registerUser(formData.firstName, formData.lastName, formData.email, formData.password);

        if (result.success) {
            // Only open the OTP modal if registration was successful
            setIsOtpModalOpen(true);
        }
        // --- END OF THE FIX ---
    };

    const handleOtpSubmit = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6) {
            return toast.error("Please enter the full 6-digit code.");
        }
        
        // --- START OF THE FIX ---
        // Call the new verifyOtpAndLogin function
        const result = await verifyOtpAndLogin(formData.email, fullOtp, formData.password);

        if (result.success) {
            // On success, the context will handle navigation to the dashboard.
            // We can close the modal.
            setIsOtpModalOpen(false);
        } else {
            // On failure, clear the OTP input for another try
            setOtp(['', '', '', '', '', '']); 
        }
        // --- END OF THE FIX ---
    };

    return (
        <>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center space-y-2">
                        <Link to="/" className="flex justify-center items-center space-x-2">
                            <Sparkles className="h-7 w-7 text-purple-600" />
                            <span className="text-2xl font-bold">Greaby</span>
                        </Link>
                        <CardTitle className="text-2xl">Create an Account</CardTitle>
                        <CardDescription>Start creating amazing AI content in seconds.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignupSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={formData.firstName} onChange={handleChange} required disabled={authLoading} /></div>
                                <div className="space-y-1"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={formData.lastName} onChange={handleChange} required disabled={authLoading} /></div>
                            </div>
                            <div className="space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} required disabled={authLoading} /></div>
                            <div style={{display:'flex'}} className="gap-4">
                            <div className="space-y-1" style={{width:'50%'}}><Label htmlFor="password">Password</Label><Input id="password" type="password" value={formData.password} onChange={handleChange} required disabled={authLoading} /></div>
                            <div className="space-y-1" style={{width:'50%'}}><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required disabled={authLoading} /></div>
                            </div>
                            <Button type="submit" className="w-full" disabled={authLoading}>
                                {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-slate-50 px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>
                            <div id="google-signup-container" className="w-full"></div>
                            <p className="text-center text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isOtpModalOpen} onOpenChange={setIsOtpModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl">Verify Your Account</DialogTitle>
                        <DialogDescription className="text-center">
                            Enter the 6-digit code sent to <strong>{formData.email}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <OtpInput otp={otp} setOtp={setOtp} disabled={authLoading} />
                    </div>
                    <Button type="button" onClick={handleOtpSubmit} className="w-full" disabled={authLoading}>
                        {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify & Create Account
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Signup;