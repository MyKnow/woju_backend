# 🛠 Woju Back-End MVP

## 📌 프로젝트 개요

**Woju 백엔드**는 사용자 인증/관리, 물품 등록·검색·매칭 기능을 제공하는 **Node.js 기반 모노레포 서버**입니다.  
**유저/물품 서버를 분리**하여 도메인별 책임을 분산하고, 공통 모델·유틸은 `packages/shared` 디렉토리에 위치해 **모듈화와 재사용성을 극대화**했습니다.

예를 들어, 사용자가 자신의 물품을 기반으로 교환 매칭을 요청할 경우, 이 로직은 **`server_item` 서버의 API**에서 처리되며, 물품/위치 모델은 공통(shared) 영역에서 불러와 사용됩니다.

Front-End: [Link](https://github.com/MyKnow/woju)

---

## 🚀 주요 기능

### 🧑 사용자/물품 서버 분리 구조  
- **`server_user`**: 회원가입, 로그인, 프로필 관리 등 사용자 관련 API 처리  
- **`server_item`**: 물품 등록·수정·삭제, 검색, 매칭 관련 API 처리  
- 두 서버는 공통 모델/유틸 코드를 **`packages/shared`**에서 가져와 사용함

### 📍 위치 기반 물품 검색 
- 위치 정보는 `locationSchema`로 모델링 → 위도/경도 기반 근거리 탐색  
- 위치 관련 스키마: `packages/shared/models/locationModel.js`

### 🔐 인증 처리 (Firebase + JWT)  
- Firebase Authentication 기반 ID 토큰 발급  
- 백엔드에서 해당 토큰을 검증하고 자체 JWT 발급  
- 관리자 권한은 환경변수 기반 `ADMIN_ID` 체크 방식으로 처리

### 💾 MongoDB + Mongoose ODM  
- 모든 데이터는 MongoDB에 저장  
- 각 모델은 Mongoose로 정의 (`userModel.js`, `itemModel.js`, `chatModel.js` 등)  
- 스키마 및 연결 유틸은 `packages/shared`에 위치

### 📦 모노레포 + 패키지 관리  
- `pnpm` 워크스페이스 기반 모노레포 구조  
- 루트에 `pnpm-workspace.yaml`, `package.json` 존재  
- 빌드 시 **전체 모노레포 디렉토리 복사 후 `pnpm install`**로 종속성 설치

---

## 🏗 시스템 구조
```
woju_backend/
├── server_user/             # 사용자 서버 (회원가입/로그인 등)
│   └── routes/
│   └── controllers/
├── server_item/             # 물품 서버 (등록/검색/매칭 등)
│   └── routes/
│   └── controllers/
├── packages/
│   └── shared/
│       ├── models/          # 공통 모델 (User, Item, Location, Chat 등)
│       └── utils/           # DB 연결, 에러 처리 등
├── docker-compose.yml       # 컨테이너 실행 설정
├── nginx/                   # Nginx 프록시 설정
└── .env                     # 환경변수
```

- **server_user**  
  Express 기반 사용자 API 서버  
  사용자 정보는 `shared/models/userModel.js` 사용

- **server_item**  
  Express 기반 물품 및 매칭 API 서버  
  물품/위치/채팅 정보는 각각 `itemModel.js`, `locationModel.js`, `chatModel.js`에 정의  
  채팅방은 매칭 요청 시 자동 생성됨

- **shared**  
  두 서버에서 공통 사용되는 모델 및 유틸 함수 정의  
  DB 연결(`db.js`), 에러 핸들링, 미들웨어 등도 포함

- **Docker & Nginx**  
  각 서버는 컨테이너화되어 있고 `docker-compose`로 통합 실행  
  `nginx.conf`에서 요청 라우팅 설정  
  예: `/api/user/* → server_user`, `/api/item/* → server_item`

---

## 🧩 기술 스택

| 분류 | 기술 |
|------|------|
| 🖥 언어 | Node.js (JavaScript / TypeScript) |
| 🌐 프레임워크 | Express.js |
| 🗂 데이터베이스 | MongoDB + Mongoose (ODM) |
| 🔐 인증 | Firebase Auth (ID Token), JWT |
| 📦 패키지 관리 | pnpm (Monorepo Workspace) |
| 📦 컨테이너 | Docker + docker-compose |
| 🛡 리버스 프록시 | Nginx |
| 🧪 테스트 | Jest, Supertest |
| 🧾 기타 | dotenv, uuid 등 |

---

## 🔧 기술적 과제 및 해결

### ✅ Firebase 인증 + JWT 발급  
- 클라이언트 → Firebase ID Token 발급  
- 서버 → 토큰 검증 후 자체 JWT 발급  
- 관리자 권한은 환경변수 `ADMIN_ID`로 분기 처리

### ✅ 위치 기반 검색 구현
- 물품 등록 시 위도/경도 포함  

### ✅ Docker + Monorepo 구조 빌드 문제 해결  
- `COPY package.json` 방식 사용 시 일부 의존성 누락  
- `COPY . .` 방식으로 전체 복사 후 `pnpm install` → 빌드 안정화

### ✅ 공통 코드 통합  
- `packages/shared`에 모델, DB 연결, 공통 미들웨어 모듈화  
- 서버별 중복 제거 → 유지보수성 향상  
- 예: `chatModel.js`, `itemModel.js`, `categoryModel.js` 등 통합 사용

---

## 📚 참고 문서

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [MongoDB Geo Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Docker & Compose 공식 문서](https://docs.docker.com/compose/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

## 📌 라이선스

본 프로젝트는 MIT 라이선스를 따릅니다.
