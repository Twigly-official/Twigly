# Twigly 홈페이지

[공개 홈페이지](https://twigly-official.github.io/)

사무실 메이트를 소개하는 반응형 랜딩 페이지입니다. 실제 앱 UI를 기반으로 한 캐릭터·기능 미리보기, 사용 단계, 다운로드 안내, FAQ와 문의 양식을 제공합니다.

## 로컬 실행

빌드나 패키지 설치 없이 실행할 수 있습니다.

```sh
python3 -m http.server 8937 --bind 127.0.0.1 --directory dist
```

`http://127.0.0.1:8937/`에서 확인합니다.

## 파일

- `dist/index.html`, `dist/app.js`, `dist/landing.css`: 랜딩 페이지와 미리보기 효과
  - 상단은 넓은 화면에서 소개/데스크톱 미리보기를 나란히 배치하고, 작은 화면에서는 세로 배치합니다. 미리보기 아래쪽에는 실제 캐릭터 이미지 다섯 개를 추가로 표시합니다.
- `dist/contact.js`, `dist/contact.css`: 필수 답변 이메일·문의 내용, 전송 상태와 성공 알림
- `dist/footer.css`: 제공 안내·사업자 정보·정책 링크를 포함하는 공통 하단
- `dist/releases/`, `dist/releases.js`: 운영체제별 업데이트와 공지사항. 등록된 내용이 없으면 빈 상태를 표시합니다.
- `dist/policies.html`, `dist/styles.css`: 정책 검토용 초안
- `dist/assets/`: 캐릭터, 실제 기능 화면, 로고와 로컬 글꼴
- `tests/contact.test.cjs`: 문의 입력과 전송 상태 점검
- `tests/gacha-preview.test.cjs`: 자동 재생·화면 이탈·동작 줄이기 상태 점검

## 문의 양식 점검

```sh
node --test tests/contact.test.cjs
node --test tests/gacha-preview.test.cjs
node --check dist/contact.js
```

유효한 이메일과 문의 내용을 모두 입력하면 보내기 버튼이 활성화됩니다. 전송에 성공하면 창이 닫히고 감사 알림이 잠시 표시됩니다. 실패 시 두 입력을 유지합니다. 테스트는 가짜 전송 응답을 사용하며 실제 이메일을 보내지 않습니다.

문의는 별도로 운영하는 서버로 전송합니다. 수신 주소·이메일 발송 키·서버 자격 증명은 이 공개 저장소에 넣지 않습니다. 클라이언트에는 공개 API 주소만 포함합니다. 서버는 배포할 홈페이지의 정확한 Origin을 허용해야 합니다.

## 에셋

기능 화면과 캐릭터는 격리된 예시 데이터로 네이티브 뷰를 렌더링한 이미지입니다. 앱 계정이나 사용자 데이터를 촬영한 이미지가 아닙니다. `export-gacha-preview.py`는 실제 가챠 연출을 무음 동영상으로 내보냅니다. STEP 1은 버튼 없이 자동 재생하며 화면을 벗어나거나 탭이 숨겨지면 중지합니다. 동작 줄이기 설정에서는 정지 화면을 표시합니다.

`export-feature-previews.py`, `export-landing-assets.py`, `export-gacha-preview.py`는 별도로 보유한 앱 소스 경로를 입력받는 개발용 도구이며 홈페이지 실행에는 필요하지 않습니다.

Pretendard 글꼴의 라이선스는 `dist/assets/fonts/`에 포함합니다.

## 배포와 공개 정보

작업 브랜치에서 커밋하고 `main`을 대상으로 PR을 생성합니다. `main`에 반영하면 GitHub Actions가 `dist/`를 GitHub Pages로 배포합니다. 사용자 승인 없이 `main` push·병합·수동 배포를 실행하지 않습니다.

현재 다운로드 파일과 사업자 정보는 준비 중이며 정책은 초안입니다. 공개 배포 전에 실제 배포 파일·지원 환경·사업자 정보·정책을 확정해야 합니다. 소스·문서·테스트에 비밀정보나 실제 이메일 주소를 넣지 않으며, 테스트 주소는 예제 도메인을 사용합니다.
