'use client';

import { useEffect, useState } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

type ConversionRate = {
    from: string;
    to: string;
    rate: number;
}

export default function SettingsPage() {
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [name, setName] = useState('Tutor Name');
    const [email, setEmail] = useState('tutor@lessonlink.com');
    const [mounted, setMounted] = useState(false);

    // Currency Settings State
    const [defaultCurrency, setDefaultCurrency] = useState('EUR');
    const [conversionRates, setConversionRates] = useState<ConversionRate[]>([
        { from: 'USD', to: 'EUR', rate: 0.92 },
        { from: 'RUB', to: 'EUR', rate: 0.01 },
        { from: 'CNY', to: 'EUR', rate: 0.13 },
    ]);

    useEffect(() => {
        setMounted(true);
        // In a real app, you would fetch these settings from a user profile API
        const savedSettings = localStorage.getItem('lessonLinkSettings');
        if (savedSettings) {
            const { name, email, currencySettings } = JSON.parse(savedSettings);
            if (name) setName(name);
            if (email) setEmail(email);
            if (currencySettings) {
                setDefaultCurrency(currencySettings.defaultCurrency);
                setConversionRates(currencySettings.conversionRates);
            }
        }
    }, []);

    const handleSaveChanges = () => {
        const settings = {
            name,
            email,
            currencySettings: {
                defaultCurrency,
                conversionRates,
            },
        };
        localStorage.setItem('lessonLinkSettings', JSON.stringify(settings));
        toast({
            title: 'Settings Updated',
            description: 'Your changes have been saved successfully.',
        });
    };

    const handleRateChange = (index: number, newRate: string) => {
        const newRates = [...conversionRates];
        newRates[index].rate = parseFloat(newRate) || 0;
        setConversionRates(newRates);
    }
    
    const handleCurrencyChange = (index: number, newFrom: string) => {
        const newRates = [...conversionRates];
        newRates[index].from = newFrom;
        setConversionRates(newRates);
    }
    
    const addConversionRate = () => {
        setConversionRates([...conversionRates, { from: 'USD', to: defaultCurrency, rate: 1 }]);
    }

    const removeConversionRate = (index: number) => {
        setConversionRates(conversionRates.filter((_, i) => i !== index));
    }


    if (!mounted) {
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
                           <Skeleton className="h-10 w-full" />
                           <Skeleton className="h-10 w-full" />
                        </CardContent>
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
                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Currency</CardTitle>
                             <CardDescription>Manage currencies and conversion rates.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-1/2" />
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
                 <div className="flex justify-start">
                    <Skeleton className="h-10 w-36" />
                </div>
            </div>
        )
    }

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
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of the application.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Theme controls are now in the sidebar.
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Currency</CardTitle>
                        <CardDescription>Manage currencies and conversion rates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Default Currency</Label>
                            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-4">
                             <Label>Conversion Rates (to {defaultCurrency})</Label>
                             <div className='space-y-2'>
                                {conversionRates.map((rate, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <p className='text-sm'>1</p>
                                        <Input 
                                            className="w-24"
                                            value={rate.from}
                                            onChange={(e) => handleCurrencyChange(index, e.target.value.toUpperCase())}
                                            placeholder='USD'
                                        />
                                        <p className='text-sm'>=</p>
                                        <Input
                                            type="number"
                                            className="w-32"
                                            value={rate.rate}
                                            onChange={(e) => handleRateChange(index, e.target.value)}
                                            placeholder='0.92'
                                        />
                                        <p className='text-sm'>{defaultCurrency}</p>
                                        <Button variant="ghost" size="icon" onClick={() => removeConversionRate(index)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                ))}
                             </div>
                             <Button variant="outline" size="sm" onClick={addConversionRate}>Add Rate</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-start">
                 <Button onClick={handleSaveChanges}>Save All Changes</Button>
            </div>
        </div>
    );
}
