import { BadRequestException } from '@nestjs/common';
import { ImportExportFormat } from '@prisma/client';

export interface PortablePromptRecord {
  title: string;
  description: string | null;
  content: string;
  tags: string[];
  folder: string | null;
}

export interface ExportPayload {
  body: string;
  contentType: string;
  extension: string;
}

export function parseImportPayload(format: ImportExportFormat, raw: string): PortablePromptRecord[] {
  if (format === ImportExportFormat.JSON) return parseJson(raw);
  if (format === ImportExportFormat.CSV) return parseCsv(raw);
  return parseMarkdown(raw);
}

export function generateExportPayload(format: ImportExportFormat, records: PortablePromptRecord[]): ExportPayload {
  if (format === ImportExportFormat.JSON) {
    return { body: JSON.stringify(records, null, 2), contentType: 'application/json', extension: 'json' };
  }

  if (format === ImportExportFormat.CSV) {
    const header = ['title', 'description', 'content', 'tags', 'folder'];
    const rows = records.map((r) =>
      [r.title, r.description ?? '', r.content, r.tags.join(';'), r.folder ?? ''].map(escapeCsv).join(','),
    );
    return { body: [header.join(','), ...rows].join('\n'), contentType: 'text/csv; charset=utf-8', extension: 'csv' };
  }

  const docs = records.map((r) => {
    const desc = r.description ? `> ${r.description}\n\n` : '';
    return `# ${r.title}\n\n${desc}\`\`\`\n${r.content}\n\`\`\``;
  });
  return { body: docs.join('\n\n---\n\n'), contentType: 'text/markdown; charset=utf-8', extension: 'md' };
}

export function extractVariables(content: string) {
  const definitions = new Map<string, { name: string; type: string; defaultValue: string | null; description: string | null }>();
  const matches = content.matchAll(/{{\s*([^{}]+?)\s*}}/g);

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    const segments = raw.split(':').map((s) => s.trim()).filter(Boolean);
    const name = segments[0];
    if (!name || !/^[a-zA-Z0-9_.-]+$/.test(name)) continue;

    const def = { name, type: 'text', defaultValue: null as string | null, description: null as string | null };
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i]!;
      const sep = seg.indexOf('=');
      if (sep <= 0) continue;
      const key = seg.slice(0, sep).trim().toLowerCase();
      const val = seg.slice(sep + 1).trim();
      if (key === 'type') def.type = val || 'text';
      if (key === 'default') def.defaultValue = val || null;
      if (key === 'description') def.description = val || null;
    }
    definitions.set(name, def);
  }

  return Array.from(definitions.values());
}

function parseJson(raw: string): PortablePromptRecord[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new BadRequestException('JSON import payload must be an array');
  return parsed.map(normalizeRecord);
}

function parseCsv(raw: string): PortablePromptRecord[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const mapped = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    return normalizeRecord({
      title: mapped.title,
      description: mapped.description,
      content: mapped.content,
      tags: mapped.tags ? mapped.tags.split(';') : [],
      folder: mapped.folder || null,
    });
  });
}

function parseMarkdown(raw: string): PortablePromptRecord[] {
  const documents = raw.split(/\n-{3,}\n/).map((p) => p.trim()).filter(Boolean);
  return documents.map((doc) => {
    const title = doc.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const description = doc.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? null;
    const content = doc.match(/```(?:[\w-]+)?\n([\s\S]*?)\n```/m)?.[1] ?? '';
    return normalizeRecord({ title, description, content, tags: [], folder: null });
  });
}

function normalizeRecord(record: unknown): PortablePromptRecord {
  const raw = record && typeof record === 'object' ? (record as Record<string, unknown>) : {};
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const content = typeof raw.content === 'string' ? raw.content : '';
  if (!title || !content) throw new BadRequestException('Imported prompt requires both title and content');
  return {
    title,
    description: typeof raw.description === 'string' ? raw.description : null,
    content,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean) : [],
    folder: typeof raw.folder === 'string' && raw.folder.trim().length > 0 ? raw.folder.trim() : null,
  };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
    else if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { cells.push(current); current = ''; }
    else { current += ch; }
  }
  cells.push(current);
  return cells;
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
