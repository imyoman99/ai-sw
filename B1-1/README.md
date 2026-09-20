# 📊 Data Engineer Portfolio - Web Dashboard Foundation

> **금융 데이터 분석 및 파이프라인 구축 역량을 웹 서비스로 확장하기 위한 포트폴리오 웹사이트입니다.**
> 데이터 수집, 정제, 시각화로 이어지는 데이터 파이프라인의 최종 단계인 '사용자 인터랙션 및 프론트엔드 렌더링'의 핵심 원리를 이해하고자, 외부 라이브러리 없이 순수 바닐라 웹 기술(HTML/CSS/JS)만을 활용하여 구축했습니다.

## 🔗 배포 및 확인
- **배포 URL:** [https://imyoman99.github.io/my-portfolio/](https://imyoman99.github.io/my-portfolio/) *(본인의 실제 배포 링크로 수정하세요)*
- **GitHub 저장소:** [https://github.com/imyoman99/my-portfolio](https://github.com/imyoman99/my-portfolio) *(실제 저장소 링크로 수정하세요)*

---

## 🛠 사용 기술 (Tech Stack)
- **Markup:** HTML5 (Semantic Structure)
- **Style:** CSS3 (Flexbox & Grid, CSS Variables, Mobile-First Responsive Design)
- **Logic:** JavaScript (ES6+, Vanilla JS, Async/Await, DOM API)
- **Data Fetching:** GitHub REST API

---

## 📸 스크린샷 (Screenshots)
*(아래 텍스트를 지우고 실제 캡처한 이미지 파일 경로를 넣어주세요)*

|                     데스크톱 화면 (Light)                     |                     데스크톱 화면 (Dark)                     |               모바일 화면 & 햄버거 메뉴                |
| :-----------------------------------------------------------: | :----------------------------------------------------------: | :----------------------------------------------------: |
| `<img src="images/screenshot-desktop-light.png" width="300">` | `<img src="images/screenshot-desktop-dark.png" width="300">` | `<img src="images/screenshot-mobile.png" width="150">` |

---

## ✨ 주요 기능 및 UI/UX 인터랙션

1. **GitHub API 동적 연동 및 상태 처리**
   - Fetch API를 이용해 실시간 프로젝트 목록을 동적으로 렌더링합니다.
   - 외부 데이터 수집 시 발생할 수 있는 4가지 상태(로딩 중 / 성공 / 실패(에러) / 빈 데이터)를 분기하여 사용자 친화적인 UI로 피드백을 제공합니다.
2. **다크 모드 (Dark Mode)**
   - 테마 토글 버튼을 통해 라이트/다크 모드가 전환됩니다.
   - `localStorage`를 활용하여 사용자의 테마 설정이 새로고침 후에도 영구적으로 유지됩니다.
3. **반응형 웹 디자인 (Responsive Design)**
   - 모바일, 태블릿(768px), 데스크톱(1024px) 해상도에 맞춰 레이아웃이 최적화됩니다.
   - 모바일 환경에서는 내비게이션이 숨겨지고 햄버거 메뉴(Hamburger Menu)가 활성화됩니다.
4. **폼 유효성 검사 (Form Validation)**
   - Contact 섹션에서 빈 필드 제출을 방지하고 이메일 정규식 패턴을 검증합니다.
   - 유효하지 않은 입력 시 즉각적인 에러 메시지(Immediate Feedback)를 노출합니다.
5. **스크롤 인터랙션 (Scroll Interactions)**
   - 내비게이션 앵커 링크 클릭 시 부드러운 스크롤(Smooth Scroll)로 이동합니다.
   - Intersection Observer를 활용한 요소 등장 애니메이션(Fade-in)을 구현했습니다.

---

## 📐 아키텍처 및 기술적 의사결정 (Technical Decisions)

본 프로젝트는 단순한 화면 구현을 넘어, 데이터 엔지니어 관점에서 확장성과 유지보수성을 고려한 **'이벤트 → 상태 업데이트 → 렌더링'** 패턴을 설계하는 데 집중했습니다.

### 1. 단일 진실 공급원(SSOT) 기반의 상태 관리
흩어져 있는 전역 변수를 지양하고, `STATE`라는 단일 객체를 생성하여 테마 설정, API 원본 데이터, 필터링 상태, 에러 메시지 등을 중앙 집중적으로 관리했습니다. 
- **흐름:** 사용자의 클릭(Event) 발생 ➔ `STATE` 객체의 데이터 갱신(State Update) ➔ 갱신된 데이터를 바탕으로 화면 재조립(Render). 
- 이는 데이터를 가공하여 파생 뷰(View)를 만들어내는 데이터 파이프라인의 원리와 같으며, 향후 React 등 상태 기반 프레임워크 도입을 위한 탄탄한 기초 설계입니다.

### 2. 비동기 데이터 처리와 예외 통제 (`async/await`, `try/catch`)
비동기 외부 API 통신 시 발생할 수 있는 네트워크 지연 및 Rate Limit(403) 제한을 완벽하게 통제했습니다.
- `async/await`를 통해 비동기 흐름을 동기적으로 직관화했습니다.
- `try/catch` 블록 내에서 `!res.ok`를 통해 API 통신 실패를 명시적 에러로 `throw`하고, 이를 `catch`에서 잡아내어 사용자가 당황하지 않도록 "에러 발생 및 재시도 버튼" 뷰를 렌더링하도록 분기했습니다.

### 3. 데이터 전처리를 위한 배열 메서드 (`map`, `filter`)
- API로 수신한 JSON 배열 데이터에서 `filter()`를 이용해 특정 언어(Language) 조건에 맞는 데이터 서브셋(Subset)을 추출했습니다.
- 이후 `map()` 메서드를 활용해 각 데이터 객체를 HTML 템플릿 리터럴로 치환하여 DOM에 주입했습니다. 이는 Raw Data를 대시보드 시각화 포맷으로 변환(Transformation)하는 과정과 완벽히 일치합니다.

### 4. 시맨틱 마크업과 관심사의 분리
- `<header>`, `<main>`, `<section>`, `<footer>` 등 시맨틱 태그를 활용해 문서 구조를 명확히 했습니다. 이는 웹 접근성(A11y)과 SEO를 높일 뿐만 아니라, 훗날 웹 크롤링 등 데이터 수집 시 노이즈를 최소화하는 정형화된 메타데이터 역할을 합니다.
- HTML 인라인 이벤트(`onclick`)를 철저히 배제하고 JS에서 `addEventListener`로 동작을 바인딩하여 데이터 추적(Tracking Code) 및 로직의 독립성을 확보했습니다.

### 5. Layout & Styling: Flexbox vs Grid, CSS Variables
- **Flexbox & Grid:** 1차원 선형 배치가 필요한 내비게이션에는 Flexbox를, 2차원 교차 배치가 필요한 Projects 카드 목록에는 Grid(`auto-fit`, `minmax`)를 사용하여 디바이스 크기에 자동으로 적응하는 유연한 데이터 대시보드 UI를 구축했습니다.
- **CSS Variables & Mobile-First:** 색상 및 레이아웃 규격을 `:root` 변수로 통일하여 유지보수성을 극대화했습니다. 또한, 핵심 데이터(콘텐츠)가 가장 잘 보여야 하는 모바일을 기준으로 기본 스타일을 작성(Mobile-First)하고, 미디어 쿼리로 데스크톱 레이아웃을 덧붙이는(Scale-up) 방식으로 브라우저 렌더링 리소스를 최적화했습니다.

---

## ⚙️ 주요 애니메이션 임계값 설정 (Thresholds)
프로젝트 내 구현된 주요 인터랙션의 임계값 기준은 다음과 같습니다.
- **스크롤 탑 버튼 표시 기준:** `window.scrollY > 300px`
- **내비게이션 배경색 변경(Scrolled) 기준:** `window.scrollY > 60px`
- **Intersection Observer 등장 애니메이션:** `threshold: 0.2` (요소가 화면에 20% 노출될 때 실행)

---

## 💡 회고 및 향후 계획
금융 데이터의 수집과 모델링에 집중하던 관점에서 벗어나, 분석된 데이터가 클라이언트 단(Front-end)에서 어떻게 상태로 관리되고 화면에 매핑되는지 그 본질을 깊이 이해할 수 있었습니다.
이 포트폴리오를 기반으로, 향후 Python으로 분석한 금융 데이터를 DB에 적재하고, 이를 API로 끌어와 실시간 렌더링하는 **풀스택 데이터 대시보드 웹 서비스**로 확장해 나갈 계획입니다.