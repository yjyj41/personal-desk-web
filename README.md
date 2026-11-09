# 나의 기록 · Personal Desk

Bullet Journal과 Routine160을 함께 사용하는 개인용 웹앱입니다. (Spending은 2026-10에 제거했습니다.) 2026-11-09부터 이 공개 저장소 `personal-desk-web` 하나가 소스와 사이트를 모두 맡습니다. 이전 비공개 소스 저장소 `personal-desk`는 더 이상 사용하지 않습니다. 기록은 저장소가 아니라 각 Firebase 프로젝트에 있습니다.

## 화면

- **오늘**: 저널의 빠른 기록·습관·하루 한 줄, 루틴 요약과 운동/식사/생활 바로가기.
- **저널**: 일간/주간/월간(달력: 하루 한 줄·이벤트·Google 일정·사진, 메모, 습관 트래커, Google Calendar 보기)/미래 계획, 일기·사진, 동선, Google Calendar 연결, 기존 백업.
- **루틴**: 기존 운동·식사 계획과 실제, 수면 시간표, 선택적인 개인 기록과 백업.
- **지출**: Monzo CSV, 중복 제거, 예산·카테고리·추세, 정기결제·저축 목표, 검증된 JSON 복원.

공통 날짜 선택은 저널의 날짜, 루틴의 주, 지출의 월에 전달됩니다. 모듈 내부에서 별도로 탐색하는 것은 가능합니다. 오늘로 돌아오면 공통 기준 날짜로 맞춥니다. 저장 중 메뉴를 전환해도 모듈을 제거하지 않아 입력을 유지합니다.

## 실행

Node 22.13 이상, pnpm:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm dev
```

http://localhost:4173 에서 확인합니다. 두 기존 Firebase 프로젝트에 이미 허용된 로그인 주소입니다. `dev`는 빌드된 `dist/`를 제공하므로 수정 후 다시 빌드하고 새로고침하세요.

```sh
pnpm test
pnpm typecheck
```

## 화면과 글꼴

점 격자 종이 위 두 페이지 펼침과 오른쪽 번호 탭(01 Today – 07 Settings, 2026-11 리디자인. Index와 Key는 Settings 안의 링크로 열리며 그동안 Settings 탭이 선택됩니다), 영문 UI, 큰 숫자 날짜 헤더(일간 `11.04`, 주간 `W45`, 월간 `11`)를 사용합니다. 헤더의 앞뒤 버튼은 보고 있는 페이지에 따라 하루·한 주·한 달씩 이동합니다. 숫자·라벨은 JetBrains Mono, 본문은 Inter/Noto Sans KR(Google Fonts), 강조색은 파랑(`#2B57D9`)입니다. 저널 스타일은 `modules/journal/grid.css`가 마지막에 덮어씁니다. Today는 하루 기록과 요약, Journal은 Daily / Weekly / Monthly / Future / Journal / Index / Key입니다. Tracker는 Monthly 안의 Habit tracker로 옮겼고 `#journal/habit` 링크는 Monthly로 연결됩니다. Journal 하위 메뉴와 원래 상단 탭을 함께 유지하며 선택 상태를 동기화합니다. 영문은 Aperçu/Optima가 설치되어 있으면 우선 사용하고, 없으면 자체 호스팅한 Hanken Grotesk/Belleza로 표시합니다. 한글 기록에는 Pretendard를 사용합니다. 상용 글꼴 파일은 배포하지 않으며 오픈 폰트 라이선스는 `assets/fonts/`에 포함됩니다.

## 데이터와 로그인

통합은 **공통 화면과 소스 저장소 통합**입니다. 기존 앱의 검증된 기능을 모듈로 유지하며 동일 출처 프레임에서 실행합니다. 저널과 루틴의 Firebase 프로젝트/저장 형식은 유지합니다. 단일 로그인이나 단일 데이터베이스로 변경하지 않았습니다.

- 저널: 기존 `bullet-journal-b359c` 프로젝트와 `journals/{uid}`, `journalPhotos`.
- 루틴: 기존 `routine160` 프로젝트와 `routine160/{uid}`. 공개 Firebase 웹 설정만 포함하며 서비스 계정 키는 없습니다.
- 지출(제거됨): 브라우저의 `personal_desk_spending_v1` 기록은 지우지 않습니다. 남아 있으면 Settings에 백업 다운로드 버튼이 나타납니다.
- 저널·루틴은 동일 Google 계정으로 로그인하면 기존 실제 데이터를 읽고 씁니다. 샘플/실제 데이터나 개인 JSON 백업을 저장소에 커밋하지 않습니다.
- 화면 사이 메시지는 출처와 보내는 프레임을 검증합니다. 원문 일기·거래·개인 변화 기록은 요약 메시지에 넣지 않습니다.

## 배포

[Personal desk 열기](https://yjyj41.github.io/personal-desk-web/) — GitHub Pages에서 접속합니다.

`main`에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 타입 검사·테스트·빌드를 한 뒤 `scripts/export-static.mjs`로 브라우저 파일만 골라 Pages에 게시합니다. 로컬에 Node가 없어도 됩니다. 검사가 실패하면 기존 사이트가 그대로 유지됩니다. 저장소 Settings → Pages → Source는 **GitHub Actions**여야 합니다. 개인 기록·백업 JSON은 커밋하지 마세요(`.gitignore`가 `*-backup*.json`을 제외합니다). 상대 경로를 사용하므로 `/personal-desk-web/` 아래에서 작동합니다.

### 한 번 로그인

저널이나 루틴 어느 쪽에서든 Google로 로그인하면, 그때 받은 Google 인증으로 다른 Firebase 프로젝트에도 함께 로그인합니다(`shared/journal-login.mjs`, `shared/routine-journal.mjs`). 루틴은 `routineShared` 앱 이름과 IndexedDB 유지 방식을 써서 탭을 닫아도 로그인이 유지됩니다. 예전에 따로 로그인해 둔 기기는 로그아웃 후 한 번 다시 로그인하거나 저널의 “Google 계정으로 함께 연결”을 한 번 누르세요. 보안 규칙과 데이터 위치는 바뀌지 않습니다.

Journal은 기존 `yjyj41.github.io` 로그인 허용 설정을 사용합니다. 2026-10-06에 Routine에도 `yjyj41.github.io`를 Firebase Authorized domains에 등록했습니다. 주소가 바뀌면 브라우저에만 저장되는 Spending 데이터는 이전 사이트에서 JSON으로 백업한 뒤 새 사이트에서 복원해야 합니다.

새 주소에서 로그인하려면 두 Firebase 프로젝트의 Authentication → Settings → Authorized domains에 해당 호스트가 허용되어 있어야 합니다. localhost와 127.0.0.1은 서로 다릅니다. 루틴은 프레임 안에서 redirect 대신 popup 로그인을 사용합니다. 브라우저가 차단하면 팝업을 허용하세요.

기존 모듈 안의 `.firebaserc`, `firebase.json`, 과거 Sites/D1 문서는 원본 참고 자료입니다. 해당 폴더에서 기존 운영 대상으로 배포하지 마세요. 새 호스팅은 새 대상으로 설정해야 합니다. 개인 거래·기록의 실제 기기 로그인/저장 검증은 소유자 확인이 필요합니다.

저널의 Firebase/지도 라이브러리는 기존 외부 CDN을 사용하므로 인터넷이 필요합니다. 루틴은 선택할 때 불러옵니다.

## 원본 기준

| 모듈 | 원본 | 커밋 |
|---|---|---|
| 저널 | [bullet-journal](https://github.com/yjyj41/bullet-journal) | `28a4711e1e2a7ac91e229670ecb8e748126d5ada` |
| 루틴 | [routine160](https://github.com/yjyj41/routine160) | `a07071dd563e8f0963dc77e281d60b3b75204e78` |
| 지출 | [spending-tracker](https://github.com/yjyj41/spending-tracker) | `08336123ea0c3a7e806445e40825ca40ca8e3d4d` |

원본 코드·문서와 저널 지도의 라이선스 안내를 보존했습니다. 새 Git 이력에서 시작하므로 기존 세 저장소의 커밋 이력은 원본에서 확인할 수 있습니다. `stock-high-low-tracker`는 확인 당시 빈 저장소이며 이번 통합에서 제외했습니다.

## Local sign-in

The original Firebase projects authorize `localhost`, not `127.0.0.1`. Empty loopback previews redirect to localhost; previews with a local spending ledger or journal drafts stay put and offer backup/switch guidance. Existing local records are never deleted or silently moved between origins. Both apps display actionable popup, network and unauthorized-domain errors. With owner approval, the deployed Personal desk hostname was added to both Firebase authorized-domain lists. Existing domains and data rules remain unchanged.

## Journal, tags and connected records

- Settings → 태그 관리 is the shared vocabulary for journal entries and calendars. Tags are created only here (or the same manager opened from Journal); normalized duplicate names are rejected. Rename, usage counts, merge and removal update every reference. Removing a tag never removes a record.
- The existing daily journal remains intact. Additional dated entries support multiple tags, title/body search, topic views, `[[title]]` or stable `[[entry-id]]` links and backlinks. The link picker inserts stable IDs so renaming a title does not break inserted links. Additional entries and tags are included in the existing JSON backup and journal PDF export.
- Calendar tag switches affect visibility only. With multiple tags, an event appears when at least one of its tags is enabled; untagged records have their own switch. Google calendar visibility and synchronization are independent.
- Google Calendar in plain terms: signing in to Journal also grants calendar access, so Monthly shows Google events right away (view only). A schedule block goes to Google only when “Google에도 저장” is on for it; a Google event becomes a block only via “시간표로 가져오기”. The access token lives in memory for about 50 minutes; after a reload or expiry, press “Connect Google Calendar” once. Settings → Google Calendar opens the calendar settings. The old embedded Google Calendar iframe was removed because Monthly already shows the same events.
- Google events are read-only until explicitly linked. New plans are never sent by default. Choose the destination calendar on each new connection. Disconnecting preserves both records and their identity so reconnecting does not duplicate an event. Remote deletion has a separate explicit control. Google events with attendees, all-day events, times before 06:00 or non-half-hour times remain read-only because the existing schedule grid cannot represent them safely.
- Routine exercises appear as live source-backed cards on their date in Today and Journal, including updates and removals. Other Routine records (including private records) are not displayed or copied into journal backups. Routine retains its own backup tools.
- Google sign-in from Journal authenticates both existing Firebase projects using the Google credential in memory. Existing signed-in users can use “Google 계정으로 함께 연결” once. Ownership is checked using the Google provider subject, not email or project-specific Firebase UID. No security rules or data collection paths change.


## Verification

Run `node --test --test-isolation=none tests/*.test.mjs` on Node 24. Tests cover legacy backups, tags and merges, note links, visibility, selective Calendar reconciliation, reconnect identity, and Routine account boundaries/source updates.

Browser smoke checks cover tag management, note creation, linked tags and backlinks, and the production app's signed-out startup. A real-account check of both Firebase projects and Google Calendar authorization/sync is still needed; automated tests use synthetic records and mocked Calendar transport, without modifying personal data.
