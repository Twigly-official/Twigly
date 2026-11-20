# Twigly 홈페이지

실제 앱의 26종 캐릭터, 10가지 기능과 동작을 바탕으로 만든 반응형 정적 홈페이지입니다.

## 로컬 실행

이 디렉터리에서 `python3 -m http.server 8923 --bind 127.0.0.1 --directory dist`를 실행하고 `http://127.0.0.1:8923`를 엽니다. 빌드 과정과 설치할 npm 의존성이 없습니다.

- `dist/index.html`: 서비스 소개, 기능, 캐릭터 필터, 사용 방법, 활용 예, FAQ, 다운로드 안내
- `dist/styles.css`: 데스크톱·모바일 레이아웃, 동작 최소화 설정 지원
- `dist/app.js`: 웹 체험, 캐릭터 필터, 활용 탭, 다운로드·문의 안내
- `dist/policies.html`: 이용약관·개인정보처리방침 검토용 초안, 환불 정책 준비 안내
- `prepare-assets.swift`: 앱 캐릭터 이미지의 투명 여백을 정리하고 웹 크기로 내보내는 스크립트

## 공개 출시 전에 확정할 내용

현재 실제 결제가 미연결이고 공증한 공개 배포 파일이 없으므로, 다운로드는 준비 안내로 동작합니다. 정책 페이지는 확정 정책으로 오인하지 않도록 초안임을 표시했습니다. 공식 정보가 확정되면 다음을 반영해야 합니다.

1. `dist/app.js`의 다운로드 안내를 실제 배포 파일 링크로 연결하고 `index.html` 지원 환경·배포 상태를 갱신합니다.
2. 운영자 정보, 고객지원 연락처, 최종 가격·무료 제공 범위를 기재합니다.
3. 개인정보 보유 기간, 처리업체·국외 이전·권리 행사·담당자 정보를 확인하고 정책 시행일을 확정합니다.
4. 결제사와 실제 환불 조건·절차를 확정하고 정책을 검토합니다.
5. 정책 페이지의 초안 표시 및 `noindex` 설정은 정책 확정 후 변경합니다.

웹 체험의 타이머·체크리스트·메모는 브라우저 메모리에서만 작동하고 앱 데이터에 접근하거나 내용을 전송하지 않습니다. 홈페이지에는 분석 코드나 광고 추적을 추가하지 않았습니다. 한글은 로컬에서 제공하는 Pretendard Variable 1.3.9를 사용합니다. 로고는 앱과 같은 SF Rounded Bold와 leaf.fill을 네이티브로 렌더링한 이미지입니다. 글꼴 사용 허가문은 dist/assets/fonts에 포함합니다.

`.openai/hosting.json`은 연결된 Sites 프로젝트와 정적 배포 디렉터리를 보존합니다. 계정 설정, 키, 앱 실행 파일 또는 서버 소스는 배포 패키지에 포함하지 않습니다.

## 앱과 동일한 브랜드 리소스

- `Theme.swift`: 흰색, 기본 초록 `rgb(10% 46% 29%)` (8비트 반올림 `#1a754a`), 잉크 `#1a2921`, soft `#e8f5ed`, canvas `#f0f7f2`, line `#e3ede6`, muted `#6e7d75`를 사용합니다.
- `twigly-logo.png`: `MainView.sidebar`의 `HStack(spacing:10)`, `leaf.fill` 24pt, `Text("Twigly")` 26pt bold rounded, tracking -0.7을 그대로 렌더링합니다.
- `edge-left/right-*.png`: `CharacterArtwork.swift`와 `PeekEdgeCharacter.swift`의 크기·회전·손 기준 크롭·좌우 반전을 그대로 렌더링합니다.
- `photo-*.png`: `CharacterCatalogView.swift`의 `CharacterPortraitPhoto`를 84×112pt로 직접 렌더링합니다. 기본 자세는 캐릭터 소개에만 사용합니다.
- 프리텐다드는 [공식 배포 저장소](https://github.com/orioncactus/pretendard)의 v1.3.9 웹폰트입니다. 외부 글꼴 서버를 호출하지 않습니다.

`export-brand-assets.py`를 Website에서 실행하면 현재 앱 코드를 읽어 이미지들을 재생성합니다. 이미지 내보내기는 캐릭터·기능 연결·사용자 저장 기록에 접근하지 않습니다.
