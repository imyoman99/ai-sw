// GitHub API에서 가져올 저장소 목록의 대상 사용자명입니다.
// 이 값은 포트폴리오에 노출할 본인 GitHub 계정으로 맞춰야 합니다.
const GITHUB_USERNAME = 'imyoman99';

// 앱 전체 상태를 한 곳에 모아 관리합니다.
// 화면 렌더링은 이 상태를 기준으로만 동작하도록 구성되어 있어
// 데이터 흐름을 추적하기 쉽고, UI 갱신 시점도 명확해집니다.
const STATE = {
  // 테마는 localStorage 우선, 없으면 OS 설정을 따라갑니다.
  theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  projects: {
    // GitHub API에서 받아온 원본 저장소 목록
    data: [],
    // 비동기 요청 상태를 구분해 로딩/오류/빈 상태 UI를 제어합니다.
    status: 'idle',
    // API 요청 실패 시 사용자에게 보여줄 메시지
    errorMsg: null,
    // 언어 필터링 기준값
    filter: 'All'
  }
};

// 반복해서 사용할 DOM 요소를 미리 캐싱합니다.
// 매번 document.querySelector를 호출하지 않아도 되므로 코드가 간결해집니다.
const els = {
  // 헤더는 스크롤 시 배경과 그림자 스타일이 바뀝니다.
  header: document.getElementById('header'),
  // 테마 전환 버튼
  themeBtn: document.getElementById('theme-toggle'),
  // 모바일 메뉴를 여는 햄버거 버튼
  hamburger: document.getElementById('hamburger-btn'),
  // 모바일 메뉴 영역
  nav: document.querySelector('.nav-menu'),
  // 상단으로 이동 버튼
  scrollTop: document.getElementById('scroll-top'),
  // GitHub 프로젝트 카드가 렌더링되는 영역
  projContainer: document.getElementById('projects-container'),
  // 프로젝트 언어 필터 버튼이 들어가는 영역
  filters: document.getElementById('project-filters'),
  // 문의 폼
  form: document.getElementById('contact-form')
};

// 앱 시작 시 한 번만 실행되는 초기화 함수입니다.
// 테마 적용, 이벤트 바인딩, 프로젝트 데이터 요청을 순서대로 처리합니다.
function init() {
  applyTheme(STATE.theme);
  bindEvents();
  fetchProjects();
}

// 외부 API 값이나 사용자 입력값을 그대로 HTML에 넣지 않도록 문자열을 이스케이프합니다.
// XSS 위험을 낮추기 위한 기본적인 방어 장치입니다.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// GitHub 저장소 URL이 안전한 형식인지 검사합니다.
// github.com HTTPS 주소만 허용하고, 그 외 값은 기본 주소로 되돌립니다.
function getSafeRepositoryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : 'https://github.com';
  } catch {
    return 'https://github.com';
  }
}

// ==========================================
// 4. 이벤트 -> 상태 변경 -> 렌더링 패턴
// ==========================================

// 현재 테마를 문서 루트에 반영합니다.
// CSS 변수 기반 테마가 이 속성을 보고 색상을 바꿉니다.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = els.themeBtn.querySelector('i');
  // 다크 모드에는 태양 아이콘, 라이트 모드에는 달 아이콘을 표시합니다.
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// GitHub API에서 공개 저장소 목록을 가져옵니다.
// 요청 상태를 업데이트하고, 결과에 따라 프로젝트 목록과 필터를 다시 렌더링합니다.
async function fetchProjects() {
  STATE.projects.status = 'loading';
  STATE.projects.errorMsg = null;
  // 필터는 성공적으로 데이터를 받아와야 의미가 있으므로 요청 전 비워둡니다.
  els.filters.replaceChildren();
  renderProjects();

  try {
    // 최근 수정 순으로 6개만 가져와, 포트폴리오에 핵심 프로젝트만 보여줍니다.
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
    if (!res.ok) throw new Error(`API 통신 에러: ${res.status}`);

    const data = await res.json();
    // 받아온 데이터는 그대로 상태에 저장하고, 데이터 유무에 따라 상태를 분기합니다.
    STATE.projects.data = data;
    STATE.projects.status = data.length === 0 ? 'empty' : 'success';

    // 저장소 언어 목록으로 필터 버튼을 생성합니다.
    renderFilters();
  } catch (error) {
    // 오류 메시지는 사용자에게 보여줄 수 있도록 상태에 보관합니다.
    STATE.projects.status = 'error';
    STATE.projects.errorMsg = error.message;
  }

  // 로딩 상태를 벗어나 최종 결과 UI를 렌더링합니다.
  renderProjects();
}

// 프로젝트 언어별 필터 버튼을 동적으로 만듭니다.
// 현재 선택된 필터는 active 클래스로 시각적으로 표시합니다.
function renderFilters() {
  if (STATE.projects.status !== 'success') return;
  const langs = ['All', ...new Set(STATE.projects.data.map(p => p.language).filter(Boolean))];

  els.filters.innerHTML = langs.map(lang =>
    `<button class="filter-btn ${STATE.projects.filter === lang ? 'active' : ''}" data-lang="${escapeHtml(lang)}">${escapeHtml(lang)}</button>`
  ).join('');

  // 필터 클릭 시 상태를 바꾸고, 필터 버튼과 프로젝트 목록을 다시 그립니다.
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      STATE.projects.filter = e.currentTarget.dataset.lang;
      renderFilters();
      renderProjects();
    });
  });
}

// 프로젝트 섹션의 실제 내용을 렌더링합니다.
// 상태값에 따라 로딩, 오류, 빈 목록, 정상 목록을 각각 다르게 표시합니다.
function renderProjects() {
  const { data, status, errorMsg, filter } = STATE.projects;

  if (status === 'loading') {
    els.projContainer.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin fa-2x"></i><p>불러오는 중...</p></div>`;
    return;
  }
  if (status === 'error') {
    els.projContainer.innerHTML = `<div class="error-state"><p>프로젝트를 불러올 수 없습니다.</p><p class="error-detail">잠시 후 다시 시도해주세요.</p><p class="error-detail">${escapeHtml(errorMsg)}</p><button class="btn btn-outline" data-action="retry-projects">재시도</button></div>`;
    return;
  }
  if (status === 'empty') {
    els.filters.replaceChildren();
    els.projContainer.innerHTML = `<div class="empty-state">표시할 프로젝트가 없습니다.</div>`;
    return;
  }

  // 선택된 언어 기준으로 목록을 거른 뒤 카드 HTML로 변환합니다.
  const filteredData = filter === 'All' ? data : data.filter(p => p.language === filter);

  els.projContainer.innerHTML = filteredData.map(repo => {
    const { name, description, html_url, stargazers_count, language } = repo;
    const safeUrl = escapeHtml(getSafeRepositoryUrl(html_url));
    return `
      <article class="project-card">
        <h3><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a></h3>
        <p>${escapeHtml(description || '설명이 없습니다.')}</p>
        <div class="project-meta">
          <span><i class="fas fa-code"></i> ${escapeHtml(language || 'Unknown')}</span>
          <span><i class="fas fa-star"></i> ${escapeHtml(stargazers_count)}</span>
        </div>
      </article>
    `;
  }).join('');
}

// ==========================================
// 5. 기타 UI 이벤트 바인딩
// ==========================================

  // 테마, 네비게이션, 스크롤, 폼 검증 같은 UI 이벤트를 한곳에 묶습니다.
  // 이렇게 하면 이벤트가 흩어지지 않아 유지보수가 쉬워집니다.
function bindEvents() {
    // 다크 모드와 라이트 모드를 번갈아 전환하고, 선택값을 저장합니다.
  els.themeBtn.addEventListener('click', () => {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', STATE.theme);
    applyTheme(STATE.theme);
  });

    // 모바일 햄버거 메뉴는 클릭 시 열고 닫습니다.
  els.hamburger.addEventListener('click', () => els.nav.classList.toggle('active'));
  document.querySelectorAll('.nav-link').forEach(link => {
      // 메뉴 항목을 누르면 모바일 메뉴를 닫아 화면을 깔끔하게 정리합니다.
    link.addEventListener('click', () => els.nav.classList.remove('active'));
  });

    // 에러 상태에서 재시도 버튼을 누르면 프로젝트를 다시 요청합니다.
  els.projContainer.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="retry-projects"]')) fetchProjects();
  });

    // 스크롤 위치에 따라 헤더와 상단 이동 버튼의 상태를 바꿉니다.
  window.addEventListener('scroll', () => {
    els.header.classList.toggle('scrolled', window.scrollY > 60);
    els.scrollTop.classList.toggle('visible', window.scrollY > 300);
  });
    // 맨 위로 부드럽게 이동합니다.
  els.scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // 화면에 들어오는 요소에만 등장 애니메이션을 적용합니다.
    // 불필요한 애니메이션 반복을 막기 위해 한 번 보이면 관찰을 해제합니다.
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('appear');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // 문의 폼 제출 시 값의 유효성을 검사합니다.
    // 입력 중에는 에러 스타일을 즉시 해제해 사용자 피드백을 부드럽게 만듭니다.
  els.form.addEventListener('submit', validateForm);
  els.form.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', () => input.parentElement.classList.remove('invalid'));
  });
}

  // 폼 검증 로직입니다.
  // 이름, 이메일, 메시지의 필수 여부를 확인한 뒤, 유효하면 성공 메시지를 잠깐 보여줍니다.
function validateForm(e) {
  e.preventDefault();
  let isValid = true;
  const { name, email, message } = els.form.elements;

    // 조건이 실패한 필드에만 invalid 클래스를 붙여 시각적으로 에러를 표현합니다.
  const checkValid = (field, condition) => {
    if (condition) {
      field.parentElement.classList.add('invalid');
      isValid = false;
    } else {
      field.parentElement.classList.remove('invalid');
    }
  };

  // 이름은 비어 있으면 안 됩니다.
  checkValid(name, name.value.trim() === '');
  // 이메일은 기본적인 정규식 형식을 만족해야 합니다.
  checkValid(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
  // 메시지도 비어 있으면 안 됩니다.
  checkValid(message, message.value.trim() === '');

  if (isValid) {
    const successMessage = document.getElementById('form-success');
    const submittedName = name.value.trim();
    // 사용자 입력값은 HTML이 아니라 텍스트로만 안전하게 넣기 위해 textContent를 사용합니다.
    successMessage.textContent = `${submittedName}님, 메시지가 전송되었습니다!`;
    successMessage.style.display = 'block';
    els.form.reset();
    setTimeout(() => successMessage.style.display = 'none', 3000);
  }
}

// DOM이 모두 준비되면 앱을 시작합니다.
document.addEventListener('DOMContentLoaded', init);