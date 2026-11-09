# Google Calendar 연동

## 처음 연결
1. 기존 Google 계정으로 불렛저널에 로그인합니다.
2. 상단 **Google Calendar 연동 → Google 연결 / 재인증**을 누릅니다.
3. 같은 Google 계정으로 캘린더 권한을 승인합니다. 다른 계정 선택 시 Firebase 재인증이 거절됩니다.
4. 연결할 캘린더를 선택합니다. 쓰기 권한이 있는 캘린더만 표시됩니다.
5. **지금 동기화**로 상태를 확인합니다.

Calendar API가 비활성 상태라면 프로젝트 소유자가 아래 페이지에서 활성화해야 합니다.
https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=bullet-journal-b359c

OAuth가 테스트 상태라면 Google Auth Platform의 Audience에서 본인 계정을 테스트 사용자로 등록해야 할 수 있습니다. 권한 동의가 차단될 경우 프로젝트의 Data Access에서 calendar.events 및 calendar.calendarlist.readonly 범위를 확인하세요. 조직 계정은 관리자의 제한이 적용될 수 있습니다. 경고를 임의로 우회하지 마세요.

기존 Firebase Google OAuth 클라이언트를 재사용하므로 클라이언트 비밀키를 추가할 필요가 없습니다. 앱의 호스팅 도메인은 Firebase Authentication의 승인된 도메인에 있어야 합니다.

## 기록별 표시 / 숨기기
- 시간표 블록을 눌러 **Google Calendar에 표시**를 선택합니다.
- 기존 기록은 전송하지 않습니다. 원하면 **새 계획은 기본적으로 Google에 표시**를 켜세요. 실제 기록은 기본적으로 비공개입니다.
- 표시된 블록에는 `G ·`가 붙습니다. 제목·시간·드래그 이동/크기 변경을 Google에 반영합니다.
- 표시 해제는 **Google의 원본 일정을 삭제**하고 불렛저널 기록만 남깁니다. 별도 확인을 받으며 연결이 필요합니다. Google에서 가져온 일정도 동일합니다.
- 연결된 블록 삭제는 먼저 표시 해제 후 저장해야 가능합니다. 앱 전체 초기화·백업 복원·일반 삭제를 Google의 대량 삭제로 해석하지 않습니다.
- Google에서 삭제한 일정은 불렛저널에만 남기고 표시를 끕니다. 삭제를 양쪽의 영구 삭제로 확장하지 않습니다.
- 할 일 목록, 메모, 사진, 일기, 습관, 지도는 Google Calendar로 전송하지 않습니다.

## 갱신 및 충돌
- 앱이 보이는 동안 약 60초마다, 기록 변경 후 약 2초 뒤 갱신합니다. 열린 편집창이 있으면 다음 갱신까지 미룹니다.
- 현재 오늘 탭의 달 또는 Weekly의 주를 불러옵니다. 이미 연결된 기록은 범위 밖에서도 개별 확인합니다. 날짜 이동 후 `지금 동기화`를 누르면 즉시 갱신됩니다.
- 양쪽에서 제목/시간을 바꾸었으면 덮어쓰지 않고 사용할 내용을 선택하게 합니다. Google 수정에는 ETag 조건을 붙입니다.
- 등록 재시도는 결정적인 이벤트 ID로 중복을 방지합니다. 표시 해제 뒤 재등록은 새 ID를 사용합니다.
- 토큰은 메모리에만 보관하고, 새로고침/재방문/인증 만료 후 다시 연결해야 합니다. 앱을 닫은 동안에는 Google과 동기화하지 않습니다. Firebase에는 선택·일정 연결 정보만 저장됩니다.
- 시간대는 최초 연결 기기의 IANA 시간대로 고정하여 여러 기기의 시차로 일정이 옮겨지지 않게 합니다.

## 현재 지원 범위
- 수정 가능한 캘린더 한 개를 선택합니다. 다른 캘린더로 전환해도 이전 연결 기록을 자동 이전하지 않습니다.
- 시간표는 기존 06:00–24:00, 30분 단위입니다. 이 범위의 일반 일정은 양방향 연동합니다. 반복 일정은 개별 회차 단위로 취급합니다.
- 종일, 자정을 가로지르는 일정(정확히 24시 종료는 지원), 초대 참석자가 있는 일정, 30분 단위가 아닌 일정, 특수 유형 이벤트는 Google 원본 목록에 별도로 표시합니다. 잘라내거나 반올림하지 않으며 앱에서 수정하지 않습니다.
- Google 전체 캘린더를 비공개로 바꾸거나 계정 접근 권한을 취소하는 기능은 아닙니다. `이 기기 연결 해제`는 현재 브라우저 토큰만 버립니다. Google 계정 설정에서 앱 권한을 철회할 수 있습니다.

## 검증
`node --test tests/*.test.mjs`

자동 테스트는 가짜 Calendar API/Firebase로 실행됩니다. 실제 계정의 권한 승인과 실서비스 API 활성화 확인은 별도입니다.

공식 문서:
- https://firebase.google.com/docs/auth/web/google-signin
- https://developers.google.com/workspace/calendar/api/auth
- https://developers.google.com/workspace/calendar/api/v3/reference/events/patch
- https://developers.google.com/workspace/calendar/api/v3/reference/events/list
