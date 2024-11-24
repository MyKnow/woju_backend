#packages/server_item/Dockerfile

# Node 버전을 20.18.0으로 변경하고, pnpm 설치
# 현재 context: .
# packages/server_item 폴더와 packages/shared 내부의 파일을 컨테이너 내부의 /app 폴더로 복사
FROM node:20.18.0

# pnpm 설치
RUN npm install -g pnpm

# Container 내부의 작업 디렉토리를 설정
WORKDIR /app

# 모노레포 루트의 모든 파일을 컨테이너 내부의 /app 폴더로 복사
COPY . .

# 종속성 설치
RUN pnpm install

# server_item 폴더와 shared 폴더를 컨텍스트에서 복사
COPY packages/server_item ./server_item
COPY packages/shared ./shared

# server_item 폴더 내부 확인
RUN ls -al ./server_item

# shared 폴더 내부 확인
RUN ls -al ./shared

# 서버에 필요한 패키지를 설치
RUN pnpm install --filter server_item...

# 서버가 사용할 포트를 노출
EXPOSE 3000

# 서버 실행
CMD [ "node", "server_item/server.js" ]