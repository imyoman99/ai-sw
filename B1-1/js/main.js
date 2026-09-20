const GITHUB_USERNAME = 'imyoman99'; // 본인 아이디로 변경

// 1. 상태 관리 객체 (이 프로젝트의 두뇌)
// 파편화된 변수를 하나로 모아 상태 추적을 용이하게 합니다.
const STATE = {
  theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  projects: {
    data: [],       // API로 받아온 원본 데이터
    status: 'idle', // 'idle' | 'loading' | 'success' | 'error' | 'empty'
    errorMsg: null,
    filter: 'All'
  }
};

// 2. DOM 요소 선택
const els = {
  header: document.getElementById('header'),
  themeBtn: document.getElementById('theme-toggle'),
  hamburger: document.getElementById('hamburger-btn'),
  nav: document.querySelector('.nav-menu'),
  scrollTop: document.getElementById('scroll-top'),
  projContainer: document.getElementById('projects-container'),
  filters: document.getElementById('project-filters'),
  form: document.getElementById('contact-form')
};

// 3. 초기화 (앱 실행)
function init() {
  applyTheme(STATE.theme);
  bindEvents();
  fetchProjects();
}

// ==========================================
// 4. 이벤트 -> 상태 변경 -> 렌더링 패턴
// ==========================================

// [테마 관리] 이벤트 발생 -> 상태 변경 -> UI 렌더링
els.themeBtn.addEventListener('click', () => {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', STATE.theme);
  applyTheme(STATE.theme);
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = els.themeBtn.querySelector('i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// [API 연동] 상태 관리에 따른 비동기 처리
async function fetchProjects() {
  STATE.projects.status = 'loading';
  renderProjects(); // 로딩 UI 그리기

  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
    if (!res.ok) throw new Error(`API 통신 에러: ${res.status}`);

    const data = await res.json();
    STATE.projects.data = data;
    STATE.projects.status = data.length === 0 ? 'empty' : 'success';

    renderFilters();
  } catch (error) {
    STATE.projects.status = 'error';
    STATE.projects.errorMsg = error.message;
  }

  renderProjects(); // 성공/실패 UI 렌더링
}

// 필터 클릭 이벤트 -> 상태(filter) 변경 -> UI 렌더링
function renderFilters() {
  if (STATE.projects.status !== 'success') return;
  const langs = ['All', ...new Set(STATE.projects.data.map(p => p.language).filter(Boolean))];

  els.filters.innerHTML = langs.map(lang =>
    `<button class="filter-btn ${STATE.projects.filter === lang ? 'active' : ''}" data-lang="${lang}">${lang}</button>`
  ).join('');

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      STATE.projects.filter = e.target.dataset.lang; // 상태 업데이트
      renderFilters();  // 버튼 액티브 상태 재렌더링
      renderProjects(); // 프로젝트 리스트 재렌더링
    });
  });
}

function renderProjects() {
  const { data, status, errorMsg, filter } = STATE.projects;

  if (status === 'loading') {
    els.projContainer.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin fa-2x"></i><p>불러오는 중...</p></div>`;
    return;
  }
  if (status === 'error') {
    els.projContainer.innerHTML = `<div class="error-state"><p>에러 발생: ${errorMsg}</p><button class="btn btn-outline" onclick="fetchProjects()">재시도</button></div>`;
    return;
  }
  if (status === 'empty') {
    els.projContainer.innerHTML = `<div class="empty-state">표시할 프로젝트가 없습니다.</div>`;
    return;
  }

  // 성공 상태 처리 (필터링 -> HTML 변환)
  const filteredData = filter === 'All' ? data : data.filter(p => p.language === filter);

  els.projContainer.innerHTML = filteredData.map(repo => {
    const { name, description, html_url, stargazers_count, language } = repo;
    return `
      <article class="project-card">
        <h3><a href="${html_url}" target="_blank">${name}</a></h3>
        <p>${description || '설명이 없습니다.'}</p>
        <div class="project-meta">
          <span><i class="fas fa-code"></i> ${language || 'Unknown'}</span>
          <span><i class="fas fa-star"></i> ${stargazers_count}</span>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================
// 5. 기타 UI 이벤트 바인딩
// ==========================================
function bindEvents() {
  // 햄버거 메뉴
  els.hamburger.addEventListener('click', () => els.nav.classList.toggle('active'));
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => els.nav.classList.remove('active'));
  });

  // 스크롤 이벤트
  window.addEventListener('scroll', () => {
    els.header.classList.toggle('scrolled', window.scrollY > 60);
    els.scrollTop.classList.toggle('visible', window.scrollY > 300);
  });
  els.scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // 스크롤 애니메이션
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('appear');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // 폼 유효성 검사 (Submit 및 Input 이벤트)
  els.form.addEventListener('submit', validateForm);
  els.form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => input.parentElement.classList.remove('invalid'));
  });
}

function validateForm(e) {
  e.preventDefault();
  let isValid = true;
  const { name, email, message } = els.form.elements;

  const checkValid = (field, condition) => {
    if (condition) {
      field.parentElement.classList.add('invalid');
      isValid = false;
    } else {
      field.parentElement.classList.remove('invalid');
    }
  };

  checkValid(name, name.value.trim() === '');
  checkValid(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
  checkValid(message, message.value.trim() === '');

  if (isValid) {
    document.getElementById('form-success').style.display = 'block';
    els.form.reset();
    setTimeout(() => document.getElementById('form-success').style.display = 'none', 3000);
  }
}

// 앱 실행
document.addEventListener('DOMContentLoaded', init);