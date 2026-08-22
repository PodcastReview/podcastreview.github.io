'use strict';

(() => {
  const EXTRA_RECORD = {
    title: '123-断头台为何是平等和民主的象征？',
    source: 'The Rest Is History 505 + Paul Friedland, Seeing Justice Done',
    points: [
      ['开场与回扣', '中文节目开场提醒不要在车上和小孩一起听，因为会很血腥；TRIH 505 开场同样出现 car + small children + warned，并在后面对应位置回扣。'],
      ['Tobias Schmidt', '中文节目：德国人、钢琴制造商；TRIH 505：German, piano maker。'],
      ['试刀', '中文节目：羊 → 牛 → 几具尸体；TRIH 505：sheep → calf → three human corpses。'],
      ['Guillotin 拒绝', '中文节目：因受嘲笑而拒绝参与制造；TRIH 505：offended / huge sulk / 不愿参与。'],
      ['Damiens', '中文节目：公开阉割、四马失败后切断肌腱；TRIH 505 对应出现 publicly emasculated / cut his tendons。'],
      ['“美德共和国”', '中文节目：“一个拥有美德的共和国，只能通过鲜血诞生。”；TRIH 505：a republic of virtue can only be born through blood。'],
      ['Friedland 译文', '中文节目说明死刑争论的演变“都被这个历史学家翻译成了英文”；TRIH 505 说明 Friedland translated them in his book / this is where I got the translations from。'],
      ['八斧', '中文节目以法国刽子手第一人称讲“我自己”砍公爵的头，砍了八下；TRIH 505 后段插入 Jack Ketch 砍 Monmouth 公爵八下的例子。']
    ]
  };

  let baseTotal = null;
  let patching = false;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function recordHtml(record) {
    return `
      <details class="record" data-supplement-record="guillotine-123">
        <summary>
          <div>
            <div class="record-title">${escapeHtml(record.title)}</div>
            <div class="record-source">对照材料：${escapeHtml(record.source)}</div>
          </div>
        </summary>
        <div class="record-body">
          <div class="evidence-points">${record.points.map(([title, text]) => `
            <div class="evidence-point">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(text)}</span>
            </div>`).join('')}</div>
        </div>
      </details>`;
  }

  function queryMatches(record) {
    const input = document.getElementById('search');
    const query = String(input?.value ?? '').trim().toLocaleLowerCase('zh-CN');
    if (!query) return true;
    const text = [record.title, record.source, ...record.points.flat()].join(' ').toLocaleLowerCase('zh-CN');
    return text.includes(query);
  }

  function patchRecords() {
    if (patching) return;
    const records = document.getElementById('records');
    if (!records || !records.querySelector('.record')) return;

    patching = true;
    try {
      const existing = Array.from(records.querySelectorAll('.record'));
      if (baseTotal === null) baseTotal = existing.length;

      for (const title of records.querySelectorAll('.record-title')) {
        if (title.textContent.trim() === '《科利奥莱纳斯》（两期）') {
          title.textContent = '364/365-《科利奥莱纳斯》（两期）';
        }
      }

      if (queryMatches(EXTRA_RECORD) && !records.querySelector('[data-supplement-record="guillotine-123"]')) {
        records.insertAdjacentHTML('beforeend', recordHtml(EXTRA_RECORD));
      }

      const visibleCount = records.querySelectorAll('.record').length;
      const total = (baseTotal ?? visibleCount) + 1;

      const count = document.getElementById('resultCount');
      if (count) count.textContent = `显示 ${visibleCount} / ${total} 条核对记录`;

      const stat = document.querySelector('#stats .stat:nth-child(2) strong');
      if (stat) stat.textContent = new Intl.NumberFormat('zh-CN').format(total);

      const hero = document.getElementById('heroSummary');
      if (hero) {
        hero.textContent = hero.textContent.replace(/目前整理[\d,]+条核对记录。?/, `目前整理${new Intl.NumberFormat('zh-CN').format(total)}条核对记录。`);
      }
    } finally {
      patching = false;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const records = document.getElementById('records');
    if (!records) return;

    const observer = new MutationObserver(() => queueMicrotask(patchRecords));
    observer.observe(records, { childList: true });

    const search = document.getElementById('search');
    if (search) search.addEventListener('input', () => setTimeout(patchRecords, 0));

    const timer = setInterval(() => {
      patchRecords();
      if (baseTotal !== null) clearInterval(timer);
    }, 80);
    setTimeout(() => clearInterval(timer), 5000);
  });
})();
