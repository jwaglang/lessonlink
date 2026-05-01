import type { Unit, Session } from './types';

// ===== Helpers =====

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Safely coerce an unknown value to a display string.
// Tries common string sub-fields before falling back to JSON.
function str(value: any): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // Try common prose fields in order of preference
    for (const key of ['target', 'text', 'value', 'description', 'goal', 'criteria']) {
      if (typeof value[key] === 'string' && value[key]) return value[key];
    }
    return JSON.stringify(value);
  }
  return String(value);
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

  // 7. Teacher Asset Pack — list every asset per session, no dedup
  const assetRows: { session: number; code: string; name: string; type: string; purpose: string }[] = [];
  sessions.forEach(s => {
    (s.materialsRich ?? [])
      .filter(m => m.assetCode)
      .forEach(m => {
        assetRows.push({
          session: s.order,
          code: m.assetCode!,
          name: m.name,
          type: m.type,
          purpose: m.purpose,
        });
      });
  });
  if (assetRows.length > 0) {
    lines.push('## Teacher Asset Pack');
    lines.push('');
    lines.push('| Session | Code | Name | Purpose |');
    lines.push('|---|---|---|---|');
    assetRows
      .sort((a, b) => a.session - b.session || a.code.localeCompare(b.code))
      .forEach(r => {
        const safe = (s: string) => s.replace(/\|/g, '\\|');
        lines.push(`| ${r.session} | ${r.code} | ${safe(r.name)} | ${safe(r.purpose)} |`);
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
      const c = slide.content || {};
      anchorSong = {
        title: c.title || 'Anchor Song',
        url: c.url,
      };
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
      lines.push(`**Tiny Talk target:** ${str(unit.assessmentLoop.tinyTalk)}`);
      lines.push('');
    }
    if (unit.assessmentLoop.evaluationMonologue) {
      lines.push(`**Evaluation Monologue target:** ${str(unit.assessmentLoop.evaluationMonologue)}`);
    }
    // Fallback: render any top-level values not already shown
    if (!unit.assessmentLoop.tinyTalk && !unit.assessmentLoop.evaluationMonologue) {
      Object.entries(unit.assessmentLoop).forEach(([k, v]) => {
        const s = str(v);
        if (s) lines.push(`**${k}:** ${s}`);
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

// ===== Slide content renderer =====

function renderSlideContent(slide: any): { description: string; defaultTPrompt?: string; defaultLResponse?: string } {
  const content = slide.content ?? {};
  const layout = str(slide.layout);

  switch (slide.type) {
    case 'title':
      return {
        description: [content.unitTitle, content.levelBadge].filter(Boolean).join(' — '),
      };

    case 'song': {
      let desc = `Song: "${content.title || ''}"`;
      if (content.lyricsExcerpt) desc += `. Opening line: "${content.lyricsExcerpt}"`;
      if (content.url) desc += ` [Play](${content.url})`;
      return { description: desc };
    }

    case 'phonics-caps':
      return { description: `Capital letters: ${(content.letters ?? []).join(', ')}` };

    case 'phonics-caps-lower':
      return { description: `Capital + lowercase pairs: ${(content.pairs ?? []).join(', ')}` };

    case 'phonics-caps-recall':
      return { description: `Recall: ${(content.letters ?? []).join(', ')}` };

    case 'framing':
      return { description: content.text || layout };

    case 'vocab-card': {
      if (content.command) {
        return {
          description: `TPR command: "${content.command}"`,
          defaultTPrompt: content.command,
          defaultLResponse: `(L performs the action)`,
        };
      }
      if (content.description) {
        return {
          description: `Riddle: "${content.description}"${content.options ? `. Options: ${content.options.join(', ')}` : ''}`,
          defaultTPrompt: `Listen. Which one?`,
          defaultLResponse: content.answer || `(L picks)`,
        };
      }
      if (content.state === 'closed-door') {
        return {
          description: `Closed barn door. Word: ${content.word}.`,
          defaultTPrompt: `Who's behind the door?`,
          defaultLResponse: `(guess)`,
        };
      }
      if (content.state === 'open-door') {
        return {
          description: content.caption || `Open door: ${content.animal || content.word}.`,
          defaultTPrompt: `What's this?`,
          defaultLResponse: `It's a ${content.animal || content.word}.`,
        };
      }
      return { description: content.caption || content.word || layout };
    }

    case 'transition':
      return { description: `Group view: ${(content.animals ?? []).join(', ')}` };

    case 'story-panel':
      return {
        description: `Panel ${content.panelNumber}: "${content.text}". (${content.illustration})`,
        defaultTPrompt: content.text,
        defaultLResponse: content.text,
      };

    case 'cumulative-reveal':
      return {
        description: `Visible: ${(content.visible ?? []).join(', ')}. Pattern: ${content.captionPattern}`,
        defaultTPrompt: `What's this?`,
        defaultLResponse: `(L names the new item)`,
      };

    case 'final-task': {
      let desc = content.task ? `Task: ${content.task}.` : '';
      if (content.secretMessage) desc += ` Secret message: "${content.secretMessage}".`;
      if (content.hotspots?.length) desc += ` ${content.hotspots.length} hotspot(s).`;
      return { description: desc };
    }

    case 'evaluation':
      return {
        description: content.target || content.label || (content.items ? `Items: ${content.items.join(', ')}` : ''),
      };

    default:
      return { description: layout };
  }
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
      const layout = str(slide.layout);
      const label = [slide.type, layout].filter(Boolean).join(' · ');
      lines.push(`### Slide ${i + 1}${label ? ` — ${label}` : ''}`);
      lines.push('');

      const { description, defaultTPrompt, defaultLResponse } = renderSlideContent(slide);
      if (description) {
        lines.push(description);
        lines.push('');
      }

      const tPrompt = str(slide.tPrompt) || defaultTPrompt || '';
      if (tPrompt) {
        lines.push(`> **T:** ${tPrompt}`);
        lines.push('');
      }

      const expectedLResponse = str(slide.expectedLResponse) || defaultLResponse || '';
      if (expectedLResponse) {
        lines.push(`*Expected L response: ${expectedLResponse}*`);
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
  const assessmentItems: string[] = [];
  if (unit.assessmentLoop?.tinyTalk) assessmentItems.push(`**Tiny Talk target:** ${str(unit.assessmentLoop.tinyTalk)}`);
  if (unit.assessmentLoop?.evaluationMonologue) assessmentItems.push(`**Evaluation Monologue target:** ${str(unit.assessmentLoop.evaluationMonologue)}`);
  if (session.tbltTask) assessmentItems.push(`**Track via TBLT task:** ${session.tbltTask}`);
  if (assessmentItems.length > 0) {
    lines.push('## Assessment');
    lines.push('');
    assessmentItems.forEach(l => { lines.push(l); lines.push(''); });
  }

  return lines.join('\n');
}
