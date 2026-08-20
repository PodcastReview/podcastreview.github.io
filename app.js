'use strict';

const DATA_URL = 'evidence.json';
const PROJECTS_URL = 'projects/projects.json';

const state = {
  data: null,
  projects: [],
  stats: null,
  query: ''
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const [dataResult, projectsResult] = await Promise.allSettled([
      loadJson(DATA_URL),
      loadJson(PROJECTS_URL)
    ]);

    if (dataResult.status !== 'fulfilled') {
      throw dataResult.reason;
    }

    state.data = normalizeData(dataResult.value);
    state.stats = deriveStats(state.data);
    state.projects = projectsResult.status === 'fulfilled'
      ? normalizeProjects(projectsResult.value)
      : [];

    bindSearch();
    renderAll();

    if (projectsResult.status !== 'fulfilled') {
      renderProjectLoadNotice();
    }
  } catch (error) {
    console.error(error);
    renderFatalError(error);
  }
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`无法载入 ${url}（HTTP ${response.status}）`);
  }
  return response.json();
}

function normalizeData(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  return {
    stats: data.stats && typeof data.stats === 'object' ? data.stats : {},
    featured: Array.isArray(data.featured) ? data.featured : [],
    records: Array.isArray(data.records) ? data.records : []
  };
}

function normalizeProjects(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : 999,
      title: String(item.title ?? '').trim(),
      href: safeRelativeHref(item.href)
    }))
    .filter(item => item.title && item.href)
    .sort((a, b) => a.order - b.order);
}

function deriveStats(data) {
  const reviewedValue = Number(data.stats.reviewed);
  return {
    reviewed: Number.isFinite(reviewedValue) && reviewedValue >= 0
      ? reviewedValue
      : 0,
    records: data.records.length
  };
}

function bindSearch() {
  const input = document.getElementById('search');
  if (!input || input.dataset.bound === 'true') return;

  input.dataset.bound = 'true';
  input.addEventListener('input', event => {
    state.query = String(event.target.value ?? '')
      .trim()
      .toLocaleLowerCase('zh-CN');
    renderRecords();
  });
}

function renderAll() {
  renderStats();
  renderHeroSummary();
  renderProjects();
  renderFeatured();
  renderRecords();
}

function renderStats() {
  const element = document.getElementById('stats');
  if (!element) return;

  const stats = state.stats;
  element.innerHTML = `
    <div class="stat">
      <strong>${formatNumber(stats.reviewed)}</strong>
      <span>期节目已核对</span>
    </div>
    <div class="stat">
      <strong>${formatNumber(stats.records)}</strong>
      <span>条核对记录</span>
    </div>`;
}

function renderHeroSummary() {
  const element = document.getElementById('heroSummary');
  if (!element || !state.stats) return;

  element.textContent =
    `已核对${formatNumber(state.stats.reviewed)}期节目，目前整理${formatNumber(state.stats.records)}条核对记录。`;
}

function renderProjects() {
  const element = document.getElementById('projectList');
  if (!element) return;

  if (!state.projects.length) {
    element.innerHTML = '';
    return;
  }

  element.innerHTML = state.projects.map(project => `
    <a class="project-card" href="${escapeHtml(project.href)}">
      <div><h3>${escapeHtml(project.title)}</h3></div>
      <div class="project-arrow" aria-hidden="true">→</div>
    </a>`).join('');
}

function renderProjectLoadNotice() {
  const element = document.getElementById('projectList');
  if (!element || element.children.length) return;
  element.innerHTML = '<p class="result-count">专题列表暂时未载入。</p>';
}

function renderFeatured() {
  const element = document.getElementById('featuredGrid');
  if (!element || !state.data) return;

  element.innerHTML = state.data.featured.map(item => {
    const sourceUrl = safeExternalUrl(item.sourceUrl);
    const source = escapeHtml(item.source);
    const sourceBlock = sourceUrl
      ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${source}</a>`
      : source;

    return `
      <article class="featured-card">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="featured-source">${sourceBlock}</div>
        <div class="compare">
          <div class="quote-box">
            <label>${escapeHtml(item.sourceType || '来源材料')}</label>
            <blockquote>${escapeHtml(item.sourceQuote)}</blockquote>
          </div>
          <div class="quote-box">
            <label>节目表述</label>
            <blockquote>${escapeHtml(item.targetQuote)}</blockquote>
          </div>
        </div>
        ${item.note ? `<p class="fact-note">${escapeHtml(item.note)}</p>` : ''}
      </article>`;
  }).join('');
}

function renderRecords() {
  const recordsElement = document.getElementById('records');
  const countElement = document.getElementById('resultCount');
  if (!recordsElement || !countElement || !state.data) return;

  const rows = state.data.records.filter(record => {
    if (!state.query) return true;

    const points = Array.isArray(record.points)
      ? record.points.flatMap(point => [point.title, point.text])
      : [];

    const searchableText = [
      record.title,
      record.source,
      record.summary,
      ...points
    ].join(' ').toLocaleLowerCase('zh-CN');

    return searchableText.includes(state.query);
  });

  countElement.textContent =
    `显示 ${formatNumber(rows.length)} / ${formatNumber(state.data.records.length)} 条核对记录`;

  if (!rows.length) {
    recordsElement.innerHTML = '<p class="result-count">没有找到相符记录。</p>';
    return;
  }

  recordsElement.innerHTML = rows.map(renderRecord).join('');
}

function renderRecord(record) {
  const points = Array.isArray(record.points) ? record.points : [];
  const urls = Array.isArray(record.urls) ? record.urls : [];
  const labels = Array.isArray(record.urlLabels) ? record.urlLabels : [];

  const pointBlock = points.length
    ? `<div class="evidence-points">${points.map(point => `
        <div class="evidence-point">
          <strong>${escapeHtml(point.title || '对应')}</strong>
          <span>${escapeHtml(point.text)}</span>
        </div>`).join('')}</div>`
    : '';

  const summaryBlock = record.summary
    ? `<div class="chain">${escapeHtml(record.summary)}</div>`
    : '';

  const linkItems = urls
    .map((url, index) => ({
      url: safeExternalUrl(url),
      label: String(
        labels[index]
        || `来源链接${urls.length > 1 ? ` ${index + 1}` : ''}`
      )
    }))
    .filter(item => item.url);

  const linksBlock = linkItems.length
    ? `<div class="source-links">${linkItems.map(item => `
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(item.label)}
        </a>`).join('')}</div>`
    : '';

  return `
    <details class="record">
      <summary>
        <div>
          <div class="record-title">${escapeHtml(record.title)}</div>
          <div class="record-source">对照材料：${escapeHtml(record.source || '见展开内容')}</div>
        </div>
      </summary>
      <div class="record-body">
        ${pointBlock}
        ${summaryBlock}
        ${linksBlock}
      </div>
    </details>`;
}

function renderFatalError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const targets = [
    document.getElementById('stats'),
    document.getElementById('featuredGrid'),
    document.getElementById('records')
  ].filter(Boolean);

  for (const element of targets) {
    element.innerHTML =
      `<p class="result-count">页面数据暂时无法载入：${escapeHtml(message)}</p>`;
  }

  const count = document.getElementById('resultCount');
  if (count) count.textContent = '';
}

function safeExternalUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

function safeRelativeHref(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.startsWith('//')) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';
  return raw;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
}
