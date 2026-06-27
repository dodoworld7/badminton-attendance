import React, { useState, useEffect } from 'react';
import { Pencil, Users } from 'lucide-react';
import { dbService } from '../services/db';

export default function AdminPanel({ currentUser, onRefreshAttendance }) {
  // 관리자 여부 판단 (이 컴포넌트 내부에서 직접 체크)
  const isAdmin = currentUser && (currentUser.isAdmin === true || currentUser.email === 'admin@admin.com');

  const [allUsers, setAllUsers] = useState([]);
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameMsg, setRenameMsg] = useState('');
  const [renameMsgType, setRenameMsgType] = useState(''); // 'success' | 'error'


  // 회원 목록 로드
  useEffect(() => {
    if (!isAdmin) return; // 관리자가 아니면 로드하지 않음
    const load = async () => {
      try {
        const users = await dbService.getAllUsers();
        setAllUsers(users);
      } catch (err) {
        console.error('회원 목록 로드 실패:', err);
      }
    };
    load();
  }, [currentUser, isAdmin]);

  // 관리자가 아니면 아무것도 렌더링하지 않음
  if (!isAdmin) return null;

  const handleRenameUser = async (e) => {
    e.preventDefault();
    if (!renameTargetId || !renameNewName.trim()) return;
    const targetUser = allUsers.find(u => u.id === renameTargetId);
    if (!targetUser) return;

    setRenameLoading(true);
    setRenameMsg('');
    try {
      await dbService.updateUserName(targetUser, renameNewName.trim());
      setAllUsers(prev => prev.map(u =>
        u.id === renameTargetId ? { ...u, name: renameNewName.trim() } : u
      ));
      setRenameMsgType('success');
      setRenameMsg(`✅ "${targetUser.name}" → "${renameNewName.trim()}" 이름 변경 완료!`);
      setRenameTargetId('');
      setRenameNewName('');
      onRefreshAttendance();
    } catch (err) {
      setRenameMsgType('error');
      setRenameMsg('❌ 이름 변경에 실패했습니다: ' + err.message);
    } finally {
      setRenameLoading(false);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.07)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '0',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Pencil size={16} color="#f59e0b" />
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b' }}>
            🛠️ 관리자 전용: 회원 이름 변경
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
            선택한 회원의 이름과 모든 출석 기록을 일괄 변경합니다
          </div>
        </div>
      </div>

      {/* 회원 수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <Users size={13} />
        <span>등록 회원 {allUsers.length}명</span>
      </div>

      {/* 폼 */}
      <form onSubmit={handleRenameUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select
          value={renameTargetId}
          onChange={(e) => {
            setRenameTargetId(e.target.value);
            const found = allUsers.find(u => u.id === e.target.value);
            setRenameNewName(found ? found.name : '');
            setRenameMsg('');
          }}
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="">-- 이름 변경할 회원 선택 --</option>
          {allUsers.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email || '이메일 없음'})
            </option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={renameNewName}
            onChange={(e) => setRenameNewName(e.target.value)}
            placeholder="새 이름 입력"
            disabled={!renameTargetId || renameLoading}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!renameTargetId || !renameNewName.trim() || renameLoading}
            style={{
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              borderRadius: '8px',
              cursor: renameLoading ? 'not-allowed' : 'pointer',
              background: (!renameTargetId || !renameNewName.trim() || renameLoading)
                ? '#555'
                : '#f59e0b',
              color: '#000',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
          >
            {renameLoading ? '변경 중...' : '이름 변경'}
          </button>
        </div>
      </form>

      {/* 결과 메시지 */}
      {renameMsg && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: renameMsgType === 'success'
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            color: renameMsgType === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${renameMsgType === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {renameMsg}
        </div>
      )}
    </div>
  );
}
