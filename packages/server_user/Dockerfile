# packages/server_user/Dockerfile
# Mono-repo의 packages/server_user 서비스를 위한 Dockerfile
# context: packages

# Node 버전을 20.18.0으로 변경하고, 서버가 사용하는 패키지를 복사.
FROM node:20.18.0

# Container 내부의 작업 디렉토리를 설정
WORKDIR /app

# server_user 서비스에 필요한 패키지 파일을 /server_user 폴더로 복사
COPY server_user/package*.json ./server_user/

# server_user 서비스에 필요한 소스 코드를 복사
COPY server_user/* ./server_user/

# packages/shared 폴더 내부의 Utils, Models, Services 폴더를 최상위에 복사
COPY shared/* ./shared/

# 서버에 필요한 패키지를 설치
RUN npm install --save

# 서버가 사용할 포트를 노출
EXPOSE 3000

# server_user/ 폴더 내부의 server.js 파일을 실행
CMD [ "node", "server_user/server.js" ]