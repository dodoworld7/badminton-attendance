import React, { useState, useEffect } from 'react';
import { dbService, isFirebaseConfigured } from './services/db';
import IntroCard from './components/IntroCard';
import Calendar from './components/Calendar';
import Statistics from './components/Statistics';
import SocialBoard from './components/SocialBoard';
import LoginModal from './components/LoginModal';
import { Database, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 페이지 로드 시 로그인 세션 확인 및 출석 정보 로드
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user = await dbService.getCurrentUser();
        if (user && user.email && user.email.toLowerCase() === 'admin@admin.com') {
          user.name = '관리자';
        }
        setCurrentUser(user);
      } catch (err) {
        console.error('세션 확인 실패:', err);
      }
      refreshAttendance();
    };

    initializeApp();
  }, []);

  // 전체 출석 목록 갱신
  const refreshAttendance = async () => {
    const now = new Date();
    const nowYear = now.getFullYear();
    let allData = [];
    try {
      // 1월부터 12월까지 전체 출석 데이터 병합 로드
      for (let m = 1; m <= 12; m++) {
        const monthData = await dbService.getAttendance(nowYear, m);
        allData = [...allData, ...monthData];
      }
      setAttendanceList(allData);
    } catch (err) {
      console.error('출석 정보를 불러오지 못했습니다:', err);
    }
  };

  const handleLoginSuccess = (user) => {
    if (user && user.email && user.email.toLowerCase() === 'admin@admin.com') {
      user.name = '관리자';
    }
    setCurrentUser(user);
    refreshAttendance(); // 로그인에 따른 데이터 갱신
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      try {
        await dbService.signOut();
        setCurrentUser(null);
      } catch (err) {
        alert('로그아웃 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="app-container">
      {/* 소개 카드 & 로그인/아웃 */}
      <IntroCard
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        isFirebaseConfigured={isFirebaseConfigured}
      />

      {/* 왼쪽: 메인 달력 */}
      <Calendar
        currentUser={currentUser}
        attendanceList={attendanceList}
        onRefreshAttendance={refreshAttendance}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />

      {/* 오른쪽: 통계 및 담벼락 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Statistics
          currentUser={currentUser}
          attendanceList={attendanceList}
          currentDate={currentDate}
        />
        <SocialBoard
          currentUser={currentUser}
          currentDate={currentDate}
        />
      </div>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
