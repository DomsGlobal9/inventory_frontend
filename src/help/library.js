import { Marked } from 'marked';
import { SECTIONS } from './sections';
import { t } from './ui';

/**
 * The user guide. Every page is a Markdown file:
 *   content/<section>/<page>.md          English (every page has one)
 *   content/<section>/<page>.<lang>.md   a translation (te, hi, ta, kn...), optional
 * Its pictures are shared by all languages: images/<section>/<page>/. This file turns them into pages, HTML
 * and a search index. Everything here is bundled only into the help chunk; the app never downloads it.
 *
 * A reader who picks a language gets that language wherever a translation exists and English elsewhere,
 * so adding a language is only ever adding files.
 *
 * Writing conventions (see content/README.md):
 *   ## 1. Open Put away              a numbered step
 *   [[2]]                            the green numbered circle that matches a mark in the picture
 *   ![alt](1-open.webp "caption")    a picture from this page's folder (a "-phone" twin is used on phones)
 *   :::tip Title ... :::             a tip box (also :::note and :::warning)
 *   :::faq Question ... :::          a common problem that opens on click
 */

const RAW = import.meta.glob('./content/*/*.md', { query: '?raw', import: 'default', eager: true });
const IMAGES = import.meta.glob('./images/**/*.{webp,png,jpg,svg}', { import: 'default', eager: true });

/** Names shown in the language picker, in each language's own script. Add a line to offer a new one. */
export const LANGUAGE_NAMES = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी', ta: 'தமிழ்', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', mr: 'मराठी', bn: 'বাংলা', gu: 'ગુજરાતી' };

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

/** Heading text to an id. Keeps letters of every script, so a Telugu heading gets a Telugu id. */
export const slugify = (text) => String(text).toLowerCase()
  .replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')
  .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// FILES["shelves/put-away"] = { en: raw, te: raw, ... }
const FILES = {};
for (const [key, raw] of Object.entries(RAW)) {
  const m = key.match(/^\.\/content\/([^/]+)\/([^/.]+)(?:\.([a-z]{2}))?\.md$/);
  if (!m) continue;
  const [, section, slug, lang = 'en'] = m;
  (FILES[`${section}/${slug}`] ||= {})[lang] = raw;
}

/** English names, shown under each language's own name in the picker. */
export const LANGUAGE_ENGLISH_NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati' };

/** Picker order: English, then Hindi (the widest reach), then the rest. Unlisted codes go last. */
const LANGUAGE_ORDER = ['en', 'hi', 'te', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu'];

/** English plus every language that has at least one translated page. */
export const LANGUAGES = ['en', ...new Set(Object.values(FILES).flatMap(f => Object.keys(f)))]
  .filter((code, i, all) => all.indexOf(code) === i)
  .sort((a, b) => (LANGUAGE_ORDER.indexOf(a) + 1 || 99) - (LANGUAGE_ORDER.indexOf(b) + 1 || 99))
  .map(code => ({ code, name: LANGUAGE_NAMES[code] || code, english: LANGUAGE_ENGLISH_NAMES[code] || code }));

export const sectionTitle = (section, lang = 'en') => section.titles?.[lang] || section.title;
export const sectionBlurb = (section, lang = 'en') => section.blurbs?.[lang] || section.blurb;

const cache = new Map();

/** Every page, in menu order, in `lang` where translated and English otherwise. Pages with no English file are left out. */
function build(lang) {
  if (cache.has(lang)) return cache.get(lang);
  const pages = [];
  const byPath = new Map();
  for (const section of SECTIONS) {
    for (const slug of section.pages) {
      const files = FILES[`${section.id}/${slug}`];
      if (!files?.en) continue;
      const pageLang = files[lang] ? lang : 'en';
      const { meta, body } = parseFrontmatter(files[pageLang]);
      const english = pageLang === 'en' ? meta : parseFrontmatter(files.en).meta;
      const page = {
        section: section.id,
        sectionTitle: sectionTitle(section, lang),
        slug,
        lang: pageLang,
        path: `/help/${section.id}/${slug}`,
        title: meta.title || english.title || slug,
        summary: meta.summary || '',
        forWho: meta.for || '',
        minutes: Number(meta.minutes || english.minutes) || null,
        // Where the page's screen is in the app never changes with the language.
        app: english.app || '',
        appLabel: meta.appLabel || english.appLabel || '',
        keywords: `${meta.keywords || ''} ${pageLang === 'en' ? '' : english.keywords || ''}`.trim(),
        body
      };
      pages.push(page);
      byPath.set(page.path, page);
    }
  }
  const built = { pages, byPath, index: null };
  cache.set(lang, built);
  return built;
}

export const getPages = (lang = 'en') => build(lang).pages;
export const PAGES = getPages('en');
export const pageExists = (path) => build('en').byPath.has(String(path).split('#')[0].split('?')[0]);
export const findPage = (section, slug, lang = 'en') => build(lang).byPath.get(`/help/${section}/${slug}`) || null;
export const pagesIn = (sectionId, lang = 'en') => build(lang).pages.filter(p => p.section === sectionId);

export function neighbours(page, lang = 'en') {
  const pages = build(lang).pages;
  const i = pages.findIndex(p => p.path === page.path);
  return { prev: i > 0 ? pages[i - 1] : null, next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null };
}

/**
 * Where to send an address that is not a page, so nobody lands on an error: the first page of that section
 * if the section exists, otherwise the Help Center home.
 */
export function fallbackFor(sectionId) {
  const first = build('en').pages.find(p => p.section === sectionId);
  return first ? first.path : '/help';
}

/** The guide page for an app screen, for the Help button: the longest `app:` route the path is under. */
export function pageForRoute(pathname) {
  let best = null;
  for (const p of build('en').pages) {
    if (!p.app || p.app === '/login') continue;
    const route = p.app.split('?')[0];
    const pattern = new RegExp('^' + route.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/') + '(\\/|$)');
    if (pattern.test(pathname) && (!best || route.length > best.app.split('?')[0].length)) best = p;
  }
  return best;
}

function imageUrl(page, name) {
  return IMAGES[`./images/${page.section}/${page.slug}/${name}`] || null;
}

const boxLabels = (lang) => ({ tip: t(lang, 'boxTip'), note: t(lang, 'boxNote'), warning: t(lang, 'boxWarning') });

/** Markdown to HTML for one page, and its "On this page" list. */
export function renderPage(page) {
  const toc = [];
  const used = new Set();
  const uniqueId = (text) => {
    const base = slugify(text) || 'section';
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };
  const missing = [];
  const labels = boxLabels(page.lang);

  const boxes = {
    name: 'helpBox',
    level: 'block',
    start: (src) => src.match(/^:::/m)?.index,
    tokenizer(src) {
      const m = /^:::(tip|note|warning|faq)[ \t]*([^\n]*)\n([\s\S]*?)\n:::[ \t]*(?:\n+|$)/.exec(src);
      if (!m) return undefined;
      return { type: 'helpBox', raw: m[0], kind: m[1], title: m[2].trim(), tokens: this.lexer.blockTokens(m[3], []) };
    },
    renderer(token) {
      const inner = this.parser.parse(token.tokens);
      if (token.kind === 'faq') return `<details class="hp-faq" id="${uniqueId(token.title)}"><summary>${escapeHtml(token.title)}</summary><div>${inner}</div></details>`;
      const label = token.title || labels[token.kind];
      return `<div class="hp-box hp-box-${token.kind}" role="note"><strong class="hp-box-title">${escapeHtml(label)}</strong>${inner}</div>`;
    }
  };

  const markers = {
    name: 'helpMark',
    level: 'inline',
    start: (src) => src.indexOf('[['),
    tokenizer(src) {
      const m = /^\[\[(\d{1,2})\]\]/.exec(src);
      if (m) return { type: 'helpMark', raw: m[0], n: m[1] };
      return undefined;
    },
    renderer: (token) => `<span class="hp-mk" aria-label="${token.n}">${token.n}</span>`
  };

  const marked = new Marked({
    gfm: true,
    extensions: [boxes, markers],
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens);
        const plain = text.replace(/\[\[\d+\]\]/g, '').replace(/[*_`]/g, '');
        const step = depth === 2 && /^(\d{1,2})\.\s+/.exec(plain);
        const label = step ? plain.slice(step[0].length) : plain;
        const id = uniqueId(label);
        if (depth === 2) toc.push({ id, title: label });
        if (step) return `<h2 id="${id}" class="hp-step"><b aria-hidden="true">${step[1]}</b><span>${inner.replace(/^\d{1,2}\.\s+/, '')}</span></h2>`;
        return `<h${depth} id="${id}">${inner}</h${depth}>`;
      },
      image({ href, title, text }) {
        if (/^https?:/.test(href)) return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}" loading="lazy">`;
        const url = imageUrl(page, href);
        // A picture that does not exist is left out, never shown as a gap. The checker refuses a release with one.
        if (!url) { missing.push(href); return ''; }
        const phone = imageUrl(page, href.replace(/(\.\w+)$/, '-phone$1'));
        const img = `<img src="${url}" alt="${escapeHtml(text)}" loading="lazy" decoding="async">`;
        const picture = phone ? `<picture><source media="(max-width: 760px)" srcset="${phone}">${img}</picture>` : img;
        return `<figure class="hp-shot${href.includes('diagram') ? ' hp-diagram' : ''}${phone ? ' hp-has-phone' : ''}">${picture}${title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ''}</figure>`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:/.test(href);
        // A link to a guide page that is not written yet reads as plain words, never as a dead link.
        if (!external && href.startsWith('/help/') && !pageExists(href)) return `<span class="hp-soon">${inner}</span>`;
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ' data-internal="1"'}>${inner}</a>`;
      },
      table({ header, rows }) {
        const cell = (c, tag) => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        return `<div class="hp-table"><table><thead><tr>${header.map(c => cell(c, 'th')).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table></div>`;
      }
    }
  });

  // A picture on its own line is a block, not something inside a paragraph; an empty paragraph left by a
  // missing picture goes too.
  const flat = marked.parse(page.body)
    .replace(/<p>\s*(<figure[\s\S]*?<\/figure>)\s*<\/p>/g, '$1')
    .replace(/<p>\s*<\/p>/g, '');
  // Each h2 and what follows it becomes one section, so a step's text and pictures sit under the step title.
  const html = flat.split(/(?=<h2[\s>])/).map(part => part.startsWith('<h2')
    ? `<section class="hp-sec${/^<h2 id="[^"]*" class="hp-step"/.test(part) ? ' hp-sec-step' : ''}">${part}</section>`
    : part).join('');
  return { html, toc, missing };
}

/* ─────────────────────────────── search ─────────────────────────────── */

const plainText = (md) => md
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[\[\d+\]\]/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/^:::\w*\s*/gm, ' ')
  .replace(/[#>*_`|]/g, ' ')
  .replace(/\s+/g, ' ');

/**
 * Search compares text without the invisible joiners Indian scripts use inside words (ZWNJ / ZWJ): the
 * same Telugu or Kannada word can be typed with or without them, and it must still match.
 */
const searchable = (s) => String(s).normalize('NFC').replace(/[​-‍⁠﻿]/g, '').toLowerCase();

function indexFor(lang) {
  const built = build(lang);
  if (!built.index) {
    built.index = built.pages.map(p => {
      const headings = [...p.body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1].replace(/^\d+\.\s+/, '').replace(/\[\[\d+\]\]/g, '').trim());
      const faqs = [...p.body.matchAll(/^:::faq\s+(.+)$/gm)].map(m => m[1].trim());
      return {
        page: p,
        title: searchable(p.title),
        headings,
        faqs,
        headingKeys: [...headings, ...faqs].map(searchable),
        text: searchable(`${p.summary} ${p.keywords} ${plainText(p.body)}`)
      };
    });
  }
  return built.index;
}

/**
 * Plain word matching, weighted: title, then a step or question heading, then keywords and body. Every word
 * typed must appear somewhere on the page. Returns the page plus the heading that matched best, so a result
 * can jump straight to "Forgot your password?". Works in any script.
 */
export function searchHelp(query, lang = 'en', limit = 8) {
  const words = searchable(query).split(/\s+/).map(w => w.replace(/[^\p{L}\p{M}\p{N}₹-]/gu, '')).filter(w => w.length > 1);
  if (!words.length) return [];
  const results = [];
  for (const entry of indexFor(lang)) {
    let score = 0;
    let ok = true;
    for (const w of words) {
      const inTitle = entry.title.includes(w);
      const inHeading = entry.headingKeys.some(h => h.includes(w));
      const inText = entry.text.includes(w);
      if (!inTitle && !inHeading && !inText) { ok = false; break; }
      score += (inTitle ? 10 : 0) + (inHeading ? 4 : 0) + (inText ? 1 : 0);
      if (entry.title.startsWith(w)) score += 3;
    }
    if (!ok) continue;
    // Everything typed is in the page's own title: open the page at its top, not at some question inside it.
    if (words.every(w => entry.title.includes(w))) {
      results.push({ page: entry.page, score: score + 5, heading: null, anchor: null });
      continue;
    }
    const heading = [...entry.headings, ...entry.faqs]
      .map(h => ({ h, hits: words.filter(w => searchable(h).includes(w)).length }))
      .filter(x => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)[0]?.h || null;
    results.push({ page: entry.page, score, heading, anchor: heading ? slugify(heading) : null });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
