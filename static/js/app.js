/* 个人工作台 — 前端逻辑 */

// ========== 通用 ==========

async function api(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const resp = await fetch(url, {
        ...options,
        headers: headers,
        signal: options.signal || null,
    });
    if (!resp.ok) {
        throw new Error('请求失败: ' + resp.status + ' ' + resp.statusText);
    }
    return resp.json();
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let inList = false;
    const result = [];
    for (const line of lines) {
        const listMatch = line.match(/^[-*] (.+)/);
        if (listMatch) {
            if (!inList) { result.push('<ul>'); inList = true; }
            result.push('<li>' + escapeHtml(listMatch[1]) + '</li>');
        } else {
            if (inList) { result.push('</ul>'); inList = false; }
            if (line === '') { result.push('<br>'); continue; }
            const h3 = line.match(/^### (.+)/);
            const h2 = line.match(/^## (.+)/);
            const h1 = line.match(/^# (.+)/);
            if (h3) result.push('<h3>' + escapeHtml(h3[1]) + '</h3>');
            else if (h2) result.push('<h2>' + escapeHtml(h2[1]) + '</h2>');
            else if (h1) result.push('<h1>' + escapeHtml(h1[1]) + '</h1>');
            else result.push('<p>' + escapeHtml(line) + '</p>');
        }
    }
    if (inList) result.push('</ul>');
    return result.join('\n');
}

function renderContent(text) {
    if (!text) return '<p class="text-muted">暂无内容</p>';
    const safe = escapeHtml(text);
    return '<p>' + safe.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
}

// ========== 导航 ==========

const navTabs = $$('.nav-tab');
const sections = $$('.section');

navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        $('#' + tab.dataset.section).classList.add('active');
    });
});

// ========== 类目管理 ==========

let noteCategoryId = '';
let promptCategoryId = '';

async function loadCategories(type_, containerId, selectId) {
    const cats = await api('/api/categories/' + type_);
    const container = $(containerId);
    if (!container) return;
    const currentId = type_ === 'note' ? noteCategoryId : promptCategoryId;
    container.innerHTML = cats.map(c =>
        '<div class="cat-item ' + (c.id === currentId ? 'active' : '') + '" data-id="' + c.id + '" onclick="selectCategory(\'' + type_ + '\',\'' + c.id + '\')">' +
            '<span class="cat-name">' + escapeHtml(c.name) + '</span>' +
            '<button class="cat-del" onclick="event.stopPropagation();delCategory(\'' + c.id + '\')">x</button>' +
        '</div>'
    ).join('');
    container.insertAdjacentHTML('afterbegin',
        '<div class="cat-item ' + (!currentId ? 'active' : '') + '" data-id="" onclick="selectCategory(\'' + type_ + '\',\'\')">' +
            '<span class="cat-name">全部</span>' +
        '</div>'
    );
    const select = $(selectId);
    if (select) {
        select.innerHTML = '<option value="">无类目</option>' + cats.map(c =>
            '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'
        ).join('');
    }
}

function selectCategory(type_, id) {
    if (type_ === 'note') {
        noteCategoryId = id;
        loadNotes();
        loadCategories('note', '#note-categories', '#note-category-select');
    } else {
        promptCategoryId = id;
        loadPrompts();
        loadCategories('prompt', '#prompt-categories', '#prompt-category-select');
    }
}

async function newCategory(type_) {
    const name = prompt('输入类目名称：');
    if (!name) return;
    await api('/api/categories/' + type_, {
        method: 'POST',
        body: JSON.stringify({ name: name }),
    });
    const sel = type_ === 'note' ? '#note-category-select' : '#prompt-category-select';
    loadCategories(type_, type_ === 'note' ? '#note-categories' : '#prompt-categories', sel);
}

async function delCategory(cid) {
    if (!confirm('删除该类目？类目下的内容不会被删除')) return;
    await api('/api/categories/' + cid, { method: 'DELETE' });
    loadCategories('note', '#note-categories', '#note-category-select');
    loadCategories('prompt', '#prompt-categories', '#prompt-category-select');
}

// ========== 笔记模块 ==========

let currentNoteId = null;
let noteSaveTimer = null;
let noteSaving = false;
let noteDirty = false;

function noteMarkDirty() { noteDirty = true; }

async function loadNotes() {
    const query = noteCategoryId ? '?cat=' + noteCategoryId : '';
    const notes = await api('/api/notes' + query);
    const list = $('#note-list');
    if (!list) return;
    list.innerHTML = notes.map(n =>
        '<div class="note-item ' + (n.id === currentNoteId ? 'active' : '') + '" data-id="' + n.id + '">' +
            '<button class="item-del" onclick="event.stopPropagation();deleteNoteFromList(\'' + n.id + '\')">x</button>' +
            '<h4>' + escapeHtml(n.title || '未命名笔记') + '</h4>' +
            '<p>' + new Date(n.updated).toLocaleString() + '</p>' +
        '</div>'
    ).join('');
    list.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', function () { selectNote(this.dataset.id); });
    });
}

async function selectNote(id) {
    if (noteDirty && currentNoteId && id !== currentNoteId) {
        if (!confirm('当前笔记有未保存的更改，是否放弃？')) return;
        noteDirty = false;
    }
    currentNoteId = id;
    const note = await api('/api/notes/' + id);
    if (!note || note.error) return;
    $('#note-title').value = note.title || '';
    $('#note-draft').value = note.draft || '';
    $('#note-polished').value = note.polished || '';
    const sel = $('#note-category-select');
    if (sel) sel.value = note.category_id || '';
    noteDirty = false;
    $$('.note-item').forEach(function (el) { el.classList.toggle('active', el.dataset.id === id); });
}

async function newNote() {
    if (noteDirty && currentNoteId) {
        if (!confirm('当前笔记有未保存的更改，是否放弃？')) return;
        noteDirty = false;
    }
    const note = await api('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ title: '', draft: '', category_id: noteCategoryId }),
    });
    currentNoteId = note.id;
    $('#note-title').value = '';
    $('#note-draft').value = '';
    $('#note-polished').value = '';
    const sel = $('#note-category-select');
    if (sel) sel.value = noteCategoryId || '';
    noteDirty = false;
    await loadNotes();
}

async function saveNote() {
    if (!currentNoteId || noteSaving) return;
    noteSaving = true;
    const btn = $('.btn-save-note');
    if (btn) btn.textContent = '保存中...';
    try {
        await api('/api/notes/' + currentNoteId, {
            method: 'PUT',
            body: JSON.stringify({
                title: $('#note-title').value,
                draft: $('#note-draft').value,
                polished: $('#note-polished').value,
                category_id: $('#note-category-select').value,
            }),
        });
        noteDirty = false;
        await loadNotes();
        showToast('笔记已保存');
    } finally {
        noteSaving = false;
        if (btn) btn.textContent = '保存';
    }
}

let polishAbort = null;

async function polishNote() {
    if (!currentNoteId) {
        // 没有选中笔记时自动创建
        const note = await api('/api/notes', {
            method: 'POST',
            body: JSON.stringify({ title: '', draft: $('#note-draft').value, category_id: noteCategoryId }),
        });
        currentNoteId = note.id;
        await loadNotes();
    }
    if (polishAbort) { polishAbort.abort(); return; }

    const btn = $('#btn-polish');
    const cancelBtn = $('#btn-polish-cancel');
    polishAbort = new AbortController();
    btn.style.display = 'none';
    cancelBtn.style.display = 'inline-flex';
    cancelBtn.innerHTML = '<span class="loading"></span> 取消';

    try {
        const result = await api('/api/notes/' + currentNoteId + '/polish', {
            method: 'POST',
            body: JSON.stringify({ draft: $('#note-draft').value }),
            signal: polishAbort.signal,
        });
        if (result.polished) $('#note-polished').value = result.polished;
        // 自动保存
        await api('/api/notes/' + currentNoteId, {
            method: 'PUT',
            body: JSON.stringify({
                title: $('#note-title').value,
                draft: $('#note-draft').value,
                polished: $('#note-polished').value,
                category_id: $('#note-category-select').value,
            }),
        });
        noteDirty = false;
        await loadNotes();
        showToast('AI整理完成');
    } catch (e) {
        if (e.name === 'AbortError') return;
        showToast('AI整理失败，请重试');
    } finally {
        polishAbort = null;
        btn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
    }
}

function cancelPolish() {
    if (polishAbort) { polishAbort.abort(); polishAbort = null; }
    $('#btn-polish').style.display = 'inline-flex';
    $('#btn-polish-cancel').style.display = 'none';
}

async function deleteNote() {
    if (!currentNoteId) return;
    if (!confirm('确定删除？')) return;
    await api('/api/notes/' + currentNoteId, { method: 'DELETE' });
    currentNoteId = null;
    $('#note-title').value = '';
    $('#note-draft').value = '';
    $('#note-polished').value = '';
    noteDirty = false;
    await loadNotes();
}

async function deleteNoteFromList(id) {
    if (!confirm('确定删除？')) return;
    await api('/api/notes/' + id, { method: 'DELETE' });
    if (currentNoteId === id) {
        currentNoteId = null;
        $('#note-title').value = '';
        $('#note-draft').value = '';
        $('#note-polished').value = '';
        noteDirty = false;
    }
    await loadNotes();
}

function noteAutoSave() {
    if (!currentNoteId) return;
    noteMarkDirty();
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(saveNote, 2000);
}

$('#note-title')?.addEventListener('input', noteAutoSave);
$('#note-draft')?.addEventListener('input', noteAutoSave);
$('#note-polished')?.addEventListener('input', noteAutoSave);
$('#note-category-select')?.addEventListener('change', function () {
    if (currentNoteId) { noteMarkDirty(); noteAutoSave(); }
});

// ========== 提示词模块 ==========

let currentPromptId = null;
let promptSaveTimer = null;
let promptSaving = false;
let promptDirty = false;

function promptMarkDirty() { promptDirty = true; }

async function loadPrompts() {
    const query = promptCategoryId ? '?cat=' + promptCategoryId : '';
    const items = await api('/api/prompts' + query);
    const list = $('#prompt-list');
    if (!list) return;
    list.innerHTML = items.map(function (p) {
        return '<div class="note-item ' + (p.id === currentPromptId ? 'active' : '') + '" data-id="' + p.id + '">' +
            '<button class="item-del" onclick="event.stopPropagation();deletePromptFromList(\'' + p.id + '\')">x</button>' +
            '<h4>' + escapeHtml(p.title) + '</h4>' +
            '<p>' + new Date(p.updated).toLocaleString() + '</p>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.note-item').forEach(function (item) {
        item.addEventListener('click', function () { selectPrompt(this.dataset.id); });
    });
}

async function selectPrompt(id) {
    if (promptDirty && currentPromptId && id !== currentPromptId) {
        if (!confirm('当前提示词有未保存的更改，是否放弃？')) return;
        promptDirty = false;
    }
    currentPromptId = id;
    const p = await api('/api/prompts/' + id);
    if (!p || p.error) return;
    $('#prompt-title').value = p.title || '';
    $('#prompt-raw').value = p.raw_text || '';
    $('#prompt-optimized').value = p.optimized_text || '';
    const sel = $('#prompt-category-select');
    if (sel) sel.value = p.category_id || '';
    promptDirty = false;
    $$('#prompt-list .note-item').forEach(function (el) { el.classList.toggle('active', el.dataset.id === id); });
}

async function newPrompt() {
    if (promptDirty && currentPromptId) {
        if (!confirm('当前提示词有未保存的更改，是否放弃？')) return;
        promptDirty = false;
    }
    const p = await api('/api/prompts', {
        method: 'POST',
        body: JSON.stringify({ title: '', raw_text: '', category_id: promptCategoryId }),
    });
    currentPromptId = p.id;
    $('#prompt-title').value = '';
    $('#prompt-raw').value = '';
    $('#prompt-optimized').value = '';
    const sel = $('#prompt-category-select');
    if (sel) sel.value = promptCategoryId || '';
    promptDirty = false;
    await loadPrompts();
}

async function savePrompt() {
    if (!currentPromptId || promptSaving) return;
    promptSaving = true;
    const btn = $('.btn-save-prompt');
    if (btn) btn.textContent = '保存中...';
    try {
        await api('/api/prompts/' + currentPromptId, {
            method: 'PUT',
            body: JSON.stringify({
                title: $('#prompt-title').value,
                raw_text: $('#prompt-raw').value,
                optimized_text: $('#prompt-optimized').value,
                category_id: $('#prompt-category-select').value,
            }),
        });
        promptDirty = false;
        await loadPrompts();
        showToast('提示词已保存');
    } finally {
        promptSaving = false;
        if (btn) btn.textContent = '保存提示词';
    }
}

async function deletePrompt() {
    if (!currentPromptId) return;
    if (!confirm('确定删除？')) return;
    await api('/api/prompts/' + currentPromptId, { method: 'DELETE' });
    currentPromptId = null;
    $('#prompt-title').value = '';
    $('#prompt-raw').value = '';
    $('#prompt-optimized').value = '';
    promptDirty = false;
    await loadPrompts();
}

async function deletePromptFromList(id) {
    if (!confirm('确定删除？')) return;
    await api('/api/prompts/' + id, { method: 'DELETE' });
    if (currentPromptId === id) {
        currentPromptId = null;
        $('#prompt-title').value = '';
        $('#prompt-raw').value = '';
        $('#prompt-optimized').value = '';
        promptDirty = false;
    }
    await loadPrompts();
}

let optimizeAbort = null;

async function optimizePrompt() {
    const raw = $('#prompt-raw').value;
    if (!raw) return alert('请先输入自然语言描述');
    if (optimizeAbort) { optimizeAbort.abort(); return; }

    const btn = $('#btn-optimize');
    const cancelBtn = $('#btn-optimize-cancel');
    optimizeAbort = new AbortController();
    btn.style.display = 'none';
    cancelBtn.style.display = 'inline-flex';
    cancelBtn.innerHTML = '<span class="loading"></span> 取消';

    try {
        if (currentPromptId) {
            const result = await api('/api/prompts/' + currentPromptId + '/optimize', {
                method: 'POST', signal: optimizeAbort.signal,
            });
            if (result.optimized) $('#prompt-optimized').value = result.optimized;
            await api('/api/prompts/' + currentPromptId, {
                method: 'PUT',
                body: JSON.stringify({
                    title: $('#prompt-title').value,
                    raw_text: raw,
                    optimized_text: $('#prompt-optimized').value,
                    category_id: $('#prompt-category-select').value,
                }),
            });
            promptDirty = false;
            await loadPrompts();
        } else {
            const result = await api('/api/prompts/optimize-text', {
                method: 'POST',
                body: JSON.stringify({ raw_text: raw }),
                signal: optimizeAbort.signal,
            });
            if (result.optimized) {
                $('#prompt-optimized').value = result.optimized;
                const p = await api('/api/prompts', {
                    method: 'POST',
                    body: JSON.stringify({ title: '', raw_text: raw, category_id: promptCategoryId }),
                });
                currentPromptId = p.id;
                await api('/api/prompts/' + currentPromptId, {
                    method: 'PUT',
                    body: JSON.stringify({
                        title: $('#prompt-title').value || '未命名提示词',
                        raw_text: raw,
                        optimized_text: result.optimized,
                        category_id: $('#prompt-category-select').value,
                    }),
                });
                promptDirty = false;
                await loadPrompts();
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') return;
    } finally {
        optimizeAbort = null;
        btn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
    }
}

$('#btn-optimize-cancel')?.addEventListener('click', function () {
    if (optimizeAbort) { optimizeAbort.abort(); optimizeAbort = null; }
    $('#btn-optimize').style.display = 'inline-flex';
    $('#btn-optimize-cancel').style.display = 'none';
});

$('#btn-optimize')?.addEventListener('click', optimizePrompt);

function promptAutoSave() {
    if (!currentPromptId) return;
    promptMarkDirty();
    clearTimeout(promptSaveTimer);
    promptSaveTimer = setTimeout(savePrompt, 2000);
}

$('#prompt-title')?.addEventListener('input', promptAutoSave);
$('#prompt-raw')?.addEventListener('input', promptAutoSave);
$('#prompt-optimized')?.addEventListener('input', promptAutoSave);
$('#prompt-category-select')?.addEventListener('change', function () {
    if (currentPromptId) { promptMarkDirty(); promptAutoSave(); }
});

// ========== AI 资讯模块 ==========

var _aiNewsCache = null;

async function loadAiNews() {
    var statsDiv = $('#ai-stats');
    var subnavDiv = $('#ai-subnav');
    var contentDiv = $('#ai-content');
    var footerDiv = $('#ai-footer');
    var dateLabel = $('#ai-date-label');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<div class="text-muted" style="padding:2rem;text-align:center"><span class="loading"></span> 加载 AI 资讯...</div>';

    try {
        var data = await api('/api/ai-news');
        if (data.error) throw new Error(data.error);
        _aiNewsCache = data;

        // 日期标签
        if (dateLabel && data.date) {
            dateLabel.textContent = new Date(data.date + 'T00:00:00+08:00').toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' });
        }

        // 分类色映射
        var catColors = { '模型': 'model', '产品': 'product', '行业': 'industry', '论文': 'paper', '技巧': 'tip' };
        function catColor(label) {
            for (var k in catColors) { if (label.indexOf(k) !== -1) return catColors[k]; }
            return 'tip';
        }

        // 统计卡片
        if (statsDiv) {
            statsDiv.innerHTML = '<div class="ai-stat-item"><div class="ai-stat-num">' + data.total + '</div><div class="ai-stat-label">收录总数</div></div>' +
                (data.sections || []).map(function(s) {
                    var zero = s.count === 0 ? ' zero' : '';
                    return '<div class="ai-stat-item"><div class="ai-stat-num' + zero + '">' + s.count + '</div><div class="ai-stat-label">' + escapeHtml(s.label) + '</div></div>';
                }).join('');
        }

        // 子导航
        if (subnavDiv) {
            var anchors = (data.sections || []).map(function(s, i) {
                return '<a href="#ai-sec-' + i + '">' + escapeHtml(s.label) + ' <span class="ai-subnav-chip">' + s.count + '</span></a>';
            }).join('');
            if (anchors) subnavDiv.innerHTML = anchors;
        }

        // 内容区
        var html = '';
        (data.sections || []).forEach(function(sec, si) {
            html += '<div class="ai-section" id="ai-sec-' + si + '">';
            html += '<div class="ai-section-hdr"><h3>' + escapeHtml(sec.label) + '</h3><span class="ai-section-count">' + sec.count + ' 条</span></div>';
            if (sec.count === 0) {
                html += '<div class="ai-empty">暂无资讯</div>';
            } else {
                html += '<div class="ai-grid">';
                (sec.items || []).forEach(function(item, ii) {
                    var cc = catColor(sec.label);
                    html += '<div class="ai-card" style="animation-delay:' + (ii * 0.04).toFixed(2) + 's">' +
                        '<div class="ai-card-top"><span class="ai-card-idx">' + item.idx + '</span><span class="ai-card-title">' + escapeHtml(item.title) + '</span></div>' +
                        '<div class="ai-card-meta"><span class="ai-card-source ' + cc + '">' + escapeHtml(item.sourceName) + '</span></div>' +
                        '<div class="ai-card-desc">' + escapeHtml(item.summary) + '</div>' +
                        '<div class="ai-card-foot"><span class="ai-card-time">' + (item.time || escapeHtml(data.date || '')) + '</span>' +
                        (item.sourceUrl ? '<a class="ai-card-link" href="' + item.sourceUrl + '" target="_blank" rel="noopener noreferrer">阅读原文 &#8599;</a>' : '') +
                        '</div></div>';
                });
                html += '</div>';
            }
            html += '</div>';
        });
        contentDiv.innerHTML = html;

        // 页脚
        if (footerDiv) {
            footerDiv.style.display = 'block';
            footerDiv.innerHTML = '共 <strong>' + data.total + '</strong> 条 AI 资讯 · 数据来源 <strong>AI HOT</strong>（aihot.virxact.com）';
        }

        // 子导航平滑滚动
        subnavDiv.querySelectorAll('a').forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        // 滚动渐入动画
        if (window.requestAnimationFrame) {
            var cards = contentDiv.querySelectorAll('.ai-card');
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.style.animationPlayState = 'running';
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.06, rootMargin: '0px 0px 30px 0px' });
            cards.forEach(function(card) {
                card.style.animationPlayState = 'paused';
                observer.observe(card);
            });
        }
    } catch (e) {
        contentDiv.innerHTML = '<div class="ai-empty">AI 资讯加载失败，请稍后重试</div>';
        console.error('AI 资讯加载失败:', e);
    }
}

$('#btn-refresh-ai')?.addEventListener('click', loadAiNews);

// ========== 热点新闻模块 ==========

let currentSource = 'douyin';
let newsCache = {};

async function loadSources() {
    const sources = await api('/api/news/sources');
    const container = $('#source-tabs');
    if (!container) return;
    container.innerHTML = sources.map(function (s) {
        return '<button class="source-btn ' + (s.id === currentSource ? 'active' : '') + '" data-id="' + s.id + '">' + (s.icon || '') + ' ' + s.name + '</button>';
    }).join('');
    container.querySelectorAll('.source-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            currentSource = this.dataset.id;
            $$('.source-btn').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            loadNews();
        });
    });
}

async function loadNews() {
    const grid = $('#news-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="text-muted" style="padding:2rem;text-align:center"><span class="loading"></span> 抓取中...</div>';
    try {
        const items = await api('/api/news/' + currentSource);
        if (items.error) throw new Error(items.error);
        newsCache[currentSource] = items;
        grid.innerHTML = items.map(function (item, i) {
            var rc = i < 3 ? 'rank-' + (i + 1) : 'rank-n';
            return '<div class="news-card" onclick="openNews(' + i + ')">' +
                '<span class="rank ' + rc + '">' + (i + 1) + '</span>' +
                '<h3>' + escapeHtml(item.title) + '</h3>' +
                '<div class="meta"><span>' + escapeHtml(item.source) + '</span>' + (item.hot ? '<span>热度: ' + escapeHtml(item.hot) + '</span>' : '') + '</div>' +
            '</div>';
        }).join('');
    } catch (e) {
        grid.innerHTML = '<div class="text-muted" style="padding:2rem;text-align:center">加载失败，请重试</div>';
    }
}

function openNews(idx) {
    var item = newsCache[currentSource] && newsCache[currentSource][idx];
    if (item && item.url) window.open(item.url, '_blank');
}

$('#btn-refresh-news')?.addEventListener('click', loadNews);

// ========== GitHub 模块 ==========

let ghLangFilter = '';
let ghCache = [];

function rankClass(idx) {
    if (idx === 0) return ' r1';
    if (idx === 1) return ' r2';
    if (idx === 2) return ' r3';
    return '';
}

async function loadGitHub(lang) {
    if (lang !== undefined) ghLangFilter = lang || '';
    var statsDiv = $('#gh-stats');
    var subnavDiv = $('#gh-subnav');
    var grid = $('#github-grid');
    var dateLabel = $('#gh-date-label');
    if (!grid) return;

    grid.innerHTML = '<div class="text-muted" style="padding:2rem;text-align:center"><span class="loading"></span> 加载 GitHub 热榜...</div>';

    try {
        var projects = await api('/api/github');
        if (projects.error) throw new Error(projects.error);

        // 语言过滤
        if (ghLangFilter) {
            projects = projects.filter(function(p) {
                return p.language && p.language.toLowerCase() === ghLangFilter.toLowerCase();
            });
        }
        ghCache = projects;

        // 日期
        if (dateLabel) dateLabel.textContent = '最近 7 天';

        // 统计卡片
        var totalStars = projects.reduce(function(s, p) { return s + (p.stars || 0); }, 0);
        var langs = {};
        projects.forEach(function(p) {
            if (p.language) langs[p.language] = (langs[p.language] || 0) + 1;
        });
        var topLang = '';
        var topLangCount = 0;
        Object.keys(langs).forEach(function(k) {
            if (langs[k] > topLangCount) { topLang = k; topLangCount = langs[k]; }
        });

        if (statsDiv) {
            statsDiv.innerHTML =
                '<div class="ai-stat-item"><div class="ai-stat-num">' + projects.length + '</div><div class="ai-stat-label">热门项目</div></div>' +
                '<div class="ai-stat-item"><div class="ai-stat-num">' + (totalStars / 1000).toFixed(1) + 'k</div><div class="ai-stat-label">累计 Stars</div></div>' +
                '<div class="ai-stat-item"><div class="ai-stat-num" style="font-size:1.1rem">' + escapeHtml(topLang || 'N/A') + '</div><div class="ai-stat-label">最大占比语言 (' + topLangCount + ' 个)</div></div>';
        }

        // 语言子导航
        if (subnavDiv) {
            var allLangs = Object.keys(langs).sort(function(a, b) { return langs[b] - langs[a]; }).slice(0, 8);
            var subnavHtml = '<a href="javascript:void(0)" onclick="loadGitHub(\'\')" class="' + (!ghLangFilter ? 'active' : '') + '">全部 <span class="ai-subnav-chip">' + projects.length + '</span></a>';
            allLangs.forEach(function(l) {
                subnavHtml += '<a href="javascript:void(0)" onclick="loadGitHub(\'' + l + '\')" class="' + (ghLangFilter === l ? 'active' : '') + '" style="' + (ghLangFilter === l ? 'color:var(--accent-cyan);background:rgba(6,182,212,0.1)' : '') + '">' + escapeHtml(l) + ' <span class="ai-subnav-chip" style="' + (ghLangFilter === l ? 'background:var(--accent-cyan);color:#fff' : '') + '">' + langs[l] + '</span></a>';
            });
            subnavDiv.innerHTML = subnavHtml;
        }

        // 卡片网格
        grid.innerHTML = projects.map(function(p, i) {
            return '<div class="gh-card" style="animation-delay:' + (i * 0.04).toFixed(2) + 's">' +
                '<div class="gh-card-top"><span class="gh-card-idx' + rankClass(i) + '">' + (i + 1) + '</span>' +
                '<span class="gh-card-name"><a href="' + p.url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(p.name) + '</a></span></div>' +
                '<div class="gh-card-meta">' +
                    (p.language ? '<span class="gh-card-lang">' + escapeHtml(p.language) + '</span>' : '') +
                '</div>' +
                '<div class="gh-card-desc">' + escapeHtml(p.description || '暂无描述') + '</div>' +
                '<div class="gh-card-stats">' +
                    '<span class="gh-stat">★ <span class="gh-stat-val">' + p.stars.toLocaleString() + '</span></span>' +
                    '<span class="gh-stat">⑂ <span class="gh-stat-val">' + p.forks.toLocaleString() + '</span></span>' +
                '</div>' +
                (p.topics && p.topics.length ? '<div class="gh-card-topics">' + p.topics.slice(0, 5).map(function(t) { return '<span class="gh-topic-tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') +
                '<div class="gh-card-foot">' +
                    '<a class="ai-card-link" href="' + p.url + '" target="_blank" rel="noopener noreferrer" style="background:rgba(6,182,212,0.1);color:var(--accent-cyan)">查看仓库 &#8599;</a>' +
                    '<button class="gh-btn-analyze" data-idx="' + i + '"><!-- -->AI 拆解</button>' +
                '</div>' +
                '<div class="gh-card-analysis" style="display:none"></div>' +
            '</div>';
        }).join('');

        // 绑定 AI 拆解按钮
        grid.querySelectorAll('.gh-btn-analyze').forEach(function(btn) {
            btn.addEventListener('click', function(e) { e.stopPropagation(); analyzeProjectNew(btn); });
        });

        // 滚动渐入动画
        if (window.requestAnimationFrame) {
            var cards = grid.querySelectorAll('.gh-card');
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        entry.target.style.animationPlayState = 'running';
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.06, rootMargin: '0px 0px 30px 0px' });
            cards.forEach(function(card) {
                card.style.animationPlayState = 'paused';
                observer.observe(card);
            });
        }
    } catch (e) {
        grid.innerHTML = '<div class="ai-empty">GitHub 热榜加载失败，请稍后重试</div>';
        console.error('GitHub 加载失败:', e);
    }
}

async function analyzeProjectNew(btn) {
    var card = btn.closest('.gh-card');
    var ad = card.querySelector('.gh-card-analysis');
    if (ad.style.display !== 'none') { ad.style.display = 'none'; btn.textContent = 'AI 拆解'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span>';
    ad.style.display = 'block';
    ad.innerHTML = 'AI 拆解中...';
    try {
        var nameLink = card.querySelector('.gh-card-name a');
        var descEl = card.querySelector('.gh-card-desc');
        var resp = await api('/api/github/analyze', {
            method: 'POST',
            body: JSON.stringify({
                name: nameLink ? nameLink.textContent : '',
                description: descEl ? descEl.textContent : '',
            }),
        });
        ad.innerHTML = renderMarkdown(resp.analysis || '分析失败');
        btn.textContent = '收起分析';
    } catch (e) {
        ad.innerHTML = '分析失败，请重试';
        btn.textContent = 'AI 拆解';
    }
    btn.disabled = false;
}

$('#btn-refresh-github')?.addEventListener('click', function() { loadGitHub(); });

// ========== Toast ==========

function showToast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._hide);
    t._hide = setTimeout(function () { t.style.display = 'none'; }, 2500);
}

// ========== 项目模块 ==========

async function loadProjects() {
    const grid = $('#project-grid');
    if (!grid) return;
    var items = await api('/api/projects');
    window._projectCache = items;
    grid.innerHTML = items.map(function (p) {
        return '<div class="github-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:start">' +
                '<h3 style="color:var(--accent-cyan)">' + escapeHtml(p.name) + '</h3>' +
                '<span class="topic-tag" style="font-size:0.75rem">' + escapeHtml(p.status || '进行中') + '</span>' +
            '</div>' +
            '<p class="desc">' + (escapeHtml(p.description) || '暂无描述') + '</p>' +
            '<div class="stats"><span>创建: ' + new Date(p.created).toLocaleDateString() + '</span></div>' +
            '<button class="btn btn-ghost btn-sm btn-edit-project" data-id="' + p.id + '">编辑</button>' +
            '<button class="btn btn-ghost btn-sm btn-del-project" data-id="' + p.id + '" style="margin-left:0.3rem">删除</button>' +
            '<div class="analysis" style="display:none;margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid var(--border)">' +
                '<label style="font-size:0.8rem;color:var(--text-secondary)">后续计划</label>' +
                '<div class="content-text" style="margin-top:0.3rem">' + renderContent(p.plan) + '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.btn-edit-project').forEach(function (btn) {
        btn.addEventListener('click', function (e) { e.stopPropagation(); openProjectDialog(this.dataset.id); });
    });
    grid.querySelectorAll('.btn-del-project').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (confirm('确定删除？')) {
                api('/api/projects/' + this.dataset.id, { method: 'DELETE' }).then(loadProjects);
            }
        });
    });
}

async function newProject() {
    // 直接创建空白项目，让用户通过编辑按钮完善
    const name = prompt('项目名称：');
    if (!name) return;
    var p = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: name, description: '', plan: '' }) });
    loadProjects();
    // 创建后立即弹出编辑
    openProjectDialog(p.id);
}

let editProjectId = null;

function openProjectDialog(id) {
    editProjectId = id;
    var itemsCache = window._projectCache;
    if (!itemsCache) return;
    var p = itemsCache.find(function (x) { return x.id === id; });
    if (!p) return;
    $('#project-dialog-name').value = p.name || '';
    $('#project-dialog-desc').value = p.description || '';
    $('#project-dialog-plan').value = p.plan || '';
    $('#project-dialog-status').value = p.status || '进行中';
    $('#project-dialog-title').textContent = p.id ? '编辑项目' : '新建项目';
    $('#project-dialog').style.display = 'flex';
    // 聚焦第一个字段
    setTimeout(function () { $('#project-dialog-name').focus(); }, 100);
}

$('#project-dialog-save')?.addEventListener('click', async function () {
    if (!editProjectId) return;
    var name = $('#project-dialog-name').value.trim();
    if (!name) return showToast('请输入项目名称');
    await api('/api/projects/' + editProjectId, {
        method: 'PUT',
        body: JSON.stringify({
            name: name,
            description: $('#project-dialog-desc').value.trim(),
            plan: $('#project-dialog-plan').value.trim(),
            status: $('#project-dialog-status').value,
        }),
    });
    $('#project-dialog').style.display = 'none';
    editProjectId = null;
    showToast('项目已保存');
    loadProjects();
});

$('#project-dialog-cancel')?.addEventListener('click', function () {
    $('#project-dialog').style.display = 'none';
    editProjectId = null;
});

// 点击遮罩关闭
$('#project-dialog')?.addEventListener('click', function (e) {
    if (e.target === this) { this.style.display = 'none'; editProjectId = null; }
});

// ========== 工具箱模块 ==========

// 工具注册表 — 新增工具在这里添加即可
const TOOLS = [
    {
        id: 'image-tools',
        name: '图片工具箱',
        icon: '🖼️',
        desc: '批量压缩、重命名、格式转换、调整尺寸、添加水印、旋转翻转、拼图合并',
        tags: ['压缩', '重命名', '转换', '水印', '拼图'],
        url: '/static/tools/image-tools.html',
    },
    {
        id: 'pdf-tools',
        name: 'PDF 工具箱',
        icon: '📄',
        desc: '合并、拆分、旋转、删除页面、PDF转图片、图片转PDF、添加水印、解除限制',
        tags: ['合并', '拆分', '旋转', '转图片', '水印'],
        url: '/static/tools/pdf-tools.html',
    },
];

function loadToolbox() {
    const grid = $('#toolbox-grid');
    if (!grid) return;
    grid.innerHTML = TOOLS.map(function (t) {
        return '<div class="tool-card" onclick="openTool(\'' + t.id + '\')">' +
            '<div class="tool-icon">' + t.icon + '</div>' +
            '<h3>' + escapeHtml(t.name) + '</h3>' +
            '<p class="desc">' + escapeHtml(t.desc) + '</p>' +
            '<div class="tool-tags">' + t.tags.map(function (tag) { return '<span class="tool-tag">' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' +
        '</div>';
    }).join('');
}

function openTool(id) {
    var tool = TOOLS.find(function (t) { return t.id === id; });
    if (!tool) return;
    $('#toolbox-grid-view').style.display = 'none';
    $('#toolbox-run-view').style.display = 'block';
    $('#toolbox-run-title').textContent = tool.icon + ' ' + tool.name;
    $('#toolbox-iframe').src = tool.url;
}

function closeTool() {
    $('#toolbox-grid-view').style.display = 'block';
    $('#toolbox-run-view').style.display = 'none';
    $('#toolbox-iframe').src = '';
}

// ========== 初始化 ==========

loadCategories('note', '#note-categories', '#note-category-select');
loadCategories('prompt', '#prompt-categories', '#prompt-category-select');
loadNotes();
loadPrompts();
loadToolbox();
loadSources().then(loadNews);
loadGitHub();
loadProjects();
loadAiNews();
