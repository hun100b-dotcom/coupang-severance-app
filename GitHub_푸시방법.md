# GitHub 푸시 방법

첫 커밋까지는 완료된 상태입니다. 아래만 진행하면 됩니다.

## 1. GitHub에서 저장소 만들기 (아직 없다면)

1. [github.com](https://github.com) 로그인
2. **New repository** 클릭
3. **Repository name** 예: `coupang-severance-app`
4. **Public** 선택 후 **Create repository** (README 추가 안 해도 됨)

## 2. 원격 추가 후 푸시

터미널에서 프로젝트 폴더로 이동한 뒤, **아래 URL을 본인 GitHub 사용자명/저장소명으로 바꿔서** 실행하세요.

```bash
cd /root/coupang_severance_app

# 원격 추가 (예: 사용자명 myname, 저장소명 coupang-severance-app)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 푸시
git push -u origin main
```

예시 (사용자명 `hong`, 저장소명 `coupang-severance-app`):

```bash
git remote add origin https://github.com/hong/coupang-severance-app.git
git push -u origin main
```

- **SSH**를 쓰려면: `https://github.com/...` 대신 `git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git` 사용
- 푸시 시 GitHub 로그인(또는 토큰/SSH 키)이 필요합니다.
