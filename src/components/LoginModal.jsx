import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { dbService, isFirebaseConfigured } from '../services/db';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('이름을 입력해 주세요.');
        }
        user = await dbService.signUp(email, password, name);
      } else {
        user = await dbService.signIn(email, password);
      }
      onLoginSuccess(user);
      onClose();
      // 폼 초기화
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err.message || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 절대값 위치의 보더 없는 X 닫기 버튼 */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            right: '20px', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-secondary)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="닫기"
        >
          <X size={20} />
        </button>

        <div className="modal-header" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
          <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 850 }}>
            {isSignUp ? '멤버 회원가입 🏸' : '멤버 로그인 🏸'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {isSignUp ? '반갑습니다! 우리 클럽 멤버로 등록해 보세요. 🎉' : '환영합니다! 오늘 운동 출석을 체크해 보세요. 👋'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">이름</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="홍길동"
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">이메일 주소</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                placeholder="example@email.com"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '44px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? '처리 중...' : isSignUp ? '가입 완료' : '로그인'}
          </button>
        </form>

        <div className="modal-toggle-auth">
          {isSignUp ? '이미 계정이 있으신가요?' : '처음 방문하셨나요?'}
          <span className="modal-toggle-link" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
            {isSignUp ? '로그인하기' : '회원가입하기'}
          </span>
        </div>

        {/* 데모 모드일 때 계정 힌트 제공 */}
        {!isFirebaseConfigured && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px dashed var(--glass-border)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ fontWeight: 600, color: 'var(--accent-neon)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> 데모 계정 안내
            </p>
            <p>이메일: <strong>dohyun@badminton.com</strong></p>
            <p>비밀번호: <strong>password123</strong></p>
            <p style={{ fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-muted)' }}>
              * 임의의 이메일로 가입하셔도 로컬 환경에서 테스트 가능합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
