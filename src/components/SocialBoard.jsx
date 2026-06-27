import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { dbService } from '../services/db';

export default function SocialBoard({ currentUser, selectedDateStr }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // 선택된 날짜가 바뀔 때마다 메시지 리스트 다시 가져오기
  const fetchMessages = async () => {
    if (!selectedDateStr) return;
    try {
      const msgs = await dbService.getMessages(selectedDateStr);
      setMessages(msgs);
    } catch (err) {
      console.error('메시지를 불러오는 도중 오류 발생:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [selectedDateStr]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || loading) return;

    setLoading(true);
    try {
      await dbService.addMessage(selectedDateStr, inputText, currentUser);
      setInputText('');
      await fetchMessages(); // 리스트 갱신
    } catch (err) {
      alert('메시지 전송에 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!confirm('정말 이 한마디를 삭제하시겠습니까?')) return;

    try {
      await dbService.deleteMessage(msgId, currentUser);
      await fetchMessages(); // 리스트 갱신
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel">
      <h2 className="section-title">
        <MessageSquare size={20} style={{ color: 'var(--accent-blue)' }} />
        오늘의 한마디 💬
      </h2>

      <div className="social-board-container">
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          📅 {selectedDateStr} 운동에 대해 소통해 보세요!
        </p>

        {/* 메시지 리스트 스크롤러 */}
        <div className="social-messages-scroller">
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="social-msg-item">
                <div className="social-msg-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="social-msg-author">{msg.user_name}</span>
                    <span className="social-msg-time">{formatTime(msg.created_at)}</span>
                  </div>
                  {currentUser && currentUser.id === msg.user_id && (
                    <button
                      className="social-msg-delete"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="social-msg-text">{msg.message_text}</p>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
              아직 작성된 한마디가 없습니다.
            </div>
          )}
        </div>

        {/* 메시지 입력 폼 */}
        {currentUser ? (
          <form onSubmit={handleSendMessage} className="social-form">
            <input
              type="text"
              placeholder="예: 오늘 5분 늦습니다! / 라켓 빌려주실 분?"
              className="form-input social-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={100}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }} disabled={loading}>
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px dashed var(--glass-border)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: '8px'
          }}>
            로그인하시면 해당 날짜에 한마디를 남기실 수 있습니다. 😊
          </div>
        )}
      </div>
    </div>
  );
}
