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
            # 현재 버전 확인 (package.json과 README.md에 기록된 버전이 동일한지 확인)
            current_version=$(node -p "require('./$service_path/package.json').version")
            readme_version=$(grep -oP "Version: \K[0-9.]*" "$service_path/README.md")

            if [ "$current_version" != "$readme_version" ]; then
                echo -e "${RED}README.md와 package.json의 버전이 일치하지 않습니다.${NC}"
                exit 1
            fi
            
            echo -e "\n${YELLOW}$service 서비스의 버전 업데이트 (현재: $current_version)${NC}"
            echo "1: Major 버전 업데이트 (x+1.0.0)"
            echo "2: Minor 버전 업데이트 (x.y+1.0)"
            echo "3: Patch 버전 업데이트 (x.y.z+1)"
            echo "4: 업데이트 취소"
            read -p "선택(1~3): " version_choice
            
            # 버전 업데이트
            case $version_choice in
                1) new_version=$(npm version major --prefix $service_path);;
                2) new_version=$(npm version minor --prefix $service_path);;
                3) new_version=$(npm version patch --prefix $service_path);;
                4) echo -e "${RED}취소되었습니다.${NC}"; exit 1;;
                *) echo -e "${RED}잘못된 선택입니다.${NC}"; exit 1;;
            esac
            
            echo -e "${GREEN}$service 버전 업데이트: $current_version -> $new_version${NC}"
            
            # README.md 버전 업데이트
            sed -i "s/Version: .*$/Version: ${new_version#v}/" "$service_path/README.md"

            # package.json 버전 업데이트
            sed -i "s/\"version\": \".*\"/\"version\": \"${new_version#v}\"/" "$service_path/package.json"
        fi
    done
fi

# 환경 파일 암호화
# 암호화
# 파일 목록
files=(".env")

# 변경된 파일 목록 초기화
changed_files=()

# 임시 디렉토리 생성
tmp_dir=$(mktemp -d)

# 원본 파일에 대한 SHA-256 해시 값 읽기 및 저장
for file in "${files[@]}"; do
  sha256_file="$file.sha256"
  if [ -f "$sha256_file" ]; then
    cat "$sha256_file" > "$tmp_dir/$(basename $file).sha256"
  fi
done

# 새로운 SHA-256 해시 파일 생성
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sha256sum "$file" > "$file.sha256"
    echo "$file 파일의 SHA-256 해시 값을 생성했습니다."
  else
    echo "$file 파일이 존재하지 않습니다."
  fi
done

echo -e "\n파일 변경 사항을 확인합니다."

# 새로운 SHA-256 해시 값 읽기 및 비교
for file in "${files[@]}"; do
  sha256_file="$file.sha256"
  old_sha256_file="$tmp_dir/$(basename $file).sha256"
  if [ -f "$sha256_file" ]; then
    new_hash=$(cat "$sha256_file")
    if [ -f "$old_sha256_file" ]; then
      old_hash=$(cat "$old_sha256_file")
      if [ "$old_hash" != "$new_hash" ]; then
        echo "$file 파일이 변경되었습니다."
        changed_files+=("$file")
      else
        echo "$file 파일이 변경되지 않았습니다."
      fi
    else
      echo "$old_sha256_file 파일이 존재하지 않습니다. 변경 사항을 확인할 수 없습니다."
      changed_files+=("$file")
    fi
  else
    echo "$sha256_file 파일이 존재하지 않습니다."
  fi
done

# 변경된 파일이 있는 경우 암호화 진행
if [ ${#changed_files[@]} -ne 0 ]; then
  echo -e "\n변경된 파일이 있습니다. 암호화를 진행합니다."
  echo -e "\n암호를 입력해주세요 : "
  read -s password
  
  for file in "${changed_files[@]}"; do
    openssl aes-256-cbc -pbkdf2 -in "$file" -out "$file.enc" -k $password
    echo "$file 파일을 암호화했습니다."
  done
else
  echo -e "\n파일이 변경되지 않았습니다. 암호화를 진행하지 않습니다."
fi

# 임시 디렉토리 삭제
rm -rf "$tmp_dir"

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