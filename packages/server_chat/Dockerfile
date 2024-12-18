# Node 버전을 20.18.0으로 변경하고, pnpm 설치
# 현재 context: .
# packages/server_chat 폴더와 packages/shared 내부의 파일을 컨테이너 내부의 /app 폴더로 복사
FROM node:20.18.0

# pnpm 설치
RUN npm install -g pnpm

# Container 내부의 작업 디렉토리를 설정
WORKDIR /app

# 모노레포 루트의 package.json과 pnpm-workspace.yaml, .env 파일을 컨테이너 내부의 /app 폴더로 복사
COPY package.json pnpm-workspace.yaml .env ./

# 종속성 설치
RUN pnpm install

# server_user 폴더와 shared 폴더를 컨텍스트에서 복사
COPY packages/server_chat ./server_chat
COPY packages/shared ./shared

# server_user 폴더 내부 확인
RUN ls -al ./server_chat

# shared 폴더 내부 확인
RUN ls -al ./shared

# 서버에 필요한 패키지를 설치
RUN pnpm install --filter server_chat...

# 서버가 사용할 포트를 노출
EXPOSE 3000

# 서버 실행
CMD [ "node", "server_chat/server.js" ]