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
        <div className="modal-header">
          <h3 className="modal-title">
            {isSignUp ? '새 멤버 등록 (회원가입)' : '멤버 로그인'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
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
