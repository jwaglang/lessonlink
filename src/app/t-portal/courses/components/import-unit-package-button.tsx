'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  validatePackage,
  runPreImportCheck,
  executeImport,
  type UnitPackage,
  type PreImportCheck,
} from '@/lib/unit-package-importer';

type Phase =
  | { tag: 'idle' }
  | { tag: 'checking' }
  | { tag: 'errors'; errors: string[] }
  | { tag: 'ready'; pkg: UnitPackage; check: PreImportCheck }
  | { tag: 'conflict'; pkg: UnitPackage; check: PreImportCheck }
  | { tag: 'importing' };

export default function ImportUnitPackageButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ tag: 'idle' });
  const [renameTitle, setRenameTitle] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const triggerFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    setPhase({ tag: 'checking' });
    try {
      const raw = JSON.parse(await file.text());
      const result = validatePackage(raw);
      if (!result.ok) {
        setPhase({ tag: 'errors', errors: result.errors });
        return;
      }
      const check = await runPreImportCheck(result.pkg);
      if (check.conflict) {
        setRenameTitle(`${result.pkg.unit.title} (copy)`);
        setPhase({ tag: 'conflict', pkg: result.pkg, check });
      } else {
        setPhase({ tag: 'ready', pkg: result.pkg, check });
      }
    } catch (err: any) {
      setPhase({ tag: 'errors', errors: [err.message ?? 'Failed to read file'] });
    }
  };

  const doImport = async (
    pkg: UnitPackage,
    check: PreImportCheck,
    opts: { overwriteUnitId?: string; newUnitTitle?: string } = {}
  ) => {
    setPhase({ tag: 'importing' });
    try {
      const result = await executeImport(pkg, check, opts);
      const displayTitle = opts.newUnitTitle ?? pkg.unit.title;
      toast({ title: 'Import complete', description: `"${displayTitle}" imported successfully.` });
      router.push(
        `/t-portal/courses/${result.courseId}/levels/${result.levelId}/units/${result.unitId}/sessions`
      );
    } catch (err: any) {
      setPhase({ tag: 'errors', errors: [err.message ?? 'Import failed'] });
    }
  };

  const reset = () => setPhase({ tag: 'idle' });

  const isBusy = phase.tag === 'checking' || phase.tag === 'importing';
  const dialogOpen = phase.tag !== 'idle' && phase.tag !== 'checking';

  return (
    <>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFileChange} />

      <Button variant="outline" onClick={triggerFile} disabled={isBusy}>
        {phase.tag === 'checking'
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <Upload className="mr-2 h-4 w-4" />
        }
        {phase.tag === 'checking' ? 'Checking…' : 'Import Unit Package'}
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open && !isBusy) reset(); }}
      >
        <DialogContent className="sm:max-w-[520px]">

          {/* ── Validation / check errors ── */}
          {phase.tag === 'errors' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Import Failed
                </DialogTitle>
                <DialogDescription>Fix the following issues in the package file and try again.</DialogDescription>
              </DialogHeader>
              <ul className="max-h-64 overflow-y-auto space-y-1.5 text-sm py-2">
                {phase.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button onClick={reset}>Close</Button>
              </DialogFooter>
            </>
          )}

          {/* ── Preview / confirm ── */}
          {phase.tag === 'ready' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Ready to Import
                </DialogTitle>
                <DialogDescription>Review what will be created, then confirm.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <ImportRow label="Course" value={phase.pkg.course.title} tag="existing" />
                <ImportRow
                  label="Level"
                  value={phase.pkg.level.title}
                  tag={phase.check.levelId ? 'existing' : 'new'}
                />
                <ImportRow label="Unit" value={phase.pkg.unit.title} tag="new" />
                <ImportRow label="Sessions" value={`${phase.pkg.sessions.length} sessions`} tag="new" />
                <ImportRow label="Deck spec" value="included" tag="new" />
                <ImportRow label="Homework" value="included" tag="new" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={() => doImport(phase.pkg, phase.check)}>Import</Button>
              </DialogFooter>
            </>
          )}

          {/* ── Conflict resolution ── */}
          {phase.tag === 'conflict' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Unit Already Exists
                </DialogTitle>
                <DialogDescription>
                  A unit named <strong>&ldquo;{phase.check.conflict?.title}&rdquo;</strong> already exists in this
                  level. Choose how to proceed.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm space-y-1">
                  <p className="font-medium">Will be imported:</p>
                  <ImportRow label="Course" value={phase.pkg.course.title} tag="existing" />
                  <ImportRow label="Level" value={phase.pkg.level.title} tag={phase.check.levelId ? 'existing' : 'new'} />
                  <ImportRow label="Sessions" value={`${phase.pkg.sessions.length} sessions`} tag="new" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rename-input">Or import as a new unit with a different title:</Label>
                  <Input
                    id="rename-input"
                    value={renameTitle}
                    onChange={e => setRenameTitle(e.target.value)}
                    placeholder="New unit title…"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={reset} className="sm:mr-auto">Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => doImport(phase.pkg, phase.check, { overwriteUnitId: phase.check.conflict!.id })}
                >
                  Overwrite Existing
                </Button>
                <Button
                  onClick={() => doImport(phase.pkg, phase.check, { newUnitTitle: renameTitle.trim() })}
                  disabled={!renameTitle.trim()}
                >
                  Import as New
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Importing spinner ── */}
          {phase.tag === 'importing' && (
            <>
              <DialogHeader>
                <DialogTitle>Importing…</DialogTitle>
                <DialogDescription>Writing to Firestore — please wait.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportRow({ label, value, tag }: { label: string; value: string; tag: 'new' | 'existing' }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
          tag === 'new'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}>
          {tag}
        </span>
      </div>
    </div>
  );
}
