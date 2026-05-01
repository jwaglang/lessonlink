import type { Unit, Session } from './types';

// ===== Helpers =====

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function unitPlanFilename(unit: Unit): string {
  return `${slug(unit.title)}-unit-plan-${today()}.md`;
}

export function sessionPlanFilename(unit: Unit, session: Session): string {
  return `${slug(unit.title)}-session-${session.order}-${slug(session.title)}-${today()}.md`;
}

// ===== Unit-level renderer =====

export function renderUnitMarkdown(unit: Unit, sessions: Session[], gse?: string): string {
  const lines: string[] = [];

  // 1. Title
  lines.push(`# ${unit.title || '(untitled)'}`);
  lines.push('');

  // 2. Big Question
  if (unit.bigQuestion) {
    lines.push('## Big Question');
    lines.push('');
    lines.push(`*${unit.bigQuestion}*`);
    lines.push('');
  }

  // 3. Unit DNA & Aims
  lines.push('## Unit DNA & Aims');
  lines.push('');
  if (unit.track) lines.push(`- **Track:** ${unit.track}`);
  if (gse) lines.push(`- **GSE:** ${gse}`);
  lines.push(`- **Sessions:** ${sessions.length}`);
  if (unit.estimatedHours) lines.push(`- **Estimated hours:** ${unit.estimatedHours}`);

  const linguisticAims = sessions
    .filter(s => s.sessionAims?.linguistic)
    .map(s => s.sessionAims!.linguistic);
  const cognitiveAims = sessions
    .filter(s => s.sessionAims?.cognitive)
    .map(s => s.sessionAims!.cognitive);

  if (linguisticAims.length > 0) {
    lines.push('');
    lines.push('**Linguistic aims:**');
    linguisticAims.forEach(a => lines.push(`- ${a}`));
  }
  if (cognitiveAims.length > 0) {
    lines.push('');
    lines.push('**Cognitive aims:**');
    cognitiveAims.forEach(a => lines.push(`- ${a}`));
  }
  lines.push('');

  // 4. Core Constraints
  if (unit.forbiddenJargon?.length) {
    lines.push('## Core Constraints');
    lines.push('');
    lines.push(`**Forbidden jargon:** ${unit.forbiddenJargon.join(', ')}`);
    lines.push('');
  }

  // 5. Master Text
  if (unit.masterText) {
    lines.push('## Master Text');
    lines.push('');
    unit.masterText.split(/\n\n+/).forEach(para => {
      if (para.trim()) {
        lines.push(`*${para.trim()}*`);
        lines.push('');
      }
    });
  }

  // 6. Target Vocabulary
  if (unit.vocabulary?.length) {
    lines.push('## Target Vocabulary');
    lines.push('');
    unit.vocabulary.forEach((word, i) => lines.push(`${i + 1}. ${word}`));
    lines.push('');
  }

  // 7. Teacher Asset Pack — flatten materialsRich where type = "asset", dedup by assetCode
  const assetMap = new Map<string, { name: string; type: string; purpose: string; sessions: number[] }>();
  sessions.forEach(s => {
    (s.materialsRich ?? [])
      .filter(m => m.assetCode)
      .forEach(m => {
        const key = m.assetCode!;
        if (assetMap.has(key)) {
          const entry = assetMap.get(key)!;
          if (!entry.sessions.includes(s.order)) entry.sessions.push(s.order);
        } else {
          assetMap.set(key, { name: m.name, type: m.type, purpose: m.purpose, sessions: [s.order] });
        }
      });
  });
  if (assetMap.size > 0) {
    lines.push('## Teacher Asset Pack');
    lines.push('');
    lines.push('| Asset code | Type | Purpose | Session(s) |');
    lines.push('|---|---|---|---|');
    assetMap.forEach((v, code) => {
      lines.push(`| ${code} | ${v.type} | ${v.purpose} | ${v.sessions.join(', ')} |`);
    });
    lines.push('');
  }

  // 8. Visual Motif
  if (unit.visualMotif) {
    lines.push('## Visual Motif');
    lines.push('');
    lines.push(unit.visualMotif);
    lines.push('');
  }

  // 9. Protagonist
  if (unit.protagonist) {
    lines.push('## Protagonist');
    lines.push('');
    lines.push(`**${unit.protagonist.name}** — ${unit.protagonist.species}`);
    lines.push('');
    lines.push(unit.protagonist.description);
    lines.push('');
  }

  // 10. Anchor Song — first slide of type "song" scanning all sessions
  let anchorSong: { title: string; url?: string } | null = null;
  for (const s of sessions) {
    const slide = (s.deckSpec?.slides ?? []).find((sl: any) => sl.type === 'song');
    if (slide) {
      anchorSong = { title: slide.title ?? slide.content ?? 'Anchor Song', url: slide.url };
      break;
    }
  }
  if (anchorSong) {
    lines.push('## Anchor Song');
    lines.push('');
    lines.push(anchorSong.url ? `[${anchorSong.title}](${anchorSong.url})` : anchorSong.title);
    lines.push('');
  }

  // 11. Assessment Loop
  if (unit.assessmentLoop && Object.keys(unit.assessmentLoop).length > 0) {
    lines.push('## Assessment Loop');
    lines.push('');
    if (unit.assessmentLoop.tinyTalk) {
      lines.push(`**Tiny Talk target:** ${unit.assessmentLoop.tinyTalk}`);
    }
    if (unit.assessmentLoop.evaluationMonologue) {
      lines.push(`**Evaluation Monologue target:** ${unit.assessmentLoop.evaluationMonologue}`);
    }
    // Fallback: render any string values not already shown
    if (!unit.assessmentLoop.tinyTalk && !unit.assessmentLoop.evaluationMonologue) {
      Object.entries(unit.assessmentLoop).forEach(([k, v]) => {
        if (typeof v === 'string') lines.push(`**${k}:** ${v}`);
      });
    }
    lines.push('');
  }

  // 12. Sessions Summary
  if (sessions.length > 0) {
    lines.push('## Sessions Summary');
    lines.push('');
    lines.push('| # | Title | Little Question | Phase | TBLT Task | Duration |');
    lines.push('|---|---|---|---|---|---|');
    sessions.forEach(s => {
      const lq = (s.littleQuestion ?? '-').replace(/\|/g, '\\|');
      const title = (s.title ?? '-').replace(/\|/g, '\\|');
      lines.push(`| ${s.order} | ${title} | ${lq} | ${s.phase ?? '-'} | ${s.tbltTask ?? '-'} | ${s.duration} min |`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ===== Session-level renderer =====

export function renderSessionMarkdown(session: Session, unit: Unit): string {
  const lines: string[] = [];

  // 1. Title + breadcrumb
  lines.push(`# ${session.title || '(untitled)'}`);
  lines.push('');
  lines.push(`*${unit.title} — Session ${session.order}*`);
  lines.push('');

  // 2. Little Question
  if (session.littleQuestion) {
    lines.push('## Little Question');
    lines.push('');
    lines.push(`**${session.littleQuestion}**`);
    lines.push('');
  }

  // 3. Session Aims
  if (session.sessionAims?.linguistic || session.sessionAims?.cognitive) {
    lines.push('## Session Aims');
    lines.push('');
    if (session.sessionAims?.linguistic) lines.push(`**Linguistic:** ${session.sessionAims.linguistic}`);
    if (session.sessionAims?.cognitive) lines.push(`**Cognitive:** ${session.sessionAims.cognitive}`);
    lines.push('');
  }

  // Meta line
  const meta: string[] = [];
  if (session.phase) meta.push(`**Phase:** ${session.phase}`);
  if (session.tbltTask) meta.push(`**TBLT task:** ${session.tbltTask}`);
  if (session.duration) meta.push(`**Duration:** ${session.duration} min`);
  if (meta.length > 0) {
    lines.push(meta.join(' · '));
    lines.push('');
  }

  // 4. Task Brief
  if (session.taskBrief) {
    lines.push('## Task Brief');
    lines.push('');
    lines.push(session.taskBrief);
    lines.push('');
  }

  // Operational Mechanics
  if (session.operationalMechanics) {
    lines.push('## Operational Mechanics');
    lines.push('');
    lines.push(session.operationalMechanics);
    lines.push('');
  }

  // Live Performance Notes — render prominently when present
  if (session.livePerformanceNotes) {
    lines.push('## Live Performance Notes');
    lines.push('');
    session.livePerformanceNotes.split('\n').forEach(line => lines.push(`> ${line}`));
    lines.push('');
  }

  // 5. Slide Walkthrough
  if (session.deckSpec?.slides?.length) {
    lines.push('## Slide Walkthrough');
    lines.push('');
    session.deckSpec.slides.forEach((slide: any, i: number) => {
      const label = [slide.type, slide.layout].filter(Boolean).join(' · ');
      lines.push(`### Slide ${i + 1}${label ? ` — ${label}` : ''}`);
      lines.push('');
      if (slide.content) {
        lines.push(slide.content);
        lines.push('');
      }
      if (slide.tPrompt) {
        lines.push(`> **T:** ${slide.tPrompt}`);
        lines.push('');
      }
      if (slide.expectedLResponse) {
        lines.push(`*Expected L response: ${slide.expectedLResponse}*`);
        lines.push('');
      }
    });
  }

  // 6. Recasts Cheat Sheet
  if (session.recasts?.length) {
    lines.push('## Recasts Cheat Sheet');
    lines.push('');
    lines.push('| Likely error | Recast |');
    lines.push('|---|---|');
    session.recasts.forEach(r => {
      lines.push(`| ${r.likelyError.replace(/\|/g, '\\|')} | ${r.recast.replace(/\|/g, '\\|')} |`);
    });
    lines.push('');
  }

  // 7. Materials
  const richMaterials = session.materialsRich;
  const simpleMaterials = session.materials ?? [];
  if (richMaterials?.length) {
    lines.push('## Materials');
    lines.push('');
    richMaterials.forEach(m => {
      const urlPart = m.url ? ` — [link](${m.url})` : '';
      lines.push(`- **${m.name}**${m.purpose ? `: ${m.purpose}` : ''}${urlPart}`);
    });
    lines.push('');
  } else if (simpleMaterials.length) {
    lines.push('## Materials');
    lines.push('');
    simpleMaterials.forEach(m => lines.push(`- ${m}`));
    lines.push('');
  }

  // 8. Assessment
  const assessmentLines: string[] = [];
  if (unit.assessmentLoop?.tinyTalk) assessmentLines.push(`**Tiny Talk target:** ${unit.assessmentLoop.tinyTalk}`);
  if (unit.assessmentLoop?.evaluationMonologue) assessmentLines.push(`**Evaluation Monologue target:** ${unit.assessmentLoop.evaluationMonologue}`);
  if (session.tbltTask) assessmentLines.push(`**Track via TBLT task:** ${session.tbltTask}`);
  if (assessmentLines.length > 0) {
    lines.push('## Assessment');
    lines.push('');
    assessmentLines.forEach(l => lines.push(l));
    lines.push('');
  }

  return lines.join('\n');
}
