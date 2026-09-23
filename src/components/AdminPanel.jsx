import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Users, UserPlus, Trash2, CheckCircle2, AlertCircle, Camera, RotateCcw, Image } from 'lucide-react';
import { dbService } from '../services/db';
import defaultBannerPhoto from '../assets/banner_photo.jpg';

export default function AdminPanel({ currentUser, onRefreshAttendance }) {
  // 관리자 여부 판단
  const isAdmin = currentUser && (currentUser.isAdmin === true || (currentUser.email && currentUser.email.toLowerCase() === 'admin@admin.com'));

  const [allUsers, setAllUsers] = useState([]);
  
  // 새 회원 추가 상태
  const [newMemberName, setNewMemberName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState({ text: '', type: '' });

  // 회원 이름 변경 상태
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameMsg, setRenameMsg] = useState({ text: '', type: '' });

  // 배너 사진 상태
  const [bannerPreview, setBannerPreview] = useState(defaultBannerPhoto);
  const [isCustomBanner, setIsCustomBanner] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const bannerInputRef = useRef(null);

  // 회원 목록 로드
  const loadUsers = async () => {
    try {
      const users = await dbService.getAllUsers();
      // 관리자 제외 후 가나다 순 정렬
      const sorted = [...users].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      setAllUsers(sorted);
    } catch (err) {
      console.error('회원 목록 로드 실패:', err);
    }
  };

  // 배너 사진 로드
  const loadBanner = async () => {
    try {
      const saved = await dbService.getClubBanner();
      if (saved) {
        setBannerPreview(saved);
        setIsCustomBanner(true);
      } else {
        setBannerPreview(defaultBannerPhoto);
        setIsCustomBanner(false);
      }
    } catch (err) {
      console.error('배너 로드 실패:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadBanner();
    }
  }, [currentUser, isAdmin]);

  // 관리자가 아니면 아무것도 렌더링하지 않음
  if (!isAdmin) return null;

  // 1. 새 회원(이름) 추가 핸들러
  const handleAddMember = async (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;

    setAddLoading(true);
    setAddMsg({ text: '', type: '' });

    try {
      // 중복 검사
      const exists = allUsers.some(u => u.name && u.name.trim() === name);
      if (exists) {
        setAddMsg({ text: '⚠️ 이미 등록된 회원 이름입니다.', type: 'error' });
        setAddLoading(false);
        return;
      }

      await dbService.addUser(name);
      setAddMsg({ text: `✓ "${name}" 회원이 성공적으로 추가되었습니다.`, type: 'success' });
      setNewMemberName('');
      await loadUsers();
      if (onRefreshAttendance) onRefreshAttendance();
    } catch (err) {
      setAddMsg({ text: '❌ 회원 추가에 실패했습니다: ' + err.message, type: 'error' });
    } finally {
      setAddLoading(false);
    }
  };

  // 2. 회원 이름 변경(수정) 핸들러
  const handleRenameMember = async (e) => {
    e.preventDefault();
    if (!renameTargetId) {
      setRenameMsg({ text: '⚠️ 이름을 변경할 회원을 선택해 주세요.', type: 'error' });
      return;
    }
    const trimmedName = renameNewName.trim();
    if (!trimmedName) {
      setRenameMsg({ text: '⚠️ 새 이름을 입력해 주세요.', type: 'error' });
      return;
    }

    setRenameLoading(true);
    setRenameMsg({ text: '', type: '' });

    try {
      const targetUser = allUsers.find(u => u.id === renameTargetId);
      const oldName = targetUser ? targetUser.name : '';

      await dbService.updateUserName(renameTargetId, trimmedName);
      setRenameMsg({ text: `✓ "${oldName}" 회원의 이름이 "${trimmedName}"(으)로 변경되고 과거 출석 기록이 모두 동기화되었습니다!`, type: 'success' });
      setRenameNewName('');
      setRenameTargetId('');
      await loadUsers();
      if (onRefreshAttendance) onRefreshAttendance();
    } catch (err) {
      setRenameMsg({ text: '❌ 이름 변경에 실패했습니다: ' + err.message, type: 'error' });
    } finally {
      setRenameLoading(false);
    }
  };

  // 3. 회원 삭제 핸들러
  const handleDeleteUser = async (user) => {
    if (user.isAdmin) {
      alert('관리자 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`정말로 "${user.name}" 회원을 삭제하시겠습니까?`)) return;

    try {
      await dbService.deleteUser(user.id);
      await loadUsers();
      if (onRefreshAttendance) onRefreshAttendance();
    } catch (err) {
      alert('회원 삭제 실패: ' + err.message);
    }
  };

  // 4. 배너 사진 업로드 핸들러
  const handleBannerUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('사진 용량은 5MB 이하로 등록해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setBannerPreview(dataUrl);
      setIsCustomBanner(true);
      try {
        await dbService.updateClubBanner(dataUrl);
        setBannerMsg('✓ 대표 사진이 성공적으로 변경되었습니다. 새로고침 시 상단에 적용됩니다!');
        setTimeout(() => setBannerMsg(''), 4000);
      } catch (err) {
        alert('사진 저장 중 오류가 발생했습니다.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 5. 배너 사진 기본값 복원 핸들러
  const handleResetBanner = async () => {
    if (confirm('기본 체육관 사진으로 복원하시겠습니까?')) {
      try {
        await dbService.resetClubBanner();
        setBannerPreview(defaultBannerPhoto);
        setIsCustomBanner(false);
        setBannerMsg('✓ 기본 사진으로 복원되었습니다.');
        setTimeout(() => setBannerMsg(''), 4000);
      } catch (err) {
        alert('사진 복원 실패: ' + err.message);
      }
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        background: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <Users size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>
              🛠️ 관리자 전용 관리 센터
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              새 회원 등록, 이름 변경, 클럽 대표 사진 변경 등을 관리할 수 있습니다
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '2px 8px',
            fontWeight: 700
          }}
        >
          관리자 모드 활성
        </span>
      </div>

      {/* 상단 3단 그리드: 회원 추가 | 회원 이름 수정 | 클럽 대표 사진 관리 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}
      >
        {/* 카드 1: 신규 회원 이름 추가 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <UserPlus size={16} color="#059669" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                새 회원 등록
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
              출석부에 새로 참여할 회원의 이름을 입력해 주세요.
            </p>

            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="이름 입력 (예: 홍길동)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={addLoading || !newMemberName.trim()}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: (addLoading || !newMemberName.trim()) ? 0.6 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {addLoading ? '추가 중...' : '추가'}
              </button>
            </form>
          </div>

          {addMsg.text && (
            <div
              style={{
                marginTop: '10px',
                fontSize: '0.78rem',
                color: addMsg.type === 'success' ? '#059669' : '#dc2626',
                fontWeight: 600
              }}
            >
              {addMsg.text}
            </div>
          )}
        </div>

        {/* 카드 2: 회원 이름 수정 (과거 출석부 자동 동기화) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Pencil size={16} color="#2563eb" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                회원 이름 변경 (출석부 동기화)
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
              오타가 있거나 개명한 회원의 이름을 수정합니다.
            </p>

            <form onSubmit={handleRenameMember} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={renameTargetId}
                  onChange={(e) => {
                    setRenameTargetId(e.target.value);
                    const target = allUsers.find(u => u.id === e.target.value);
                    if (target) setRenameNewName(target.name);
                    else setRenameNewName('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    background: '#ffffff'
                  }}
                >
                  <option value="">수정할 회원 선택...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.isAdmin ? '(관리자)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="새 이름"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={renameLoading || !renameTargetId || !renameNewName.trim()}
                style={{
                  alignSelf: 'flex-end',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: (renameLoading || !renameTargetId || !renameNewName.trim()) ? 0.6 : 1
                }}
              >
                {renameLoading ? '변경 중...' : '이름 변경 적용'}
              </button>
            </form>
          </div>

          {renameMsg.text && (
            <div
              style={{
                marginTop: '10px',
                fontSize: '0.78rem',
                color: renameMsg.type === 'success' ? '#059669' : '#dc2626',
                fontWeight: 600
              }}
            >
              {renameMsg.text}
            </div>
          )}
        </div>

        {/* 카드 3: 클럽 대표 사진(배너) 관리 */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Camera size={16} color="#d97706" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                클럽 대표 사진 관리
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
              상단 배너에 표시될 우리 클럽의 실제 사진을 등록합니다.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* 썸네일 미리보기 */}
              <div style={{
                width: '70px',
                height: '50px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                flexShrink: 0
              }}>
                <img src={bannerPreview} alt="배너 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current && bannerInputRef.current.click()}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Camera size={13} />
                  <span>새 사진 업로드</span>
                </button>

                {isCustomBanner && (
                  <button
                    type="button"
                    onClick={handleResetBanner}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={11} />
                    <span>기본 사진으로 복원</span>
                  </button>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              onChange={handleBannerUpload}
              style={{ display: 'none' }}
            />
          </div>

          {bannerMsg && (
            <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
              {bannerMsg}
            </div>
          )}
        </div>
      </div>

      {/* 하단: 전체 회원 목록 뱃지 뷰 & 삭제 */}
      <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            📋 등록된 전체 회원 명단 ({allUsers.length}명)
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            회원 옆 ❌ 아이콘을 누르면 삭제됩니다.
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          maxHeight: '180px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {allUsers.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.82rem',
                color: '#334155'
              }}
            >
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              {u.isAdmin ? (
                <span style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 700 }}>관리자</span>
              ) : (
                <button
                  onClick={() => handleDeleteUser(u)}
                  title={`${u.name} 회원 삭제`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
