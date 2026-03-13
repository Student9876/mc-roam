import { useState } from 'react';
import { Register, Login } from '../../wailsjs/go/backend/App';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("Ready");
    const navigate = useNavigate(); // Hook to change pages

    const doLogin = async () => {
        if (!username || !password) return;
        setStatus("Logging in...");

        // Call Go Backend
        const result = await Login(username, password);

        if (result.startsWith("Success")) {
            // Save user info locally if needed (optional)
            // Navigate to Dashboard
            sessionStorage.setItem("mc_username", username);
            navigate("/dashboard");
        } else {
            setStatus(result);
        }
    };

    const doRegister = async () => {
        if (!username || !password) return;
        setStatus("Registering...");
        const result = await Register(username, password);
        setStatus(result);
    };

    return (
        <div className="h-screen flex items-center justify-center bg-[var(--color-bg-root)]">
            <Card className="w-full max-w-[340px] shadow-2xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-2xl text-center text-primary">MC Roam</CardTitle>
                    <CardDescription className="text-center">Sign in to manage your Minecraft servers</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        <Input
                            type="text"
                            placeholder="Username"
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="Password"
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                        />
                        <div className="flex gap-2 mt-1">
                            <Button onClick={doLogin} className="flex-1">Login</Button>
                            <Button onClick={doRegister} variant="outline" className="flex-1">Register</Button>
                        </div>
                        {status !== "Ready" && (
                            <p className={`text-sm text-center mt-1 ${status.startsWith("Error") ? 'text-destructive' : 'text-[var(--color-accent-blue2)]'}`}>
                                {status}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}