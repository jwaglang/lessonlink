'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDorks, getDorkDenominations } from '../types';
import { Coins, TrendingUp, ArrowRight, Circle } from 'lucide-react';

interface CashInStationProps {
  learnerId: string;
  currentXp: number;
  xpSpent: number;
  currentDorkBalance: number;
  onConversionComplete: () => void;
}

function DorkIconDisplay({ copperAmount, size = 'lg' }: { copperAmount: number; size?: 'lg' | 'xl' }) {
  const dorks = getDorkDenominations(copperAmount);
  const textSize = size === 'xl' ? 'text-2xl' : 'text-lg';
  const iconSize = size === 'xl' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={`flex items-center gap-3 flex-wrap ${textSize} font-bold text-pink-900`}>
      {dorks.gold > 0 && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-yellow-500 text-yellow-500`} />
          <span>{dorks.gold}</span>
        </div>
      )}
      {dorks.silver > 0 && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-gray-400 text-gray-400`} />
          <span>{dorks.silver}</span>
        </div>
      )}
      {(dorks.copper > 0 || copperAmount === 0) && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-amber-700 text-amber-700`} />
          <span>{dorks.copper}</span>
        </div>
      )}
    </div>
  );
}

export function CashInStation({
  learnerId,
  currentXp,
  xpSpent,
  currentDorkBalance,
  onConversionComplete,
}: CashInStationProps) {
  const { toast } = useToast();
  const [xpToConvert, setXpToConvert] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);

  const xpEarned = currentXp + xpSpent;
  const quotePreviewed = xpToConvert;
  const newDorkBalance = currentDorkBalance + quotePreviewed;
  const newCurrentXp = currentXp - quotePreviewed;

  // Quick conversion buttons
  const quickConversions = [10, 50, 100, 500];

  const handleQuickConvert = (amount: number) => {
    if (amount <= currentXp) {
      setXpToConvert(amount);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setXpToConvert(Math.min(value[0], currentXp));
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(parseInt(e.target.value) || 0, currentXp));
    setXpToConvert(value);
  };

  const handleConvert = async () => {
    if (xpToConvert <= 0) {
      toast({
        title: 'No XP selected',
        description: 'Please select at least 1 XP to convert.',
        variant: 'destructive',
      });
      return;
    }

    if (xpToConvert > currentXp) {
      toast({
        title: 'Insufficient XP',
        description: 'You cannot convert more XP than you have.',
        variant: 'destructive',
      });
      return;
    }

    setIsConverting(true);
    try {
      const profileRef = doc(db, 'students', learnerId, 'petland', 'profile');
      
      console.log('[CashInStation] Converting:', {
        currentXp,
        xpToConvert,
        newCurrentXp,
        xpSpent,
        newXpSpent: xpSpent + xpToConvert,
        currentDorkBalance,
        newDorkBalance,
      });

      await updateDoc(profileRef, {
        xp: newCurrentXp,
        dorkBalance: newDorkBalance,
        xpSpent: xpSpent + xpToConvert,
      });

      console.log('[CashInStation] Conversion succeeded!');

      toast({
        title: '✨ Conversion successful!',
        description: `Converted ${xpToConvert} XP to ${formatDorks(xpToConvert)}.`,
      });

      setXpToConvert(0);
      onConversionComplete();
    } catch (error) {
      console.error('[CashInStation] Conversion failed:', error);
      toast({
        title: 'Conversion failed',
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-purple-600" />
          <CardTitle className="text-lg text-purple-900">Cash-In Station</CardTitle>
        </div>
        <CardDescription className="text-purple-700">Convert your XP progress into Dorks</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* XP Stats Row + Conversion Rates */}
        <div className="flex items-start gap-3">
          <div className="grid grid-cols-3 gap-2 flex-1">
            {/* XP Earned */}
            <div className="bg-white rounded-lg p-2.5 border-2 border-purple-200">
              <p className="text-xs font-bold text-purple-700 mb-1">XP Earned</p>
              <p className="text-lg font-bold text-purple-900">{xpEarned}</p>
            </div>

            {/* XP Spent */}
            <div className="bg-white rounded-lg p-2.5 border-2 border-pink-200">
              <p className="text-xs font-bold text-pink-700 mb-1">XP Spent</p>
              <p className="text-lg font-bold text-pink-900">{xpSpent}</p>
            </div>

            {/* XP Current */}
            <div className="bg-white rounded-lg p-2.5 border-2 border-orange-200">
              <p className="text-xs font-bold text-orange-700 mb-1">XP Current</p>
              <p className="text-lg font-bold text-orange-900">{currentXp}</p>
            </div>
          </div>

          {/* Conversion Rates Table - Right of XP Current */}
          <div className="bg-white rounded-lg p-2 border-2 border-orange-200 whitespace-nowrap">
            <p className="text-xs font-bold text-orange-900 mb-1">Rates</p>
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-700 font-semibold text-xs">1 XP</span>
                <span className="text-gray-400">=</span>
                <Circle className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                <span className="text-gray-700 font-semibold text-xs">10</span>
                <span className="text-gray-400">=</span>
                <Circle className="w-2.5 h-2.5 fill-gray-400 text-gray-400" />
              </div>
              <div className="flex items-center gap-1">
                <Circle className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                <span className="text-gray-700 font-semibold text-xs">100</span>
                <span className="text-gray-400">=</span>
                <Circle className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Section */}
        <div className="space-y-3 bg-white rounded-lg p-3 border-2 border-purple-200">
          <Label className="text-sm font-bold text-purple-900">Convert to Dorks</Label>

          {/* Quick Buttons */}
          <div className="grid grid-cols-4 gap-1">
            {quickConversions.map((amount) => (
              <Button
                key={amount}
                variant={xpToConvert === amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickConvert(amount)}
                disabled={amount > currentXp}
                className={`text-xs h-8 ${
                  xpToConvert === amount
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0'
                    : ''
                }`}
              >
                {amount}
              </Button>
            ))}
          </div>

          {/* Slider */}
          <Slider
            value={[xpToConvert]}
            onValueChange={handleSliderChange}
            max={currentXp}
            step={1}
            className="w-full"
          />

          {/* Custom Input */}
          <Input
            type="number"
            min="0"
            max={currentXp}
            value={xpToConvert}
            onChange={handleCustomInput}
            placeholder="Enter custom amount"
            className="text-center border-purple-300 focus:border-purple-500"
          />
        </div>

        {/* Preview */}
        {xpToConvert > 0 && (
          <div className="bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg p-3 border-2 border-purple-400">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-900">Preview</span>
              <ArrowRight className="w-4 h-4 text-purple-700" />
            </div>
            <div className="flex items-center gap-2 text-center">
              <div className="flex-1">
                <p className="text-xs text-purple-700 font-semibold mb-1">Convert</p>
                <p className="text-lg font-bold text-purple-900">{xpToConvert} XP</p>
              </div>
              <div className="text-2xl text-purple-600">→</div>
              <div className="flex-1">
                <p className="text-xs text-pink-700 font-semibold mb-1">Receive</p>
                <DorkIconDisplay copperAmount={quotePreviewed} size="lg" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t-2 border-purple-400">
              <p className="text-xs text-purple-700 font-semibold mb-2">New Wallet:</p>
              <DorkIconDisplay copperAmount={newDorkBalance} size="xl" />
            </div>
          </div>
        )}

        {/* Convert Button */}
        <Button
          onClick={handleConvert}
          disabled={xpToConvert <= 0 || isConverting}
          className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold text-sm h-10 rounded-lg shadow-lg"
        >
          {isConverting ? 'Converting...' : `Convert & Receive ${formatDorks(quotePreviewed)}`}
        </Button>
      </CardContent>
    </Card>
  );
}

