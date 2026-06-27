import React from 'react';
import { MapPin, Clock, CalendarRange, UserCheck, ShieldAlert } from 'lucide-react';
import bannerImg from '../assets/banner.png';
import { isFirebaseConfigured } from '../services/db';

export default function IntroCard({ currentUser, onOpenLogin, onLogout }) {
  return (
    <div className="glass-panel active-glow full-width-header">
      <div className="intro-banner">
        {/* 배너 이미지 영역 */}
        <div className="intro-image-container">
          <img src={bannerImg} alt="배드민턴 모임 활기찬 일러스트" className="intro-image" />
        </div>

        {/* 소개 및 사용자 세션 영역 */}
        <div className="intro-content">
          <div className="intro-title-wrapper">
            <h3 className="intro-subtitle">온라인 출석 체크</h3>
            <h1 className="intro-main-title">배드민턴 출석부</h1>
          </div>

          <div className="intro-details">
            <div className="intro-info-item">
              <MapPin className="intro-info-icon" size={20} />
              <div className="intro-info-text">
                <h4>장소</h4>
                <p>백석초등학교</p>
              </div>
            </div>
            <div className="intro-info-item">
              <Clock className="intro-info-icon" size={20} />
              <div className="intro-info-text">
                <h4>시간</h4>
                <p>아침 7시 ~ 10시</p>
              </div>
            </div>
          </div>

          {/* 인증 상태 및 로그인 제어 (반응형 래퍼 적용) */}
          <div className="user-profile-wrapper">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="user-avatar">{currentUser.name[0]}</div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentUser.name}님</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>환영합니다! 오늘 출석하셨나요?</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <ShieldAlert size={18} className="intro-info-icon" />
                  <span style={{ fontSize: '0.85rem' }}>출석 체크를 위해 로그인이 필요합니다.</span>
                </div>
              )}
            </div>

            <div>
              {currentUser ? (
                <button className="btn btn-outline" onClick={onLogout}>
                  로그아웃
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onOpenLogin}>
                  <UserCheck size={18} />
                  로그인 / 회원가입
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
