import React from 'react';
import { Trophy, Award, User, Flame } from 'lucide-react';

export default function Statistics({ currentUser, attendanceList }) {
  // 이번 달 전체 랭킹 계산
  const calculateRanking = () => {
    const userCounts = {};
    
    attendanceList.forEach((att) => {
      if (userCounts[att.user_id]) {
        userCounts[att.user_id].count += 1;
      } else {
        userCounts[att.user_id] = {
          name: att.user_name,
          count: 1
        };
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

  // 로그인 유저의 개인 누적 횟수
  const myCount = currentUser
    ? attendanceList.filter((a) => a.user_id === currentUser.id).length
    : 0;

  return (
    <div className="glass-panel">
      <h2 className="section-title">
        <Trophy size={20} style={{ color: 'var(--accent-neon)' }} />
        누적 출석 및 랭킹
      </h2>

      <div className="stats-grid">
        {/* 나의 출석 횟수 */}
        <div className="stats-my-box">
          <Flame size={24} style={{ color: 'var(--accent-neon)' }} />
          <span className="stats-my-title">나의 누적 출석</span>
          <div className="stats-my-count">{myCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {currentUser ? `${currentUser.name}님의 기록` : '로그인 해주세요'}
          </span>
        </div>

        {/* 출석 왕 랭킹 */}
        <div>
          <span className="stats-my-title" style={{ display: 'block', marginBottom: '10px' }}>
            🏆 이달의 출석왕 랭킹
          </span>
          
          <div className="stats-ranking-box">
            {ranking.length > 0 ? (
              ranking.slice(0, 5).map((rank, index) => {
                let rankClass = 'other';
                if (index === 0) rankClass = 'first';
                else if (index === 1) rankClass = 'second';
                else if (index === 2) rankClass = 'third';

                return (
                  <div key={rank.userId} className="stats-rank-item">
                    <div className="stats-rank-info">
                      <span className={`stats-rank-number ${rankClass}`}>
                        {index + 1}
                      </span>
                      <span className="stats-rank-name">{rank.name}</span>
                      {rank.userId === currentUser?.id && (
                        <span className="badge badge-blue" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                          나
                        </span>
                      )}
                    </div>
                    <span className="stats-rank-count">{rank.count}회</span>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                출석 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
