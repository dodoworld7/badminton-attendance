import React from 'react';
import { Trophy, Flame } from 'lucide-react';

export default function Statistics({ currentUser, attendanceList, currentDate }) {
  const date = currentDate || new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;

  // 이번 달의 출석왕 랭킹 계산
  const calculateRanking = () => {
    const userCounts = {};
    
    attendanceList.forEach((att) => {
      const parts = att.attendance_date.split('-');
      const attYear = parseInt(parts[0], 10);
      const attMonth = parseInt(parts[1], 10);

      if (attYear === currentYear && attMonth === currentMonth) {
        if (userCounts[att.user_id]) {
          userCounts[att.user_id].count += 1;
          if (att.created_at) {
            const attTime = new Date(att.created_at).getTime();
            if (attTime < userCounts[att.user_id].firstCreatedAt) {
              userCounts[att.user_id].firstCreatedAt = attTime;
            }
          }
        } else {
          userCounts[att.user_id] = {
            name: att.user_name,
            count: 1,
            firstCreatedAt: att.created_at ? new Date(att.created_at).getTime() : Infinity
          };
        }
      }
    });

    return Object.entries(userCounts)
      .map(([userId, info]) => ({
        userId,
        name: info.name,
        count: info.count,
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

  // 로그인 유저의 이번 달 출석 횟수
  const myCount = currentUser
    ? attendanceList.filter((a) => {
        const parts = a.attendance_date.split('-');
        return a.user_id === currentUser.id &&
               parseInt(parts[0], 10) === currentYear &&
               parseInt(parts[1], 10) === currentMonth;
      }).length
    : 0;

  // 로그인 유저의 올해 누적 출석 횟수
  const myYearCount = currentUser
    ? attendanceList.filter((a) => {
        const parts = a.attendance_date.split('-');
        return a.user_id === currentUser.id &&
               parseInt(parts[0], 10) === currentYear;
      }).length
    : 0;

  return (
    <div className="glass-panel">
      <h2 className="section-title">
        <Trophy size={20} style={{ color: 'var(--accent-neon)' }} />
        누적 출석 및 랭킹
      </h2>

      <div className="stats-grid">
        {/* 나의 출석 횟수 (가독성 최적화 & 줄바꿈 방지) */}
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
            {currentUser ? `${currentUser.name}님의 기록` : '로그인 해주세요'}
          </span>
        </div>

        {/* 출석 왕 랭킹 (가독성 개편 리스트) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span className="stats-my-title" style={{ display: 'block', marginBottom: '4px', whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
            🏆 {currentMonth}월 출석왕 랭킹
          </span>
          
          <div className="stats-ranking-box">
            {rankingWithTies.length > 0 ? (
              rankingWithTies.map((rank) => {
                let rankClass = 'other';
                if (rank.displayRank === 1) rankClass = 'first';
                else if (rank.displayRank === 2) rankClass = 'second';
                else if (rank.displayRank === 3) rankClass = 'third';

                return (
                  <div key={rank.userId} className="stats-rank-item">
                    <div className="stats-rank-info">
                      <span className={`stats-rank-number ${rankClass}`}>
                        {rank.displayRank}위
                      </span>
                      <span className="stats-rank-name">{rank.name}</span>
                      {rank.userId === currentUser?.id && (
                        <span className="badge badge-blue" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          나
                        </span>
                      )}
                    </div>
                    <span className="stats-rank-count">{rank.count}회</span>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                fontStyle: 'italic', 
                textAlign: 'center', 
                padding: '24px 0',
                background: '#f9fafb',
                border: '1px dashed var(--glass-border)',
                borderRadius: '12px'
              }}>
                출석 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
