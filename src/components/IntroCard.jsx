import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Clock, UserCheck, ShieldAlert, Zap, Camera, RotateCcw, 
  Shield, Sparkles, CheckCircle2 
} from 'lucide-react';
import defaultBannerPhoto from '../assets/banner_photo.jpg';
import { dbService, isFirebaseConfigured } from '../services/db';

export default function IntroCard({ currentUser, onOpenLogin, onLogout, onOpenQuickCheck }) {
  const isAdmin = currentUser && (
    currentUser.isAdmin === true || 
    (currentUser.email && currentUser.email.toLowerCase() === 'admin@admin.com')
  );

  const [bannerSrc, setBannerSrc] = useState(defaultBannerPhoto);
  const [isCustomPhoto, setIsCustomPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // 저장된 클럽 대표 사진 불러오기
  useEffect(() => {
    const loadBanner = async () => {
      try {
        const savedBanner = await dbService.getClubBanner();
        if (savedBanner) {
          setBannerSrc(savedBanner);
          setIsCustomPhoto(true);
        }
      } catch (err) {
        console.error('대표 사진 로드 실패:', err);
      }
    };
    loadBanner();
  }, []);

  // 사진 업로드 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // 5MB 용량 제한 검사
    if (file.size > 5 * 1024 * 1024) {
      alert('사진 용량은 5MB 이하로 등록해 주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setBannerSrc(dataUrl);
      setIsCustomPhoto(true);
      try {
        await dbService.updateClubBanner(dataUrl);
        alert('클럽 대표 사진이 성공적으로 등록되었습니다! 🏸');
      } catch (err) {
        alert('사진 저장 중 오류가 발생했습니다.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 사진 기본값 복원 핸들러
  const handleResetPhoto = async () => {
    if (confirm('기본 체육관 사진으로 복원하시겠습니까?')) {
      try {
        await dbService.resetClubBanner();
        setBannerSrc(defaultBannerPhoto);
        setIsCustomPhoto(false);
        alert('기본 사진으로 복원되었습니다.');
      } catch (err) {
        alert('사진 복원 중 오류가 발생했습니다.');
      }
    }
  };

  // 사진 변경 버튼 클릭 시 관리자 권한 체크
  const handlePhotoClick = () => {
    if (isAdmin) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      if (confirm('클럽 대표 사진 변경은 관리자 권한이 필요합니다.\n관리자로 로그인하시겠습니까?')) {
        onOpenLogin();
      }
    }
  };

  return (
    <div className="glass-panel active-glow full-width-header" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 우측 상단 미니 LED 상태 표시등 */}
      <div 
        style={{ 
          position: 'absolute', 
          top: '16px', 
          right: '18px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.75)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <span 
          style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isFirebaseConfigured ? '#10b981' : '#3b82f6',
            boxShadow: isFirebaseConfigured ? '0 0 8px rgba(16, 185, 129, 0.7)' : '0 0 8px rgba(59, 130, 246, 0.7)',
            display: 'inline-block'
          }}
        />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
          {isFirebaseConfigured ? 'FIREBASE LIVE' : 'DEMO MODE'}
        </span>
      </div>

      <div className="intro-banner">
        {/* 📷 배너 사진 영역 (실제 사진 표시 & 관리자 사진 업로드 지원) */}
        <div 
          className="intro-image-container"
          style={{
            position: 'relative',
            borderRadius: '18px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            border: '1.5px solid var(--glass-border)'
          }}
        >
          <img 
            src={bannerSrc} 
            alt="배드민턴 클럽 대표 사진" 
            className="intro-image"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }} 
          />

          {/* 좌측 상단 사진 배지 */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            padding: '3px 8px',
            borderRadius: '8px',
            fontSize: '0.68rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>🏸 백석클럽</span>
          </div>

          {/* 사진 변경 버튼 (관리자 로그인 시 강조, 비로그인 시에도 안내 가능) */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={handlePhotoClick}
              title={isAdmin ? '클럽 대표 사진 변경 (PC/모바일 사진 업로드)' : '관리자 로그인 후 사진 변경 가능'}
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <Camera size={13} style={{ color: '#f59e0b' }} />
              <span>사진 변경</span>
            </button>

            {isAdmin && isCustomPhoto && (
              <button
                onClick={handleResetPhoto}
                title="기본 사진으로 복원"
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(6px)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>

          {/* 숨겨진 파일 선택 인풋 */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleImageChange} 
            style={{ display: 'none' }} 
          />
        </div>

        {/* 📝 소개 및 클럽 안내 정보 */}
        <div className="intro-content">
          <div className="intro-title-wrapper" style={{ marginBottom: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(5, 150, 105, 0.1)',
              border: '1px solid rgba(5, 150, 105, 0.2)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.76rem',
              color: '#059669',
              fontWeight: 800,
              marginBottom: '6px'
            }}>
              <Sparkles size={13} />
              <span>주말 & 공휴일 정기 모임</span>
            </div>
            <h1 className="intro-main-title" style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.15
            }}>
              배드민턴 출석부 🏸
            </h1>
          </div>

          {/* 장소 & 시간 안내 카드 (가독성 최적화) */}
          <div className="intro-details">
            <div className="intro-info-item">
              <div style={{
                background: 'rgba(5, 150, 105, 0.12)',
                color: '#059669',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <MapPin size={20} />
              </div>
              <div className="intro-info-text">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  운동 장소
                </span>
                <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  백석초등학교 체육관
                </strong>
              </div>
            </div>

            <div className="intro-info-item">
              <div style={{
                background: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div className="intro-info-text">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>
                  운동 시간
                </span>
                <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  토·일·공휴일 07:00 ~ 10:00
                </strong>
              </div>
            </div>
          </div>

          {/* 👤 세션 정보 & 액션 버튼 (빠른 출석 체크 & 로그인) */}
          <div className="user-profile-wrapper" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="user-avatar" style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isAdmin ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    {currentUser.name ? currentUser.name[0] : 'U'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{currentUser.name}님</span>
                      {isAdmin && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#7c3aed',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '8px'
                        }}>
                          <Shield size={11} /> 관리자
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      오늘도 즐거운 경기 되세요! 🏸
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    별도 로그인 없이도 <strong>빠른 출석 체크</strong>가 가능합니다!
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* ⚡ 빠른 출석 체크 버튼 — 메인 하이라이트 */}
              <button
                className="btn btn-primary"
                onClick={onOpenQuickCheck}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  padding: '9px 18px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
              >
                <Zap size={18} />
                <span>빠른 출석 체크</span>
              </button>

              {currentUser ? (
                <button 
                  className="btn btn-outline" 
                  onClick={onLogout}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  로그아웃
                </button>
              ) : (
                <button 
                  className="btn btn-outline" 
                  onClick={onOpenLogin}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserCheck size={16} />
                  <span>로그인</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
