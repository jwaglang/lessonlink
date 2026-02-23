'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { addSession, updateSession } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface SessionFormProps {
    courseId: string;
    levelId: string;
    unitId: string;
    session?: any;
    onSuccess: () => void;
}

export default function SessionForm({ courseId, levelId, unitId, session, onSuccess }: SessionFormProps) {
    const [title, setTitle] = useState(session?.title || '');
    const [littleQuestion, setLittleQuestion] = useState(session?.littleQuestion || '');
    const [description, setDescription] = useState(session?.description || '');
    const [order, setOrder] = useState(session?.order || 1);
    const [duration, setDuration] = useState(session?.duration || 30);
    const [thumbnailUrl, setThumbnailUrl] = useState(session?.thumbnailUrl || '');
    const [materials, setMaterials] = useState(session?.materials?.join(', ') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const sessionData = {
                courseId,
                levelId,
                unitId,
                title,
                littleQuestion,
                description,
                order: Number(order),
                duration: Number(duration),
                thumbnailUrl,
                materials: materials.split(',').map((m: string) => m.trim()).filter(Boolean),
                homeworkId: session?.homeworkId || null,
            };

            if (session?.id) {
                await updateSession(session.id, sessionData);
                toast({ title: 'Success', description: 'Session updated successfully!' });
            } else {
                await addSession(sessionData);
                toast({ title: 'Success', description: 'Session created successfully!' });
            }

            onSuccess();
        } catch (error) {
            console.error("Failed to save session:", error);
            toast({ 
                title: 'Error', 
                description: 'Failed to save session. Please try again.', 
                variant: 'destructive' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div>
                <Label htmlFor="title">Session Title *</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Session 1: Food Vocabulary"
                    required
                />
            </div>

            <div>
                <Label htmlFor="littleQuestion">Little Question (LQ) *</Label>
                <Input
                    id="littleQuestion"
                    value={littleQuestion}
                    onChange={(e) => setLittleQuestion(e.target.value)}
                    placeholder="e.g., What foods do you eat every day?"
                    required
                />
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief overview of what students will learn in this session..."
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
                        onChange={(e) => setOrder(Number(e.target.value))}
                        required
                    />
                </div>
                <div>
                    <Label>Duration</Label>
                    <RadioGroup 
                        value={String(duration)} 
                        onValueChange={(value) => setDuration(Number(value))}
                        className="flex items-center space-x-4 pt-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="30" id="r1" />
                            <Label htmlFor="r1">30 min</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="60" id="r2" />
                            <Label htmlFor="r2">60 min</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>

             <div>
                <Label htmlFor="materials">Materials (comma-separated, optional)</Label>
                <Input
                    id="materials"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="e.g., PDF Worksheet, Video Link"
                />
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
                    {isSubmitting ? 'Saving...' : (session?.id ? 'Update Session' : 'Create Session')}
                </Button>
            </div>
        </form>
    );
}
