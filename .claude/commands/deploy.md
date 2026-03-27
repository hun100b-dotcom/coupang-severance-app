배포 전 체크리스트를 확인하고 배포를 진행해줘:

## ✅ 배포 전 체크리스트

1. **테스트 실행**
   - [ ] 백엔드 유효성 검증: `python tests\validate_severance_logic.py`
   - [ ] 프론트엔드 E2E 테스트: `npx playwright test`

2. **환경변수 확인**
   - [ ] Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
   - [ ] Render: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

3. **마이그레이션**
   - [ ] Supabase SQL Editor에서 미실행 마이그레이션 확인

4. **커밋 & 푸시**
   ```bash
   git add .
   git commit -m "커밋 메시지"
   git push origin main
   ```

5. **배포 확인**
   - [ ] Vercel 배포 상태 확인 (Vercel MCP 사용)
   - [ ] Render 배포 로그 확인

배포 완료 후 Notion "📋 CATCH 개발 태스크"에 배포 완료 기록.
