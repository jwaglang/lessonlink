import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

// ===== Schema types =====

export interface UnitPackage {
  meta: {
    schemaVersion: string;
    hexdate: string;
    kuptVersion: string;
    sourceKtft: { sessions: number; [k: string]: any };
    generatedBy: string;
  };
  course: { id: string; title: string };
  level: {
    id: string | null;
    title: string;
    description: string;
    order: number;
    targetHours: number;
    gse: string;
  };
  unit: {
    title: string;
    bigQuestion: string;
    description: string;
    estimatedHours: number;
    thumbnailUrl?: string | null;
    track: string;
    visualMotif: string;
    protagonist: { name: string; species: string; description: string };
    masterText: string;
    vocabulary: string[];
    forbiddenJargon: string[];
    assessmentLoop: Record<string, any>;
  };
  sessions: Array<{
    title: string;
    littleQuestion: string;
    description: string;
    order: number;
    duration: number;
    phase: string;
    tbltTask: string;
    sessionAims: { linguistic: string; cognitive: string };
    materials: Array<{ type: string; name: string; purpose: string; url?: string | null; assetCode?: string | null }>;
    recasts: Array<{ likelyError: string; recast: string }>;
    taskBrief: string;
    operationalMechanics: string;
  }>;
  deckSpec: { sessions: Array<{ sessionOrder: number; slides: any[] }> };
  homework: Record<string, any>;
}

export interface PreImportCheck {
  courseTitle: string;
  levelId: string | null;
  conflict: { id: string; title: string; order: number } | null;
}

export interface ImportResult {
  courseId: string;
  levelId: string;
  unitId: string;
}

// ===== Validation =====

const SCHEMA_MAJOR = '1';
const VALID_TRACKS = ['narrative', 'informational', 'inquiry', 'functional'];
const VALID_PHASES = ['A', 'B', 'B/C', 'C'];
const VALID_TBLTS = ['thematic-scene', 'listen-and-do', 'listen-and-select', 'show-and-tell'];
const VALID_SLIDE_TYPES = new Set([
  'title', 'song', 'phonics-caps', 'phonics-caps-lower', 'phonics-caps-recall',
  'framing', 'vocab-card', 'story-panel', 'cumulative-reveal', 'final-task',
  'evaluation', 'transition',
]);

export function validatePackage(raw: unknown): { ok: true; pkg: UnitPackage } | { ok: false; errors: string[] } {
  const e: string[] = [];
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['File is not a valid JSON object'] };
  const p = raw as Record<string, any>;

  for (const k of ['meta', 'course', 'level', 'unit', 'sessions', 'deckSpec', 'homework']) {
    if (!(k in p)) e.push(`Missing required key: "${k}"`);
  }
  if (e.length) return { ok: false, errors: e };

  // meta
  const { meta } = p;
  if (typeof meta.schemaVersion !== 'string') {
    e.push('meta.schemaVersion must be a string');
  } else {
    const major = meta.schemaVersion.split('.')[0];
    if (major !== SCHEMA_MAJOR) e.push(`Unsupported schema version "${meta.schemaVersion}" (expected 1.x)`);
  }
  if (!meta.sourceKtft || typeof meta.sourceKtft !== 'object') e.push('meta.sourceKtft is required');
  if (typeof meta.hexdate !== 'string') e.push('meta.hexdate is required');
  if (typeof meta.kuptVersion !== 'string') e.push('meta.kuptVersion is required');
  if (typeof meta.generatedBy !== 'string') e.push('meta.generatedBy is required');

  // course
  if (!p.course.id) e.push('course.id is required');
  if (!p.course.title) e.push('course.title is required');

  // level
  const lv = p.level;
  if (lv.id !== null && typeof lv.id !== 'string') e.push('level.id must be a string or null');
  for (const f of ['title', 'description', 'gse']) {
    if (!lv[f]) e.push(`level.${f} is required`);
  }
  if (typeof lv.order !== 'number') e.push('level.order must be a number');
  if (typeof lv.targetHours !== 'number') e.push('level.targetHours must be a number');

  // unit
  const u = p.unit;
  for (const f of ['title', 'bigQuestion', 'description', 'track', 'visualMotif', 'masterText']) {
    if (!u[f]) e.push(`unit.${f} is required`);
  }
  if (typeof u.estimatedHours !== 'number') e.push('unit.estimatedHours must be a number');
  if (u.track && !VALID_TRACKS.includes(u.track)) e.push(`unit.track must be one of: ${VALID_TRACKS.join(', ')}`);
  if (!u.protagonist || typeof u.protagonist !== 'object') {
    e.push('unit.protagonist is required');
  } else {
    for (const f of ['name', 'species', 'description']) {
      if (!u.protagonist[f]) e.push(`unit.protagonist.${f} is required`);
    }
  }
  if (!Array.isArray(u.vocabulary) || u.vocabulary.length < 10) e.push('unit.vocabulary must have at least 10 items');
  if (!Array.isArray(u.forbiddenJargon)) e.push('unit.forbiddenJargon must be an array');
  if (!u.assessmentLoop || typeof u.assessmentLoop !== 'object') e.push('unit.assessmentLoop is required');

  // sessions
  if (!Array.isArray(p.sessions)) {
    e.push('sessions must be an array');
  } else {
    const expectedCount = meta.sourceKtft?.sessions;
    if (typeof expectedCount === 'number' && p.sessions.length !== expectedCount) {
      e.push(`sessions count (${p.sessions.length}) doesn't match meta.sourceKtft.sessions (${expectedCount})`);
    }
    (p.sessions as any[]).forEach((s, i) => {
      const pfx = `sessions[${i}]`;
      for (const f of ['title', 'littleQuestion', 'description', 'phase', 'tbltTask', 'taskBrief', 'operationalMechanics']) {
        if (!s[f]) e.push(`${pfx}.${f} is required`);
      }
      if (typeof s.order !== 'number') e.push(`${pfx}.order must be a number`);
      if (typeof s.duration !== 'number') e.push(`${pfx}.duration must be a number`);
      if (s.phase && !VALID_PHASES.includes(s.phase)) e.push(`${pfx}.phase "${s.phase}" is invalid`);
      if (s.tbltTask && !VALID_TBLTS.includes(s.tbltTask)) e.push(`${pfx}.tbltTask "${s.tbltTask}" is invalid`);
      if (!s.sessionAims?.linguistic || !s.sessionAims?.cognitive) {
        e.push(`${pfx}.sessionAims.linguistic and .cognitive are required`);
      }
      if (!Array.isArray(s.materials)) e.push(`${pfx}.materials must be an array`);
      if (!Array.isArray(s.recasts)) e.push(`${pfx}.recasts must be an array`);
    });
  }

  // deckSpec
  if (!Array.isArray(p.deckSpec?.sessions)) {
    e.push('deckSpec.sessions must be an array');
  } else if (Array.isArray(p.sessions)) {
    const sessionOrders = new Set((p.sessions as any[]).map(s => s.order));
    (p.deckSpec.sessions as any[]).forEach((ds, i) => {
      if (!sessionOrders.has(ds.sessionOrder)) {
        e.push(`deckSpec.sessions[${i}].sessionOrder ${ds.sessionOrder} has no matching session`);
      }
      (ds.slides ?? []).forEach((slide: any, j: number) => {
        if (!VALID_SLIDE_TYPES.has(slide.type)) {
          e.push(`deckSpec.sessions[${i}].slides[${j}].type "${slide.type}" is not a valid slide type`);
        }
      });
    });
  }

  // homework
  if (!p.homework || typeof p.homework !== 'object') e.push('homework must be an object');

  return e.length ? { ok: false, errors: e } : { ok: true, pkg: p as UnitPackage };
}

// ===== Pre-import reads (no writes yet) =====

export async function runPreImportCheck(pkg: UnitPackage): Promise<PreImportCheck> {
  const courseSnap = await getDoc(doc(db, 'courses', pkg.course.id));
  if (!courseSnap.exists()) throw new Error(`Course "${pkg.course.id}" not found`);
  const courseData = courseSnap.data() as any;
  if (courseData.title !== pkg.course.title) {
    throw new Error(
      `Course title mismatch — package says "${pkg.course.title}", Firestore has "${courseData.title}"`
    );
  }

  let levelId: string | null = null;
  if (pkg.level.id !== null) {
    const levelSnap = await getDoc(doc(db, 'levels', pkg.level.id));
    if (!levelSnap.exists()) throw new Error(`Level "${pkg.level.id}" not found`);
    const levelData = levelSnap.data() as any;
    if (levelData.courseId !== pkg.course.id) {
      throw new Error(`Level "${pkg.level.id}" does not belong to course "${pkg.course.id}"`);
    }
    levelId = pkg.level.id;
  }

  let conflict: PreImportCheck['conflict'] = null;
  if (levelId !== null) {
    const snap = await getDocs(
      query(collection(db, 'units'), where('levelId', '==', levelId), where('title', '==', pkg.unit.title))
    );
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data() as any;
      conflict = { id: d.id, title: data.title, order: data.order ?? 1 };
    }
  }

  return { courseTitle: courseData.title, levelId, conflict };
}

// ===== Atomic batch write =====

export async function executeImport(
  pkg: UnitPackage,
  check: PreImportCheck,
  opts: { overwriteUnitId?: string; newUnitTitle?: string } = {}
): Promise<ImportResult> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // --- Level ---
  let levelId: string;
  if (check.levelId !== null) {
    levelId = check.levelId;
  } else {
    const lvRef = doc(collection(db, 'levels'));
    levelId = lvRef.id;
    batch.set(lvRef, {
      courseId: pkg.course.id,
      title: pkg.level.title,
      description: pkg.level.description,
      order: pkg.level.order,
      targetHours: pkg.level.targetHours,
      gseRange: pkg.level.gse,
      createdAt: now,
      updatedAt: now,
    });
  }

  const unitTitle = opts.newUnitTitle ?? pkg.unit.title;

  // --- Overwrite path: delete existing sessions, replace unit ---
  if (opts.overwriteUnitId) {
    const existingSessions = await getDocs(
      query(collection(db, 'sessions'), where('unitId', '==', opts.overwriteUnitId))
    );
    existingSessions.docs.forEach(d => batch.delete(d.ref));

    batch.set(doc(db, 'units', opts.overwriteUnitId), buildUnitDoc(pkg, levelId, unitTitle, check.conflict?.order ?? 1, now));

    pkg.sessions.forEach(s => {
      batch.set(doc(collection(db, 'sessions')), buildSessionDoc(pkg.course.id, levelId, opts.overwriteUnitId!, s, pkg.deckSpec, now));
    });

    await batch.commit();
    return { courseId: pkg.course.id, levelId, unitId: opts.overwriteUnitId };
  }

  // --- Create path: new unit + sessions ---
  const unitRef = doc(collection(db, 'units'));
  batch.set(unitRef, buildUnitDoc(pkg, levelId, unitTitle, 1, now));

  pkg.sessions.forEach(s => {
    batch.set(doc(collection(db, 'sessions')), buildSessionDoc(pkg.course.id, levelId, unitRef.id, s, pkg.deckSpec, now));
  });

  await batch.commit();
  return { courseId: pkg.course.id, levelId, unitId: unitRef.id };
}

function buildUnitDoc(pkg: UnitPackage, levelId: string, title: string, order: number, now: Timestamp) {
  return {
    courseId: pkg.course.id,
    levelId,
    title,
    bigQuestion: pkg.unit.bigQuestion,
    description: pkg.unit.description,
    order,
    estimatedHours: pkg.unit.estimatedHours,
    thumbnailUrl: pkg.unit.thumbnailUrl ?? '',
    track: pkg.unit.track,
    visualMotif: pkg.unit.visualMotif,
    protagonist: pkg.unit.protagonist,
    masterText: pkg.unit.masterText,
    vocabulary: pkg.unit.vocabulary,
    forbiddenJargon: pkg.unit.forbiddenJargon,
    assessmentLoop: pkg.unit.assessmentLoop,
    homework: pkg.homework,
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSessionDoc(
  courseId: string,
  levelId: string,
  unitId: string,
  s: UnitPackage['sessions'][number],
  deckSpec: UnitPackage['deckSpec'],
  now: Timestamp
) {
  const deckEntry = deckSpec.sessions.find(d => d.sessionOrder === s.order) ?? null;
  return {
    courseId,
    levelId,
    unitId,
    title: s.title,
    littleQuestion: s.littleQuestion,
    description: s.description,
    order: s.order,
    duration: s.duration,
    phase: s.phase,
    tbltTask: s.tbltTask,
    sessionAims: s.sessionAims,
    materials: s.materials.map(m => m.name),
    materialsRich: s.materials,
    recasts: s.recasts,
    taskBrief: s.taskBrief,
    operationalMechanics: s.operationalMechanics,
    deckSpec: deckEntry,
    thumbnailUrl: '',
    homeworkId: null,
    createdAt: now,
    updatedAt: now,
  };
}
