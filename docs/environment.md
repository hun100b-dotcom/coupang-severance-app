# 환경 변수 설정

> 원본: CLAUDE.md 204-224줄 (21줄) — 데이터 무결성 100% 보장

---

## 프론트엔드 (`frontend/.env.local`)

```
VITE_SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=                 # 개발 시 비워두기 (Vite 프록시), 프로덕션에서 백엔드 URL
VITE_ADMIN_SECRET=Luck2058qorwhdgns3
VITE_ADMIN_EMAIL=             # 관리자 이메일
```

## 백엔드 (`backend/.env`)

```
SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 관리자 API용
ADMIN_SECRET=Luck2058qorwhdgns3
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...  # 선택사항
```

---

**참조**: [CLAUDE.md](../CLAUDE.md) | [개발 환경](./development.md) | [아키텍처](./architecture.md)
