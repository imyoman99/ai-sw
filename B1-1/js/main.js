const GITHUB_USERNAME = 'imyoman99'; // GitHub 저장소를 가져올 사용자 아이디

// 앱 전체 상태를 한 곳에 모아 관리합니다.
// 화면 렌더링은 이 상태를 기준으로만 동작하도록 구성되어 있어
// 데이터 흐름을 추적하기 쉽고, UI 갱신 시점도 명확해집니다.
const STATE = {
  theme: localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), // 저장된 테마 또는 운영체제 테마
  projects: {
    data: [],       // GitHub API에서 받아온 원본 프로젝트 목록
    status: 'idle', // 프로젝트 요청 상태: 대기, 로딩, 성공, 오류, 비어 있음('idle' | 'loading' | 'success' | 'error' | 'empty')
    errorMsg: null, // API 오류 메시지를 저장할 변수
    filter: 'All' // 현재 선택된 프로젝트 언어 필터
  }
};

// 반복해서 사용할 DOM 요소를 미리 캐싱합니다.
// 매번 document.querySelector를 호출하지 않아도 되므로 코드가 간결해집니다.
const els = {
  header: document.getElementById('header'), // 고정 헤더 요소 선택
  themeBtn: document.getElementById('theme-toggle'), // 테마 전환 버튼 선택
  hamburger: document.getElementById('hamburger-btn'), // 모바일 메뉴 버튼 선택
  nav: document.querySelector('.nav-menu'), // 네비게이션 메뉴 선택
  scrollTop: document.getElementById('scroll-top'), // 맨 위로 이동 버튼 선택
  projContainer: document.getElementById('projects-container'), // 프로젝트 출력 영역 선택
  filters: document.getElementById('project-filters'), // 프로젝트 필터 출력 영역 선택
  form: document.getElementById('contact-form') // 문의 폼 선택
};

// 앱 시작 시 한 번만 실행되는 초기화 함수입니다.
// 테마 적용, 이벤트 바인딩, 프로젝트 데이터 요청을 순서대로 처리합니다.
function init() {
  applyTheme(STATE.theme); // 저장된 테마를 화면에 적용
  bindEvents(); // 모든 버튼과 폼에 이벤트 연결
  fetchProjects(); // GitHub 프로젝트 목록 요청 시작
}

// 외부 API 값이나 사용자 입력값을 그대로 HTML에 넣지 않도록 문자열을 이스케이프합니다.
// XSS 위험을 낮추기 위한 기본적인 방어 장치입니다.
function escapeHtml(value) {
  return String(value) // 전달받은 값을 문자열로 변환
    .replaceAll('&', '&amp;') // 앰퍼샌드를 HTML 엔티티로 변환
    .replaceAll('<', '&lt;') // 여는 꺾쇠를 HTML 엔티티로 변환
    .replaceAll('>', '&gt;') // 닫는 꺾쇠를 HTML 엔티티로 변환
    .replaceAll('"', '&quot;') // 큰따옴표를 HTML 엔티티로 변환
    .replaceAll("'", '&#039;'); // 작은따옴표를 HTML 엔티티로 변환
}

// GitHub 저장소 URL이 안전한 형식인지 검사합니다.
// github.com HTTPS 주소만 허용하고, 그 외 값은 기본 주소로 되돌립니다.
function getSafeRepositoryUrl(value) {
  try {
    const url = new URL(value); // 전달된 주소를 URL 객체로 분석
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : 'https://github.com'; // GitHub HTTPS 주소만 허용
  } catch {
    return 'https://github.com'; // 잘못된 주소는 안전한 기본 주소로 대체
  }
}

// ==========================================
// 4. 이벤트 -> 상태 변경 -> 렌더링 패턴
// ==========================================

// 현재 테마를 문서 루트에 반영합니다.
// CSS 변수 기반 테마가 이 속성을 보고 색상을 바꿉니다.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme); // html 요소에 현재 테마 속성 설정
  const icon = els.themeBtn.querySelector('i'); // 테마 버튼 안의 아이콘 선택
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; // 현재 테마에 맞춰 아이콘 변경
}

// GitHub API에서 공개 저장소 목록을 가져옵니다.
// 요청 상태를 업데이트하고, 결과에 따라 프로젝트 목록과 필터를 다시 렌더링합니다.
async function fetchProjects() {
  STATE.projects.status = 'loading'; // 프로젝트 상태를 로딩으로 변경
  STATE.projects.errorMsg = null; // 이전 오류 메시지 초기화
  els.filters.replaceChildren(); // 이전 필터 버튼 제거
  renderProjects(); // 로딩 UI 그리기

  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`); // GitHub 저장소 API 호출
    if (!res.ok) throw new Error(`API 통신 에러: ${res.status}`); // HTTP 응답이 실패하면 오류 메시지 출력 후 catch 구문으로 점프

    const data = await res.json(); // 응답 본문을 JSON 데이터로 변환
    STATE.projects.data = data; // 받아온 프로젝트 데이터를 상태에 저장
    STATE.projects.status = data.length === 0 ? 'empty' : 'success'; // 데이터 개수에 따라 성공 또는 빈 상태 지정

    renderFilters(); // 성공한 프로젝트의 필터 버튼 생성
  } catch (error) {
    STATE.projects.status = 'error'; // 요청 실패 상태 저장
    STATE.projects.errorMsg = error.message; // 사용자에게 보여줄 오류 메시지 저장
  }

  // 로딩 상태를 벗어나 최종 결과 UI를 렌더링합니다.
  renderProjects();
}

// 프로젝트 언어별 필터 버튼을 동적으로 만듭니다.
// 현재 선택된 필터는 active 클래스로 시각적으로 표시합니다.
function renderFilters() {
  if (STATE.projects.status !== 'success') return; // 성공 상태가 아니면 필터를 만들지 않음
  const langs = ['All', ...new Set(STATE.projects.data.map(p => p.language).filter(Boolean))]; // 중복 없는 언어 필터 목록 생성

  els.filters.innerHTML = langs.map(lang => // 각 언어를 필터 버튼 HTML로 변환
    `<button class="filter-btn ${STATE.projects.filter === lang ? 'active' : ''}" data-lang="${escapeHtml(lang)}">${escapeHtml(lang)}</button>` // 현재 필터에는 active 클래스 적용
  ).join(''); // 생성한 버튼 HTML을 하나의 문자열로 결합

  document.querySelectorAll('.filter-btn').forEach(btn => { // 생성된 모든 필터 버튼 순회
    btn.addEventListener('click', (e) => { // 필터 버튼 클릭 이벤트 연결
      STATE.projects.filter = e.currentTarget.dataset.lang; // 상태 업데이트
      renderFilters();  // 버튼 액티브 상태 재렌더링
      renderProjects(); // 프로젝트 리스트 재렌더링
    });
  });
}

// 프로젝트 섹션의 실제 내용을 렌더링합니다.
// 상태값에 따라 로딩, 오류, 빈 목록, 정상 목록을 각각 다르게 표시합니다.
function renderProjects() {
  const { data, status, errorMsg, filter } = STATE.projects; // 프로젝트 상태 정보를 구조 분해로 가져옴

  if (status === 'loading') {
    els.projContainer.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin fa-2x"></i><p>불러오는 중...</p></div>`; // 로딩 안내 UI 표시
    return; // 로딩 상태에서는 아래 렌더링 중단
  }
  if (status === 'error') {
    els.projContainer.innerHTML = `<div class="error-state"><p>에러 발생: ${escapeHtml(errorMsg)}</p><button class="btn btn-outline" data-action="retry-projects">재시도</button></div>`; // 오류 메시지와 재시도 버튼 표시
    return; // 오류 상태에서는 아래 렌더링 중단
  }
  if (status === 'empty') {
    els.filters.replaceChildren(); // 프로젝트가 없으면 필터 제거
    els.projContainer.innerHTML = `<div class="empty-state">표시할 프로젝트가 없습니다.</div>`; // 빈 목록 안내 UI 표시
    return; // 빈 상태에서는 아래 렌더링 중단
  }

  // 성공 상태 처리 (필터링 -> HTML 변환)
  const filteredData = filter === 'All' ? data : data.filter(p => p.language === filter); // 선택한 언어에 맞춰 프로젝트 필터링

  els.projContainer.innerHTML = filteredData.map(repo => { // 필터링된 프로젝트를 HTML 카드로 변환
    const { name, description, html_url, stargazers_count, language } = repo; // 저장소에서 화면에 필요한 값 추출
    const safeUrl = escapeHtml(getSafeRepositoryUrl(html_url)); // 안전한 GitHub 주소로 변환 후 HTML 이스케이프
    // 프로젝트 카드 HTML 반환
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
  }).join(''); // 모든 프로젝트 카드를 하나의 HTML 문자열로 결합
}

// ==========================================
// 5. 기타 UI 이벤트 바인딩
// ==========================================

  // 테마, 네비게이션, 스크롤, 폼 검증 같은 UI 이벤트를 한곳에 묶습니다.
  // 이렇게 하면 이벤트가 흩어지지 않아 유지보수가 쉬워집니다.
function bindEvents() {
  els.themeBtn.addEventListener('click', () => { // 테마 버튼 클릭 이벤트 연결
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark'; // 현재 테마를 반대 테마로 변경
    localStorage.setItem('theme', STATE.theme); // 선택한 테마를 브라우저에 저장
    applyTheme(STATE.theme); // 변경된 테마를 화면에 적용
  });

  // 햄버거 메뉴
  els.hamburger.addEventListener('click', () => els.nav.classList.toggle('active')); // 햄버거 클릭 시 메뉴 표시 상태 전환
  document.querySelectorAll('.nav-link').forEach(link => { // 모든 네비게이션 링크 순회
    link.addEventListener('click', () => els.nav.classList.remove('active')); // 링크 선택 후 모바일 메뉴 닫기
  });

  els.projContainer.addEventListener('click', (e) => { // 프로젝트 영역의 클릭 이벤트 감시
    if (e.target.closest('[data-action="retry-projects"]')) fetchProjects(); // 재시도 버튼이면 프로젝트 다시 요청
  });

  // 스크롤 이벤트
  window.addEventListener('scroll', () => { // 화면 스크롤 이벤트 연결
    els.header.classList.toggle('scrolled', window.scrollY > 60); // 60px 이상 스크롤하면 헤더 스타일 변경
    els.scrollTop.classList.toggle('visible', window.scrollY > 300); // 300px 이상 스크롤하면 맨 위 버튼 표시
  });
  els.scrollTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); // 클릭 시 페이지 최상단으로 부드럽게 이동

  // 스크롤 애니메이션
  const observer = new IntersectionObserver((entries, obs) => { // 화면에 들어온 요소를 감지하는 관찰자 생성
    entries.forEach(entry => { // 감지된 요소들을 순회
      if (entry.isIntersecting) { // 요소가 화면에 보이면 실행
        entry.target.classList.add('appear'); // 등장 애니메이션 클래스 추가
        obs.unobserve(entry.target); // 한 번 나타난 요소는 관찰 중단
      }
    });
  }, { threshold: 0.2 }); // 요소의 20%가 보일 때 감지
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el)); // fade-in 요소 관찰 시작

  // 폼 유효성 검사 (Submit 및 Input 이벤트)
  els.form.addEventListener('submit', validateForm); // 폼 제출 시 유효성 검사 실행
  els.form.querySelectorAll('input, textarea').forEach(input => { // 모든 입력 요소 순회
    input.addEventListener('input', () => input.parentElement.classList.remove('invalid')); // 입력을 다시 시작하면 오류 표시 제거
  });
}

  // 폼 검증 로직입니다.
  // 이름, 이메일, 메시지의 필수 여부를 확인한 뒤, 유효하면 성공 메시지를 잠깐 보여줍니다.
function validateForm(e) {
  e.preventDefault(); // 브라우저의 기본 폼 제출과 페이지 이동 방지
  let isValid = true; // 전체 입력이 유효한지 저장하는 변수
  const { name, email, message } = els.form.elements; // 폼의 이름, 이메일, 메시지 입력 요소 추출

  const checkValid = (field, condition) => { // 하나의 입력을 검사하는 공통 함수
    if (condition) { // 입력값이 조건에 맞지 않으면
      field.parentElement.classList.add('invalid'); // 입력 그룹에 오류 클래스 추가
      isValid = false; // 전체 폼을 유효하지 않은 상태로 변경
    } else {
      field.parentElement.classList.remove('invalid'); // 유효한 입력의 오류 클래스 제거
    }
  };

  checkValid(name, name.value.trim() === ''); // 이름이 비어 있는지 검사
  checkValid(email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)); // 이메일 형식이 올바른지 검사
  checkValid(message, message.value.trim() === ''); // 메시지가 비어 있는지 검사

  if (isValid) {
    const successMessage = document.getElementById('form-success'); // 성공 메시지 요소 선택
    successMessage.style.display = 'block'; // 성공 메시지 표시
    els.form.reset(); // 제출 후 입력값 초기화
    setTimeout(() => successMessage.style.display = 'none', 4000); // 4초 후 성공 메시지 숨김
  }
}

// 앱 실행
document.addEventListener('DOMContentLoaded', init); // HTML 로딩이 끝나면 앱 초기화
