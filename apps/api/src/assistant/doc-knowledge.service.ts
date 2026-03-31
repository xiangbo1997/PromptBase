import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import path from 'path';

type SourceDefinition = {
  id: string;
  title: string;
  sourcePath: string;
};

export type KnowledgeChunk = {
  id: string;
  title: string;
  sourcePath: string;
  section: string;
  content: string;
  score?: number;
};

const KNOWLEDGE_SOURCES: SourceDefinition[] = [
  { id: 'usage-guide', title: 'Usage Guide', sourcePath: 'docs/USAGE_GUIDE.md' },
  { id: 'architecture', title: 'Architecture', sourcePath: 'docs/ARCHITECTURE.md' },
  { id: 'api-reference', title: 'API Reference', sourcePath: 'docs/API_REFERENCE.md' },
  { id: 'database-design', title: 'Database Design', sourcePath: 'docs/DATABASE_DESIGN.md' },
  { id: 'operations-sop', title: 'Operations SOP', sourcePath: 'docs/OPERATIONS_SOP.md' },
  { id: 'deploy-readme', title: 'Deploy README', sourcePath: 'deploy/README.md' },
];

const PATH_HINTS: Array<{ pattern: RegExp; hints: string[] }> = [
  { pattern: /^\/prompts(\/|$)/, hints: ['提示词', 'prompt', 'template', '版本', 'version'] },
  { pattern: /^\/favorites(\/|$)/, hints: ['收藏', 'favorite', 'pin'] },
  { pattern: /^\/playground(\/|$)/, hints: ['实验室', 'playground', '测试', 'test'] },
  { pattern: /^\/settings\/models(\/|$)/, hints: ['模型', 'model', 'provider', 'api key'] },
  { pattern: /^\/settings\/folders(\/|$)/, hints: ['文件夹', 'folder'] },
  { pattern: /^\/settings\/tags(\/|$)/, hints: ['标签', 'tag'] },
  { pattern: /^\/settings\/team(\/|$)/, hints: ['团队', 'team', 'member', 'invite'] },
  { pattern: /^\/settings\/audit(\/|$)/, hints: ['审计', 'audit', 'log'] },
];

@Injectable()
export class DocKnowledgeService {
  private corpusPromise: Promise<KnowledgeChunk[]> | null = null;

  async search(question: string, pathname?: string, limit = 6): Promise<KnowledgeChunk[]> {
    const corpus = await this.loadCorpus();
    const terms = this.extractTerms(question, pathname);

    const scored = corpus
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(chunk, terms, pathname),
      }))
      .filter((chunk) => (chunk.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    if (scored.length > 0) {
      return scored.slice(0, limit);
    }

    return corpus.slice(0, limit).map((chunk, index) => ({
      ...chunk,
      score: limit - index,
    }));
  }

  private async loadCorpus(): Promise<KnowledgeChunk[]> {
    if (!this.corpusPromise) {
      this.corpusPromise = this.buildCorpus();
    }

    return this.corpusPromise;
  }

  private async buildCorpus(): Promise<KnowledgeChunk[]> {
    const chunks = (
      await Promise.all(
        KNOWLEDGE_SOURCES.map(async (source) => {
          const fullPath = path.resolve(process.cwd(), source.sourcePath);
          const markdown = await readFile(fullPath, 'utf8');
          return this.buildChunksForSource(source, markdown);
        }),
      )
    ).flat();

    if (chunks.length === 0) {
      throw new InternalServerErrorException('Guide assistant knowledge base is empty');
    }

    return chunks;
  }

  private buildChunksForSource(source: SourceDefinition, markdown: string): KnowledgeChunk[] {
    const sections = this.splitIntoSections(markdown);
    return sections.flatMap((section, sectionIndex) =>
      this.splitLargeSection(section.content).map((content, chunkIndex) => ({
        id: `${source.id}-${sectionIndex + 1}-${chunkIndex + 1}`,
        title: source.title,
        sourcePath: source.sourcePath,
        section: section.headingPath.join(' > '),
        content,
      })),
    );
  }

  private splitIntoSections(markdown: string): Array<{ headingPath: string[]; content: string }> {
    const lines = markdown.split(/\r?\n/);
    const sections: Array<{ headingPath: string[]; content: string }> = [];
    const headingStack: string[] = [];
    let currentLines: string[] = [];

    const flush = () => {
      const content = currentLines.join('\n').trim();
      if (!content) return;

      sections.push({
        headingPath: headingStack.length > 0 ? [...headingStack] : ['Overview'],
        content,
      });
      currentLines = [];
    };

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (!match) {
        currentLines.push(line);
        continue;
      }

      flush();
      const hashes = match[1];
      const title = match[2];
      if (!hashes || !title) {
        continue;
      }

      const level = hashes.length;
      const heading = title.trim();
      headingStack.splice(level - 1);
      headingStack[level - 1] = heading;
    }

    flush();
    return sections;
  }

  private splitLargeSection(content: string): string[] {
    const normalized = content.trim();
    if (normalized.length <= 1200) {
      return [normalized];
    }

    const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    const chunks: string[] = [];
    let buffer = '';

    for (const paragraph of paragraphs) {
      if (!buffer) {
        buffer = paragraph;
        continue;
      }

      if ((buffer + '\n\n' + paragraph).length > 1200) {
        chunks.push(buffer);
        buffer = paragraph;
      } else {
        buffer += `\n\n${paragraph}`;
      }
    }

    if (buffer) {
      chunks.push(buffer);
    }

    return chunks;
  }

  private extractTerms(question: string, pathname?: string): string[] {
    const normalizedQuestion = question.toLowerCase();
    const terms = new Set<string>();

    for (const word of normalizedQuestion.match(/[a-z0-9-]{2,}/g) ?? []) {
      terms.add(word);
    }

    const chineseSegments = normalizedQuestion.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
    for (const segment of chineseSegments) {
      terms.add(segment);
      for (let index = 0; index < segment.length - 1; index += 1) {
        terms.add(segment.slice(index, index + 2));
      }
    }

    if (pathname) {
      for (const segment of pathname.toLowerCase().split('/').filter(Boolean)) {
        terms.add(segment);
      }

      const hint = PATH_HINTS.find((item) => item.pattern.test(pathname));
      for (const extra of hint?.hints ?? []) {
        terms.add(extra.toLowerCase());
      }
    }

    return [...terms].filter((term) => term.length >= 2);
  }

  private scoreChunk(chunk: KnowledgeChunk, terms: string[], pathname?: string) {
    const haystack = `${chunk.title}\n${chunk.section}\n${chunk.content}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (!haystack.includes(term)) continue;

      score += 2;
      if (chunk.section.toLowerCase().includes(term)) score += 3;
      if (chunk.title.toLowerCase().includes(term)) score += 4;
    }

    if (pathname && this.chunkMatchesPathContext(chunk, pathname)) {
      score += 6;
    }

    return score;
  }

  private chunkMatchesPathContext(chunk: KnowledgeChunk, pathname: string) {
    if (pathname.startsWith('/settings/models')) {
      return /model|provider|api key|模型/i.test(`${chunk.section}\n${chunk.content}`);
    }

    if (pathname.startsWith('/prompts')) {
      return /prompt|提示词|template|version|导入|导出/i.test(`${chunk.section}\n${chunk.content}`);
    }

    return false;
  }
}
