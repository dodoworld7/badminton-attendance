import React, { useState } from 'react';
import { Trophy, Flame, ChevronDown, ChevronUp, Medal } from 'lucide-react';

export default function Statistics({ currentUser, attendanceList, currentDate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const date = currentDate || new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;

  // 이번 달의 출석왕 랭킹 계산 (이름 기준으로 빠른 출석체크와 로그인 출석 완전 합산)
  const calculateRanking = () => {
    // key: 정규화된 이름 (또는 user_id)
    const userStats = {};

    attendanceList.forEach((att) => {
      if (!att.attendance_date) return;
      const parts = att.attendance_date.split('-');
      const attYear = parseInt(parts[0], 10);
      const attMonth = parseInt(parts[1], 10);

      if (attYear === currentYear && attMonth === currentMonth) {
        const rawName = (att.user_name || '').trim();
        const primaryKey = rawName || att.user_id;
        if (!primaryKey) return;

        if (!userStats[primaryKey]) {
          userStats[primaryKey] = {
            name: rawName || '익명',
            userIds: new Set([att.user_id]),
            // 동일 날짜 중복 출석 방지를 위한 Set
            dates: new Set(),
            firstCreatedAt: att.created_at ? new Date(att.created_at).getTime() : Infinity
          };
        }

        userStats[primaryKey].dates.add(att.attendance_date);
        userStats[primaryKey].userIds.add(att.user_id);

        if (att.created_at) {
          const attTime = new Date(att.created_at).getTime();
          if (attTime < userStats[primaryKey].firstCreatedAt) {
            userStats[primaryKey].firstCreatedAt = attTime;
          }
        }
      }
    });

    return Object.entries(userStats)
      .map(([key, info]) => ({
        key,
        name: info.name,
        userIds: Array.from(info.userIds),
        count: info.dates.size, // 유니크한 출석 일수 (동일 날짜 중복 기록 방지)
        firstCreatedAt: info.firstCreatedAt
      }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return a.firstCreatedAt - b.firstCreatedAt;
      });
  };

  const ranking = calculateRanking();

  // 공동 순위 계산 (동일 횟수 시 동일 순위 부여)
  let currentRank = 0;
  let previousCount = -1;
  const rankingWithTies = ranking.map((rank) => {
    if (rank.count !== previousCount) {
      currentRank += 1;
      previousCount = rank.count;
    }
    return {
      ...rank,
      displayRank: currentRank
    };
  });

  // 현재 로그인 유저의 출석 여부 판별 헬퍼 (ID 또는 이름 일치)
  const isMyRecord = (att) => {
    if (!currentUser) return false;
    if (att.user_id && att.user_id === currentUser.id) return true;
    if (currentUser.name && att.user_name && (att.user_name || '').trim() === currentUser.name.trim()) return true;
    return false;
  };

  // 로그인 유저의 이번 달 출석 일수 (중복 날짜 제거)
  const myUniqueMonthDates = new Set();
  const myUniqueYearDates = new Set();

  if (currentUser) {
    attendanceList.forEach((a) => {
      if (!a.attendance_date) return;
      if (isMyRecord(a)) {
        const parts = a.attendance_date.split('-');
        const attYear = parseInt(parts[0], 10);
        const attMonth = parseInt(parts[1], 10);

        if (attYear === currentYear) {
          myUniqueYearDates.add(a.attendance_date);
          if (attMonth === currentMonth) {
            myUniqueMonthDates.add(a.attendance_date);
          }
        }
      }
    });
  }

  const myCount = myUniqueMonthDates.size;
  const myYearCount = myUniqueYearDates.size;

  // 순위표 기본 표시 개수 (기본 5명 표시, 더보기 클릭 시 전체 펼침)
  const DEFAULT_VISIBLE_COUNT = 5;
  const shouldShowToggle = rankingWithTies.length > DEFAULT_VISIBLE_COUNT;
  const visibleRanking = isExpanded ? rankingWithTies : rankingWithTies.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <div className="glass-panel">
      <h2 className="section-title">
        <Trophy size={20} style={{ color: 'var(--accent-neon)' }} />
        누적 출석 및 랭킹
      </h2>

      <div className="stats-grid">
        {/* 나의 출석 현황 */}
        <div className="stats-my-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
            <Flame size={18} style={{ color: 'var(--accent-neon)', flexShrink: 0 }} />
            <span className="stats-my-title" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>나의 출석 현황</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            width: '100%',
            margin: '6px 0 10px'
          }}>
            {/* 이번 달 */}
            <div style={{
              background: 'rgba(5, 150, 105, 0.06)',
              border: '1px solid rgba(5, 150, 105, 0.15)',
              borderRadius: '12px',
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                wordBreak: 'keep-all',
                fontWeight: 600,
                marginBottom: '4px'
              }}>
                이번 달
              </span>
              <span style={{
                fontSize: '1.45rem',
                fontWeight: 850,
                color: 'var(--accent-neon)',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                fontFamily: 'var(--font-title)'
              }}>
                {myCount}<span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '2px' }}>회</span>
              </span>
            </div>

            {/* 올해 누적 */}
            <div style={{
              background: 'rgba(37, 99, 235, 0.06)',
              border: '1px solid rgba(37, 99, 235, 0.15)',
              borderRadius: '12px',
              padding: '10px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                wordBreak: 'keep-all',
                fontWeight: 600,
                marginBottom: '4px'
              }}>
                올해 누적
              </span>
              <span style={{
                fontSize: '1.45rem',
                fontWeight: 850,
                color: 'var(--accent-blue)',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                fontFamily: 'var(--font-title)'
              }}>
                {myYearCount}<span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '2px' }}>회</span>
              </span>
            </div>
          </div>

          <span style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            wordBreak: 'keep-all',
            display: 'block'
          }}>
            {currentUser ? `${currentUser.name}님의 기록 (빠른출석 합산)` : '로그인 해주세요'}
          </span>
        </div>

        {/* 출석 왕 랭킹 (가독성 높은 1열 리스트 & 더보기 아코디언) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span className="stats-my-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏆 {currentMonth}월 출석 순위
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                (총 {rankingWithTies.length}명)
              </span>
            </span>
            {shouldShowToggle && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 4px'
                }}
              >
                {isExpanded ? (
                  <>접기 <ChevronUp size={15} /></>
                ) : (
                  <>더보기 <ChevronDown size={15} /></>
                )}
              </button>
            )}
          </div>
          
          <div className="stats-ranking-box">
            {rankingWithTies.length > 0 ? (
              <div className="stats-rank-list">
                {visibleRanking.map((rank) => {
                  let rankClass = 'other';
                  if (rank.displayRank === 1) rankClass = 'first';
                  else if (rank.displayRank === 2) rankClass = 'second';
                  else if (rank.displayRank === 3) rankClass = 'third';

                  const isMe = currentUser && (
                    rank.userIds.includes(currentUser.id) ||
                    (currentUser.name && rank.name === currentUser.name.trim())
                  );

                  return (
                    <div 
                      key={rank.key} 
                      className={`stats-rank-item ${rankClass} ${isMe ? 'is-me' : ''}`}
                    >
                      <div className="stats-rank-info">
                        <span className={`stats-rank-number ${rankClass}`}>
                          {rank.displayRank <= 3 && <Medal size={13} style={{ marginRight: '2px' }} />}
                          {rank.displayRank}위
                        </span>
                        <span className="stats-rank-name">
                          {rank.name}
                        </span>
                        {isMe && (
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '1px 6px', marginLeft: '4px' }}>
                            나
                          </span>
                        )}
                      </div>
                      <span className="stats-rank-count">
                        {rank.count}회
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                textAlign: 'center', 
                padding: '24px 0',
                background: '#f9fafb',
                border: '1px dashed var(--glass-border)',
                borderRadius: '12px'
              }}>
                이번 달 출석 데이터가 없습니다.
              </div>
            )}

            {/* 인원이 많을 때 아래로 칸이 열리는 더보기/접기 버튼 */}
            {shouldShowToggle && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="stats-more-toggle-btn"
              >
                {isExpanded ? (
                  <>▲ 상위 5위까지만 접기</>
                ) : (
                  <>▼ 아래 순위 더보기 (총 {rankingWithTies.length}명 중 {rankingWithTies.length - DEFAULT_VISIBLE_COUNT}명 더 있음)</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

