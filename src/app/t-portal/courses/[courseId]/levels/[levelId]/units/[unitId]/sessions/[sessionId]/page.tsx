'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getSessionById, getUnitById } from '@/lib/firestore';
import { renderSessionMarkdown, sessionPlanFilename } from '@/lib/unit-package-renderer';

import MarkdownView from '@/components/markdown-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SessionPlanPage() {
    const params = useParams();
    const courseId = params.courseId as string;
    const levelId = params.levelId as string;
    const unitId = params.unitId as string;
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<any>(null);
    const [unit, setUnit] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId || !unitId) return;
        Promise.all([
            getSessionById(sessionId),
            getUnitById(unitId),
        ]).then(([s, u]) => {
            setSession(s);
            setUnit(u);
            setLoading(false);
        });
    }, [sessionId, unitId]);

    const markdown = useMemo(
        () => session && unit ? renderSessionMarkdown(session, unit) : null,
        [session, unit]
    );

    if (loading) {
        return <div className="p-8">Loading lesson plan...</div>;
    }

    if (!session || !unit) {
        return <div className="p-8 text-muted-foreground">Session not found.</div>;
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            <div className="flex items-center gap-3 print:hidden">
                <Link href={`/t-portal/courses/${courseId}/levels/${levelId}/units/${unitId}/sessions`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <p className="text-xs text-muted-foreground">{unit.title}</p>
                    <h1 className="text-lg font-headline font-semibold">{session.title} — Lesson Plan</h1>
                </div>
            </div>

            {markdown && (
                <MarkdownView
                    markdown={markdown}
                    downloadFilename={sessionPlanFilename(unit, session)}
                />
            )}
        </div>
    );
}
