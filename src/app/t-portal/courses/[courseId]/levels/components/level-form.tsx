'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addLevel, updateLevel } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface LevelFormProps {
    courseId: string;
    level?: any;
    onSuccess: () => void;
}

export default function LevelForm({ courseId, level, onSuccess }: LevelFormProps) {
    const [title, setTitle] = useState(level?.title || '');
    const [description, setDescription] = useState(level?.description || '');
    const [order, setOrder] = useState(level?.order || 1);
    const [targetHours, setTargetHours] = useState(level?.targetHours || 60);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const levelData = {
                courseId: courseId,
                title,
                description,
                order: Number(order),
                targetHours: Number(targetHours),
            };

            if (level?.id) {
                await updateLevel(level.id, levelData);
                toast({ title: 'Success', description: 'Level updated successfully!' });
            } else {
                await addLevel(levelData);
                toast({ title: 'Success', description: 'Level created successfully!' });
            }

            onSuccess();
        } catch (error) {
            console.error('Failed to save level:', error);
            toast({ 
                title: 'Error', 
                description: 'Failed to save level. Please try again.', 
                variant: 'destructive' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="title">Level Title *</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., A1 - Beginner"
                    required
                />
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief overview of this proficiency level..."
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="order">Order</Label>
                    <Input
                        id="order"
                        type="number"
                        min="1"
                        value={order}
                        onChange={(e) => setOrder(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="targetHours">Target Hours</Label>
                    <Input
                        id="targetHours"
                        type="number"
                        min="1"
                        value={targetHours}
                        onChange={(e) => setTargetHours(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (level?.id ? 'Update Level' : 'Create Level')}
                </Button>
            </div>
        </form>
    );
}