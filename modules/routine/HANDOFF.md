> 2026-09-10: 독립 사이트 **https://routine160.firebaseapp.com/** 배포와 기존 기록 이전 완료. Google 로그인 및 실제 웹 저장 확인. [INDEPENDENT-HOSTING.md](INDEPENDENT-HOSTING.md)를 먼저 읽으세요.

# 루틴160 개발 인수인계

## 대상

- 운영 사이트: https://routine160.firebaseapp.com/
- 보존한 원본: https://routine160-personal-yj.yjoooong.chatgpt.site/ (새 사이트와 자동 동기화하지 않음)
- 기존 프로젝트 연결: `.openai/hosting.json`에 보존되어 있습니다. 접근 토큰이 아닙니다.
- 이 저장소의 최초 소스는 기존 Sites 배포 version 10, source SHA `07b10741009bcf3823ecf419f37984586a7a7f0f`입니다. GitHub 초기 커밋 이력은 별도로 시작했습니다.
- 다른 앱인 Bullet Journal과 혼동하지 마세요. 잘못 요청된 오늘/Weekly 개편은 취소되었으며 이 앱에는 적용하지 않았습니다.

## 유지할 구현

- React19 / TypeScript / Vite / Firebase Auth+Firestore+Hosting. 기존 Vinext/Worker+D1 경로는 복구용. pnpm lockfile 유지.
- 밝은 회색 카드, 어두운 갈색 배경, 주황 테두리, 자체 호스팅 자연산스 폰트.
- 운동·식사 계획과 실제를 구분하며 계획을 실제 실적으로 집계하지 않습니다.
- 선택한 날짜별 계획을 수정합니다. 식사는 간식 계획 없이 아침·점심·저녁·영양제 순서로 요일 간 같은 행에 배치합니다.
- 수면은 깨어난 날짜 기준 전날20시~당일11시, 복수 구간과 수면의 질을 기록합니다.
- `lib/routine.ts`의 optional 필드를 통해 기존 기록과 백업의 호환성을 유지합니다.
- `app/api/state/route.ts`: 서버 인증, 계정별 D1 저장, revision 충돌409, 출처 검사. 실패 시 입력값 보존.
- 실제 기록·로그인 토큰·개인 JSON 백업·SQLite 파일을 Git에 넣지 마세요.
- 민감한 기록 기능은 명시적 opt-in이며 기본 백업에서 제외됩니다.
- 영양제는 제한적인 근거와 상호작용을 설명하는 후보 안내입니다. 개인 복용량 처방을 임의로 추가하지 마세요.

## 주요 파일

`app/dashboard.tsx`, `app/globals.css`, `app/exercise-form.tsx`, `app/plan-editor.tsx`, `app/sleep-grid.tsx`, `lib/routine.ts`, `lib/sleep.ts`, `app/api/state/route.ts`.

## 아직 구현하지 않은 제안

단 음료·디저트 등 줄이고 싶은 습관을 기록하는 박스는 아이디어만 논의되었습니다. 후속 요청이 있기 전에는 추가하지 마세요.

## 배포

현재 운영 버전은 `pnpm build:independent` 후 Firebase로 배포합니다. 자세한 명령은 INDEPENDENT-HOSTING.md를 따르세요. 기존 Sites 프로젝트와 데이터베이스는 보존하고 초기화하지 마세요. GitHub 소스 수정과 실제 배포는 별개입니다. 배포 변경 요청 없이 확인만 요청받았다면 배포하지 마세요.
