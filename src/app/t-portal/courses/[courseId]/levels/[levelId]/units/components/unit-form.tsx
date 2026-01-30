'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { addUnit, updateUnit } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface UnitFormProps {
    levelId: string;
    unit?: any;
    onSuccess: () => void;
}

export default function UnitForm({ levelId, unit, onSuccess }: UnitFormProps) {
    const [title, setTitle] = useState(unit?.title || '');
    const [bigQuestion, setBigQuestion] = useState(unit?.bigQuestion || '');
    const [description, setDescription] = useState(unit?.description || '');
    const [order, setOrder] = useState(unit?.order || 1);
    const [estimatedHours, setEstimatedHours] = useState(unit?.estimatedHours || 2.5);
    const [thumbnailUrl, setThumbnailUrl] = useState(unit?.thumbnailUrl || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const unitData = {
                levelId: levelId,
                title,
                bigQuestion,
                description,
                order: Number(order),
                estimatedHours: Number(estimatedHours),
                thumbnailUrl,
                initialAssessmentId: null,
                finalEvaluationId: null,
                finalProjectId: null,
                finalProjectType: null,
            };

            if (unit?.id) {
                await updateUnit(unit.id, unitData);
                toast({ title: 'Success', description: 'Unit updated successfully!' });
            } else {
                await addUnit(unitData);
                toast({ title: 'Success', description: 'Unit created successfully!' });
            }

            onSuccess();
        } catch (error) {
            toast({ 
                title: 'Error', 
                description: 'Failed to save unit. Please try again.', 
                variant: 'destructive' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="title">Unit Title *</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Unit 3: Food & Restaurants"
                    required
                />
            </div>

            <div>
                <Label htmlFor="bigQuestion">Big Question (BQ) *</Label>
                <Input
                    id="bigQuestion"
                    value={bigQuestion}
                    onChange={(e) => setBigQuestion(e.target.value)}
                    placeholder="e.g., Why do different cultures eat differently?"
                    required
                />
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief overview of what students will learn..."
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
                    <Label htmlFor="estimatedHours">Estimated Hours</Label>
                    <Input
                        id="estimatedHours"
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={estimatedHours}
                        onChange={(e) => setEstimatedHours(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                <Input
                    id="thumbnailUrl"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (unit?.id ? 'Update Unit' : 'Create Unit')}
                </Button>
            </div>
        </form>
    );
}
