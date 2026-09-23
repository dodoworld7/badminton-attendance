import React, { useState, useEffect, useRef } from 'react';
import { 
  Pencil, Users, UserPlus, Trash2, CheckCircle2, AlertCircle, 
  Camera, RotateCcw, Upload, Check, X, Image as ImageIcon 
} from 'lucide-react';
import { dbService } from '../services/db';
import defaultBannerPhoto from '../assets/banner_photo.jpg';
import { compressImage } from '../utils/imageCompressor';

export default function AdminPanel({ 
  currentUser, 
  onRefreshAttendance, 
  currentBanner, 
  onBannerChange 
}) {
  // 관리자 여부 판단
  const isAdmin = currentUser && (
    currentUser.isAdmin === true || 
    (currentUser.email && currentUser.email.toLowerCase() === 'admin@admin.com')
  );

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

  // 배너 사진 관리 상태
  const [bannerPreview, setBannerPreview] = useState(currentBanner || defaultBannerPhoto);
  const [pendingPhoto, setPendingPhoto] = useState(null); // 사용자가 선택한 새 사진 데이터
  const [pendingFileName, setPendingFileName] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerMsg, setBannerMsg] = useState({ text: '', type: '' });
  const bannerInputRef = useRef(null);

  const isCustomBanner = !!currentBanner;

  // currentBanner prop이 변경될 때 미리보기 동기화
  useEffect(() => {
    if (currentBanner) {
      setBannerPreview(currentBanner);
    } else {
      setBannerPreview(defaultBannerPhoto);
    }
  }, [currentBanner]);

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

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
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

  // 4. 사진 파일 선택 핸들러 (사진 선택 시 미리보기만 표시하고 [등록하기]를 눌러야 반영)
  const handlePhotoSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setBannerMsg({ text: '사진을 준비하는 중입니다...', type: 'info' });

    try {
      // 이미지 자동 리사이징 및 압축 (960px, 모바일 데이터 절약 및 최적화)
      const compressedDataUrl = await compressImage(file, 960, 0.78);
      setPendingPhoto(compressedDataUrl);
      setPendingFileName(file.name);
      setBannerPreview(compressedDataUrl);

      setBannerMsg({ 
        text: `📷 "${file.name}" 사진이 선택되었습니다. 아래 [등록하기] 버튼을 누르면 적용됩니다.`, 
        type: 'info' 
      });
    } catch (err) {
      console.error('사진 압축 실패:', err);
      setBannerMsg({ text: '❌ 사진 파일을 읽는 도중 오류가 발생했습니다: ' + err.message, type: 'error' });
    } finally {
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  // 5. 사진 등록하기 버튼 클릭 핸들러 (등록하기 버튼을 눌러야만 클라우드 및 상단 배너에 반영)
  const handleRegisterBanner = async () => {
    if (!pendingPhoto) {
      setBannerMsg({ text: '⚠️ 먼저 [사진 파일 선택]을 통해 등록할 사진을 선택해 주세요.', type: 'error' });
      return;
    }

    setBannerSaving(true);
    setBannerMsg({ text: '⏳ 사진을 클라우드에 등록하여 모든 기기에 동기화하는 중입니다...', type: 'info' });

    try {
      // 1. Firebase Cloud & 로컬스토리지 저장 (모바일-웹 모든 기기 실시간 반영)
      await dbService.updateClubBanner(pendingPhoto);

      // 2. 상단 기본 페이지 배너(IntroCard) 반영
      if (onBannerChange) {
        onBannerChange(pendingPhoto);
      }
      setBannerPreview(pendingPhoto);
      setPendingPhoto(null);
      setPendingFileName('');

      setBannerMsg({ 
        text: `✓ 클럽 대표 사진이 등록되어 상단 배너와 모바일/웹 모든 기기에 실시간 반영되었습니다! 🏸`, 
        type: 'success' 
      });
      setTimeout(() => setBannerMsg({ text: '', type: '' }), 6000);
    } catch (err) {
      console.error('사진 등록 실패:', err);
      setBannerMsg({ text: '❌ 사진 등록에 실패했습니다: ' + err.message, type: 'error' });
    } finally {
      setBannerSaving(false);
    }
  };

  // 6. 선택 취소 핸들러
  const handleCancelPending = () => {
    setPendingPhoto(null);
    setPendingFileName('');
    setBannerPreview(currentBanner || defaultBannerPhoto);
    setBannerMsg({ text: '', type: '' });
  };

  // 7. 배너 사진 기본값 복원 핸들러
  const handleResetBanner = async () => {
    if (!confirm('기본 체육관 사진으로 복원하시겠습니까?')) return;

    try {
      await dbService.resetClubBanner();
      if (onBannerChange) {
        onBannerChange(null);
      }
      setBannerPreview(defaultBannerPhoto);
      setPendingPhoto(null);
      setPendingFileName('');
      setBannerMsg({ text: '✓ 기본 사진으로 복원되었습니다.', type: 'success' });
      setTimeout(() => setBannerMsg({ text: '', type: '' }), 4000);
    } catch (err) {
      alert('사진 복원 실패: ' + err.message);
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
                  minWidth: 0,
                  boxSizing: 'border-box',
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

        {/* 카드 2: 회원 이름 변경 (과거 출석부 자동 동기화) */}
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

            <form onSubmit={handleRenameMember} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    1. 변경할 회원 선택
                  </label>
                  <select
                    value={renameTargetId}
                    onChange={(e) => {
                      setRenameTargetId(e.target.value);
                      const target = allUsers.find(u => u.id === e.target.value);
                      if (target) setRenameNewName(target.name);
                      else setRenameNewName('');
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      background: '#ffffff',
                      color: '#1e293b'
                    }}
                  >
                    <option value="">수정할 회원을 선택하세요...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.isAdmin ? '(관리자)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: '100%' }}>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                    2. 새로운 이름 입력
                  </label>
                  <input
                    type="text"
                    placeholder="새로운 이름 입력 (예: 유재준)"
                    value={renameNewName}
                    onChange={(e) => setRenameNewName(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={renameLoading || !renameTargetId || !renameNewName.trim()}
                style={{
                  width: '100%',
                  background: (renameTargetId && renameNewName.trim()) 
                    ? 'linear-gradient(135deg, #2563eb, #3b82f6)' 
                    : '#e2e8f0',
                  color: (renameTargetId && renameNewName.trim()) ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: (renameTargetId && renameNewName.trim()) ? 'pointer' : 'not-allowed',
                  boxShadow: (renameTargetId && renameNewName.trim()) ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {renameLoading ? '이름 변경 적용 중...' : '이름 변경 적용'}
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

        {/* 카드 3: 클럽 대표 사진 관리 (사진 선택 후 [등록하기] 2단계 확정 방식) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Camera size={16} color="#d97706" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                클럽 대표 사진 관리
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>
              사진을 선택한 후 <strong>[등록하기]</strong> 버튼을 누르면 상단 배너와 모바일/웹 모든 기기에 실시간 반영됩니다.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {/* 1단계: 사진 미리보기 + 사진 파일 선택 버튼 */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                {/* 사진 미리보기 */}
                <div style={{
                  width: '82px',
                  height: '56px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: pendingPhoto ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}>
                  <img 
                    src={pendingPhoto || bannerPreview} 
                    alt="배너 미리보기" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  {pendingPhoto && (
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(245, 158, 11, 0.95)',
                      color: '#ffffff',
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '1px 0',
                      letterSpacing: '-0.3px'
                    }}>
                      선택됨
                    </span>
                  )}
                </div>

                {/* 사진 파일 선택 버튼 (글자 안 밀리도록 white-space 처리) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current && bannerInputRef.current.click()}
                    disabled={bannerSaving}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: bannerSaving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Upload size={14} style={{ flexShrink: 0, color: '#64748b' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {pendingPhoto ? '다른 사진 선택' : '사진 파일 선택'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2단계: 등록하기 버튼 (100% 가로 너비로 배치하여 글자 꺾임/밀림 전혀 없음) */}
              <button
                type="button"
                onClick={handleRegisterBanner}
                disabled={!pendingPhoto || bannerSaving}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  background: (pendingPhoto && !bannerSaving) 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                    : '#e2e8f0',
                  color: (pendingPhoto && !bannerSaving) ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: (pendingPhoto && !bannerSaving) ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: (pendingPhoto && !bannerSaving) ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Check size={15} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>
                  {bannerSaving ? '모바일/웹 동기화 등록 중...' : '등록하기'}
                </span>
              </button>

              {/* 하단 보조 옵션: 선택 취소 및 기본 사진 복원 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                {pendingPhoto ? (
                  <button
                    type="button"
                    onClick={handleCancelPending}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      textDecoration: 'underline',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    선택 취소
                  </button>
                ) : <span />}

                {isCustomBanner && !pendingPhoto && (
                  <button
                    type="button"
                    onClick={handleResetBanner}
                    disabled={bannerSaving}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <RotateCcw size={11} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>기본 사진으로 복원</span>
                  </button>
                )}
              </div>
            </div>

            {/* 안내 텍스트 */}
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px', lineHeight: 1.4 }}>
              💡 모바일(스마트폰)이나 PC 어디서 등록하든 전 회원의 화면에 실시간으로 자동 동기화됩니다.
            </div>
          </div>

          {/* 숨겨진 파일 선택 인풋 */}
          <input
            type="file"
            ref={bannerInputRef}
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          {/* 안내 및 피드백 메시지 */}
          {bannerMsg.text && (
            <div style={{
              fontSize: '0.76rem',
              color: bannerMsg.type === 'success' 
                ? '#059669' 
                : bannerMsg.type === 'error' 
                ? '#dc2626' 
                : '#d97706',
              fontWeight: 600,
              background: bannerMsg.type === 'success' 
                ? 'rgba(16,185,129,0.08)' 
                : bannerMsg.type === 'error' 
                ? 'rgba(239,68,68,0.08)' 
                : 'rgba(245,158,11,0.08)',
              padding: '6px 10px',
              borderRadius: '8px',
              border: `1px solid ${
                bannerMsg.type === 'success' 
                  ? 'rgba(16,185,129,0.2)' 
                  : bannerMsg.type === 'error' 
                  ? 'rgba(239,68,68,0.2)' 
                  : 'rgba(245,158,11,0.2)'
              }`
            }}>
              {bannerMsg.text}
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
