#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 현재 branch 확인
current_branch=$(git rev-parse --abbrev-ref HEAD)

# TODO: main 브랜치 보호
# main 브랜치 보호, 현재는 main 브랜치에서만 작업하므로 주석 처리
# if [[ $current_branch == "main" ]]; then
#     echo -e "${RED}현재 branch가 main입니다. 다른 Branch에서 시도해주세요.${NC}"
#     exit 1
# fi

# 변경된 서비스 감지
detect_changed_services() {
    git diff --cached --name-only | grep "^packages/server_" | cut -d/ -f2 | sort -u
}

# 커밋 타입 선택
echo -e "${YELLOW}커밋 메시지 타입을 선택해주세요:${NC}"
commit_types=(
    "feat: 새로운 기능 추가"
    "fix: 버그 수정"
    "docs: 문서 수정"
    "style: 코드 스타일 변경"
    "design: 사용자 UI 디자인 변경"
    "test: 테스트 코드 추가"
    "refactor: 코드 리팩토링"
    "build: 빌드 파일 수정"
    "ci: CI 설정 파일 수정"
    "perf: 성능 개선"
    "chore: 설정 변경"
    "rename: 파일/폴더명 수정"
    "remove: 파일 삭제"
)

for i in "${!commit_types[@]}"; do
    echo "$((i+1))) ${commit_types[$i]}"
done

read -p "번호를 입력하세요: " type_number

# 커밋 타입 설정
commit_type=$(echo "${commit_types[$((type_number-1))]}" | cut -d: -f1)
if [ -z "$commit_type" ]; then
    echo -e "${RED}잘못된 번호입니다.${NC}"
    exit 1
fi

# 커밋 메시지 입력
read -p "커밋 메시지를 입력해주세요: " commit_message

# 버전 업데이트 (release 브랜치에서만)
# release 브랜치에서만 버전 업데이트하도록 설정
# 현재는 main 브랜치에서만 작업하므로 주석 처리
# if [[ $current_branch == "release" ]]; then
if [[ $current_branch == "main" ]]; then
    # 변경된 서비스 확인
    changed_services=$(detect_changed_services)
    
    for service in $changed_services; do
        service_path="packages/$service"
        if [ -f "$service_path/package.json" ]; then
            current_version=$(node -p "require('./$service_path/package.json').version")
            
            echo -e "\n${YELLOW}$service 서비스의 버전 업데이트 (현재: $current_version)${NC}"
            echo "1: Major 버전 업데이트 (x+1.0.0)"
            echo "2: Minor 버전 업데이트 (x.y+1.0)"
            echo "3: Patch 버전 업데이트 (x.y.z+1)"
            read -p "선택(1~3): " version_choice
            
            # 버전 업데이트
            case $version_choice in
                1) new_version=$(npm version major --prefix $service_path);;
                2) new_version=$(npm version minor --prefix $service_path);;
                3) new_version=$(npm version patch --prefix $service_path);;
                *) echo -e "${RED}잘못된 선택입니다.${NC}"; exit 1;;
            esac
            
            echo -e "${GREEN}$service 버전 업데이트: $current_version -> $new_version${NC}"
            
            # README.md 버전 업데이트
            sed -i "s/Version: .*$/Version: ${new_version#v}/" "$service_path/README.md"
        fi
    done
fi

# 환경 파일 암호화
if [ -f ".env" ]; then
    echo -e "\n${YELLOW}환경 파일 암호화를 진행합니다.${NC}"
    read -s -p "암호를 입력하세요: " password
    echo
    
    openssl aes-256-cbc -pbkdf2 -in .env -out .env.enc -k "$password"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}환경 파일 암호화 완료${NC}"
    else
        echo -e "${RED}환경 파일 암호화 실패${NC}"
        exit 1
    fi
fi

# 최종 확인
echo -e "\n${YELLOW}커밋 메시지 -> $commit_type: $commit_message${NC}"
read -p "이대로 진행하시겠습니까? (y/n): " confirm

if [[ $confirm != "y" ]]; then
    echo "종료합니다."
    exit 1
fi

# 변경사항 커밋 및 푸시
git add .
git commit -m "$commit_type: $commit_message"
git push origin $current_branch

# release 브랜치 처리
# release 브랜치에서만 작업하도록 설정
# 현재는 main 브랜치에서만 작업하므로 주석 처리
# if [[ $current_branch == "release" ]]; then
if [[ $current_branch == "main" ]]; then
    for service in $changed_services; do
        service_version=$(node -p "require('./packages/$service/package.json').version")
        tag="$service-v$service_version"
        
        # 태그 생성
        git tag -a "$tag" -m "$service v$service_version 릴리즈"
        git push origin "$tag"
    done
    
    # main 브랜치로 머지
    # main 브랜치로 머지 후 push
    # 현재는 main 브랜치에서만 작업하므로 주석 처리
    # git checkout main
    # git pull origin main
    # git merge release -m "Merge branch 'release' into main"
    # git push origin main
    
    # GitHub Actions 트리거를 위한 태그 푸시
    for service in $changed_services; do
        echo "배포 트리거: $service"
    done
    
    git checkout $current_branch
fi

echo -e "${GREEN}모든 작업이 완료되었습니다.${NC}"