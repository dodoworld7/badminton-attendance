import React, { useState, useEffect } from 'react';
import { dbService, isFirebaseConfigured } from './services/db';
import IntroCard from './components/IntroCard';
import Calendar from './components/Calendar';
import Statistics from './components/Statistics';
import SocialBoard from './components/SocialBoard';
import LoginModal from './components/LoginModal';
import QuickCheck from './components/QuickCheck';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isQuickCheckOpen, setIsQuickCheckOpen] = useState(false);
  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayStr());
  const [quickCheckDateStr, setQuickCheckDateStr] = useState(getTodayStr());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clubBanner, setClubBanner] = useState(null);

  const handleOpenQuickCheck = (targetDateStr) => {
    if (targetDateStr) {
      setQuickCheckDateStr(targetDateStr);
    }
    setIsQuickCheckOpen(true);
  };

  // 클럽 대표 배너 사진 초기 로드 및 모바일-웹 실시간 동기화 구독
  useEffect(() => {
    const loadBanner = async () => {
      try {
        const saved = await dbService.getClubBanner();
        if (saved) setClubBanner(saved);
      } catch (err) {
        console.error('배너 로드 실패:', err);
      }
    };
    loadBanner();

    // 모바일 ↔ 웹 실시간 사진 변경 동기화 리스너
    const unsubscribe = dbService.subscribeClubBanner((newBanner) => {
      setClubBanner(newBanner || null);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

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
        onOpenQuickCheck={() => handleOpenQuickCheck(selectedDateStr)}
        clubBanner={clubBanner}
      />

      {/* 관리자 전용 회원 관리 패널 (admin@admin.com 로그인 시에만 노출) */}
      {currentUser && (currentUser.isAdmin === true || (currentUser.email && currentUser.email.toLowerCase() === 'admin@admin.com')) && (
        <AdminPanel
          currentUser={currentUser}
          onRefreshAttendance={refreshAttendance}
          currentBanner={clubBanner}
          onBannerChange={(newBanner) => setClubBanner(newBanner)}
        />
      )}

      {/* 왼쪽: 메인 달력 */}
      <Calendar
        currentUser={currentUser}
        attendanceList={attendanceList}
        onRefreshAttendance={refreshAttendance}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        onOpenQuickCheck={handleOpenQuickCheck}
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

      {/* 빠른 출석 체크 모달 */}
      <QuickCheck
        isOpen={isQuickCheckOpen}
        onClose={() => setIsQuickCheckOpen(false)}
        onRefreshAttendance={refreshAttendance}
        attendanceList={attendanceList}
        initialDateStr={quickCheckDateStr}
        currentUser={currentUser}
      />
    </div>
  );
}
