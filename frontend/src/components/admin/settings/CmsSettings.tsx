import { useState } from 'react'
import { UP, RADIUS, btnPrimary } from '../shared/adminTheme'
import { patchSetting } from '../../../lib/api'
import type { SystemSettings } from '../../../types/admin'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

// 설정 저장은 백엔드 PATCH /admin/settings(경로 B, service-role)로 통일한다.
// 과거에는 CMS만 supabase 직접 upsert(경로 A, RLS 의존)라, 토큰은 맞아도 RLS가
// 막으면 조용히 무반영되는 인증 경로 이원화 문제가 있었다. 다른 설정(법정변수 등)과
// 동일하게 백엔드 경로를 쓰면 RLS와 무관하게 저장되고 실패 시 HTTP 에러로 잡힌다.

export default function CmsSettings({ settings, onRefresh }: Props) {
  const [annoText, setAnnoText] = useState(settings['announcement_text'] ?? '')
  const [annoEnabled, setAnnoEnabled] = useState(settings['announcement_enabled'] === 'true')
  const [bannerText, setBannerText] = useState(settings['popup_banner_text'] ?? '')
  const [bannerEnabled, setBannerEnabled] = useState(settings['popup_banner_enabled'] === 'true')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const save = async () => {
    setSaving(true); setMsg(null)
    // 4개 키는 독립 HTTP 요청이라 일부만 실패할 수 있다. Promise.all 은 첫 실패에서
    // 전체를 reject 해 "이미 저장된 키"를 가린 채 '전체 실패'로 오표시 → 부분반영 무음.
    // allSettled 로 키별 성공/실패를 분리 집계해 정확히 보고한다.
    const entries: [string, string][] = [
      ['announcement_text',    annoText],
      ['announcement_enabled', String(annoEnabled)],
      ['popup_banner_text',    bannerText],
      ['popup_banner_enabled', String(bannerEnabled)],
    ]
    const results = await Promise.allSettled(entries.map(([k, v]) => patchSetting(k, v)))
    const failedKeys = entries.filter((_, i) => results[i].status === 'rejected').map(([k]) => k)
    setSaving(false)
    // 성공한 키도 있으니 항상 재조회로 화면-DB 동기화
    onRefresh()
    if (failedKeys.length === 0) {
      setMsg({ text: '✅ 저장 완료. 홈 화면에 즉시 반영됩니다.', ok: true })
    } else {
      setMsg({
        text: `❌ 일부 저장 실패: ${failedKeys.join(', ')} (${entries.length - failedKeys.length}/${entries.length} 저장됨). 다시 저장해주세요.`,
        ok: false,
      })
    }
  }

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div onClick={onToggle} style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? UP.brand : UP.caption,
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 17 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )

  return (
    <div style={cardStyle}>
      <p style={titleStyle}>공지/배너 CMS</p>
      <p className="text-a11" style={{ color: UP.sub, marginBottom: 16, marginTop: -8 }}>
        저장 즉시 홈 화면에 반영 (백엔드 경유 저장)
      </p>

      {/* 긴급 공지 배너 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>긴급 공지 배너 (홈 상단 노란 띠)</span>
          <Toggle on={annoEnabled} onToggle={() => setAnnoEnabled(e => !e)} />
          <span className="text-a11" style={{ color: annoEnabled ? UP.brand : UP.caption }}>
            {annoEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <textarea
          value={annoText}
          onChange={e => setAnnoText(e.target.value)}
          placeholder="긴급 공지 내용 (비워두면 표시 안 됨)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* 팝업 배너 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>팝업 배너 (진입 시 모달 팝업)</span>
          <Toggle on={bannerEnabled} onToggle={() => setBannerEnabled(e => !e)} />
          <span className="text-a11" style={{ color: bannerEnabled ? UP.brand : UP.caption }}>
            {bannerEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <textarea
          value={bannerText}
          onChange={e => setBannerText(e.target.value)}
          placeholder="팝업 내용 (줄바꿈 가능)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <p className="text-a11" style={{ color: UP.caption, marginTop: 5 }}>
          * 사용자가 "오늘 하루 보지 않기" 클릭 시 24시간 비표시
        </p>
      </div>

      <button onClick={save} disabled={saving} style={{
        ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        {saving ? '저장 중...' : '설정 저장'}
      </button>
      {msg && (
        <p className="text-a12" style={{ color: msg.ok ? UP.green : UP.danger, marginTop: 8 }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: UP.sunken,
  border: `1px solid ${UP.hair}`,
  borderRadius: RADIUS.card, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: UP.body, marginBottom: 6,
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: UP.sub, flex: 1,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: UP.sunken, border: `1px solid ${UP.hair}`,
  borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: UP.navy,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
