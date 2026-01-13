'use client';

import { useState } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [name, setName] = useState('Tutor Name');
    const [email, setEmail] = useState('tutor@lessonlink.com');

    const handleSaveChanges = () => {
        // Here you would typically call an API to save the changes.
        // For now, we'll just show a toast notification.
        console.log('Saving profile:', { name, email });
        toast({
            title: 'Profile Updated',
            description: 'Your personal information has been saved.',
        });
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Settings" 
                description="Manage your account and application preferences."
            />
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Update your personal information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="dark-mode">Dark Mode</Label>
                                <p className="text-sm text-muted-foreground">
                                    Toggle between light and dark themes.
                                </p>
                            </div>
                            <Switch 
                                id="dark-mode" 
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
