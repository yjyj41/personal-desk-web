# ChatGPT 구독과 독립된 루틴160

## 구성

- Firebase 프로젝트: `routine160` (사용자 소유, Spark)
- Firebase Hosting: 화면과 폰트 제공 (`dist-independent/`)
- Firebase Authentication: Google 로그인
- Firestore: `routine160/{Google 로그인 uid}` 문서에 기록 저장
- `firestore.rules`: 검증된 소유자 이메일과 로그인 uid가 모두 일치해야 읽기/쓰기 가능. 목록 조회 및 직접 문서 삭제 금지.
- ChatGPT API, Sites 로그인, Sites D1을 독립 버전에서 사용하지 않음.
- 브라우저에는 로그인 세션만 저장. 기록의 영구 로컬 캐시는 사용하지 않으며 서버 저장 성공 후에만 저장 완료 표시.
- 계획/수면/운동/식사/개인 기록/설정을 기존 데이터 버전 2 그대로 보존.
- 동시 편집은 revision을 비교하는 Firestore transaction으로 충돌 감지. 열린 입력창은 자동 갱신으로 덮어쓰지 않음.

## 운영 상태 (2026-09-10)

- 배포 완료: https://routine160.firebaseapp.com/
- https://routine160.web.app/ 에서도 위 주소로 이동한다. Firebase 로그인 도메인과 사이트 도메인을 맞춰 모바일/브라우저 저장소 제한에서도 redirect 로그인을 지원한다.
- Google 로그인 활성화, 사용자 실제 로그인 및 가림 모드 설정을 통한 웹 저장 성공 확인. 가림 모드는 기존 기본값(true)으로 복원했다. 가짜 운동/수면 기록은 만들지 않았다.
- 기본 Firestore Standard 데이터베이스: europe-west2, 삭제 보호 활성화, 별도 유료 복구 옵션 없음.
- rules/indexes/hosting 배포 성공. Spark 무료 요금제 유지, 결제 계정 연결 및 유료 업그레이드 안 함.
- **기존 기록 이전 완료**: 소유자 로그인 후 원본 revision 26의 전체 데이터를 백업 복원 기능으로 이전했다. 운동 3건, 생활/수면 3일치, 수정한 운동 계획과 설정을 포함한다. 원본과 Firestore 서버에서 다시 읽은 전체 데이터의 정규화 SHA-256이 일치하며 새 저장소 revision은 3이다. 새로고침 후 연결도 확인했다.
- 기존 사이트와 데이터는 수정/삭제하지 않았다. 앞으로 Firebase 사이트에서 기록한다. 두 사이트 사이의 자동 동기화는 없다. 이전용 임시 개인 백업은 검증 후 삭제하며 Git에 포함하지 않는다.

## 빌드와 배포

Node 22.13 이상과 pnpm 사용:

```sh
pnpm install --frozen-lockfile
pnpm build:independent
firebase login
firebase deploy --project routine160 --only firestore:rules,firestore:indexes,hosting
```

Firebase Hosting이 `/__/firebase/init.json`으로 공개 웹 설정을 제공한다. 서비스 계정 키를 클라이언트나 GitHub에 넣지 않는다.
`pnpm build`는 기존 Sites 빌드이므로 독립 배포에는 `build:independent`를 사용한다.
기존 `.openai/hosting.json`, Sites 서버 경로와 D1 설정은 이전 기간의 복구용으로 남겨 둔다. 독립 빌드에는 포함되지 않는다.

## 기록 이전

1. 기존 사이트에서 **설정 및 백업 → 백업 다운로드**. 개인 변화 기록도 옮기려면 포함 스위치를 직접 켠다.
2. 새 사이트에 본인 Google 계정으로 로그인한다.
3. **백업 및 데이터 관리 → 백업 복원**에서 파일을 고르고 건수를 검토한다.
4. 복원을 확인하면 기존 수면/운동/식사/계획/설정이 Firebase로 저장된다. 새 저장소가 비어 있어도 백업은 자동 복원하지 않는다.
5. 다른 기기에서 같은 Google 계정으로 로그인해 기록을 확인한다.

백업은 암호화되지 않은 파일이다. Git에 추가하지 않는다. 기존 사이트 기록은 복원으로 삭제되지 않는다.
독립 운영은 ChatGPT 구독과 무관하지만 Firebase 계정과 프로젝트를 유지해야 한다. Firebase 무료 한도나 요금은 Firebase 정책을 따른다.

## 검증

```sh
firebase emulators:exec --only firestore --project demo-routine160 "node --experimental-strip-types --test tests/firebase.test.mjs tests/routine.test.mjs tests/plans.test.mjs tests/sleep.test.mjs"
```

실제 기록 없이 로컬 에뮬레이터에서 45개 검사 통과: 타 계정/익명/미검증 이메일 접근 거부, 두 클라이언트 동기화, revision 충돌, 기존 백업 복원 및 운동/수면 집계.
