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
        } else {
          userCounts[att.user_id] = {
            name: att.user_name,
            count: 1
          };
        }
      }
    });

    return Object.entries(userCounts)
      .map(([userId, info]) => ({
        userId,
        name: info.name,
        count: info.count
      }))
      .sort((a, b) => b.count - a.count);
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

  return (
    <div className="glass-panel">
      <h2 className="section-title">
        <Trophy size={20} style={{ color: 'var(--accent-neon)' }} />
        누적 출석 및 랭킹
      </h2>

      <div className="stats-grid">
        {/* 나의 출석 횟수 (가로/세로 중앙 정렬) */}
        <div className="stats-my-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
            <Flame size={20} style={{ color: 'var(--accent-neon)' }} />
            <span className="stats-my-title">나의 이번 달 출석</span>
          </div>
          <div className="stats-my-count">{myCount}</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {currentUser ? `${currentUser.name}님의 기록` : '로그인 해주세요'}
          </span>
        </div>

        {/* 출석 왕 랭킹 (가독성 개편 리스트) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span className="stats-my-title" style={{ display: 'block', marginBottom: '4px' }}>
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
