import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

// 환경 변수에서 Firebase 정보 추출
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 필수 설정인 apiKey가 유효한 형식인지 검사하여 온라인 모드 활성화 여부 결정
export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId
);

// Firebase 초기화 (설정이 있는 경우만)
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const db = isFirebaseConfigured ? getFirestore(app) : null;

// ==========================================
// MOCK & LOCAL STORAGE 데이터베이스 도우미
// ==========================================
const MOCK_USERS_KEY = 'badminton_users';
const MOCK_ATTENDANCE_KEY = 'badminton_attendance';
const MOCK_MESSAGES_KEY = 'badminton_messages';
const CURRENT_USER_KEY = 'badminton_current_user';

// 가상 데모용 데이터 초기 시딩
const seedMockData = () => {
  if (!localStorage.getItem(MOCK_USERS_KEY)) {
    const mockUsers = [
      { id: 'user-dohyun', email: 'dohyun@badminton.com', name: '미스터 도현', password: 'password123' },
      { id: 'user-minsu', email: 'minsu@badminton.com', name: '김민수', password: 'password123' },
      { id: 'user-suji', email: 'suji@badminton.com', name: '이수지', password: 'password123' },
      { id: 'user-jieun', email: 'jieun@badminton.com', name: '박지은', password: 'password123' },
    ];
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(mockUsers));
  }

  if (!localStorage.getItem(MOCK_ATTENDANCE_KEY)) {
    const today = new Date();
    const formatDate = (offsetDays) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const mockAttendance = [
      { id: 'att-1', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(0) },
      { id: 'att-2', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(0) },
      { id: 'att-3', user_id: 'user-suji', user_name: '이수지', attendance_date: formatDate(0) },
      { id: 'att-4', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(1) },
      { id: 'att-5', user_id: 'user-jieun', user_name: '박지은', attendance_date: formatDate(1) },
      { id: 'att-6', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(2) },
      { id: 'att-past1', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(-1) },
      { id: 'att-past2', user_id: 'user-minsu', user_name: '김민수', attendance_date: formatDate(-1) },
      { id: 'att-past3', user_id: 'user-suji', user_name: '이수지', attendance_date: formatDate(-2) },
      { id: 'att-past4', user_id: 'user-dohyun', user_name: '미스터 도현', attendance_date: formatDate(-3) },
    ];
    localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(mockAttendance));
  }

  if (!localStorage.getItem(MOCK_MESSAGES_KEY)) {
    const today = new Date().toISOString().split('T')[0];
    const mockMessages = [
      { id: 'msg-1', user_id: 'user-minsu', user_name: '김민수', message_date: today, message_text: '오늘 컨디션 최상입니다! 다들 코트에서 뵙죠 🏸', created_at: new Date().toISOString() },
      { id: 'msg-2', user_id: 'user-suji', user_name: '이수지', message_date: today, message_text: '새 라켓 들고 갑니다. 기대되네요!', created_at: new Date().toISOString() },
    ];
    localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(mockMessages));
  }
};

// 모의 데이터 시딩 실행
seedMockData();

// ==========================================
// 서비스 API 정의
// ==========================================

export const dbService = {
  // ------------------------------------------
  // 1. 회원 인증 API
  // ------------------------------------------
  async signUp(email, password, name) {
    if (isFirebaseConfigured) {
      // Firebase 회원가입
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Firebase Auth 유저 프로필 이름 정보 업데이트
      await updateProfile(userCredential.user, { displayName: name });
      
      return { 
        id: userCredential.user.uid, 
        email: userCredential.user.email, 
        name: name 
      };
    } else {
      // LocalStorage 회원가입
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      if (users.find(u => u.email === email)) {
        throw new Error('이미 등록된 이메일 주소입니다.');
      }
      const newUser = { id: `user-${Date.now()}`, email, name, password };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      
      this.saveLocalSession(newUser);
      return newUser;
    }
  },

  async signIn(email, password) {
    if (isFirebaseConfigured) {
      // Firebase 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || '사용자',
      };
    } else {
      // LocalStorage 로그인
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      this.saveLocalSession(user);
      return user;
    }
  },

  async signOut() {
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  async getCurrentUser() {
    if (isFirebaseConfigured) {
      // Firebase Auth의 현재 로그인 관찰
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            resolve({
              id: user.uid,
              email: user.email,
              name: user.displayName || '사용자'
            });
          } else {
            resolve(null);
          }
        });
      });
    } else {
      const userStr = localStorage.getItem(CURRENT_USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    }
  },

  saveLocalSession(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name
    }));
  },

  // ------------------------------------------
  // 2. 출석 체크 API
  // ------------------------------------------
  async getAttendance(year, month) {
    if (isFirebaseConfigured) {
      // Firestore에서 특정 연도/월 범위의 모든 출석 문서 로드
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`; // 안전하게 넓은 범위로 조회

      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef, 
        where('attendance_date', '>=', startDate), 
        where('attendance_date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      const attendance = [];
      querySnapshot.forEach((doc) => {
        attendance.push({ id: doc.id, ...doc.data() });
      });
      return attendance;
    } else {
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      return allAttendance.filter(item => {
        const parts = item.attendance_date.split('-');
        return parseInt(parts[0]) === year && parseInt(parts[1]) === month;
      });
    }
  },

  async toggleAttendance(dateString, isAttending, user) {
    if (!user) throw new Error('로그인이 필요합니다.');

    if (isFirebaseConfigured) {
      // 중복 체크 방지 및 심플한 삭제를 위해 문서 ID 형식을 '유저ID_날짜'로 고정
      const docId = `${user.id}_${dateString}`;
      const docRef = doc(db, 'attendance', docId);

      if (isAttending) {
        await setDoc(docRef, {
          user_id: user.id,
          user_name: user.name,
          attendance_date: dateString,
          created_at: new Date().toISOString()
        });
      } else {
        await deleteDoc(docRef);
      }
    } else {
      // LocalStorage
      const allAttendance = JSON.parse(localStorage.getItem(MOCK_ATTENDANCE_KEY) || '[]');
      
      if (isAttending) {
        if (allAttendance.some(a => a.user_id === user.id && a.attendance_date === dateString)) {
          return;
        }
        allAttendance.push({
          id: `att-${Date.now()}`,
          user_id: user.id,
          user_name: user.name,
          attendance_date: dateString
        });
      } else {
        const index = allAttendance.findIndex(a => a.user_id === user.id && a.attendance_date === dateString);
        if (index > -1) {
          allAttendance.splice(index, 1);
        }
      }
      localStorage.setItem(MOCK_ATTENDANCE_KEY, JSON.stringify(allAttendance));
    }
  },

  // ------------------------------------------
  // 3. 한마디 방명록 API
  // ------------------------------------------
  async getMessages(dateString) {
    if (isFirebaseConfigured) {
      const messagesRef = collection(db, 'social_messages');
      const q = query(
        messagesRef, 
        where('message_date', '==', dateString),
        orderBy('created_at', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      return messages;
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      return allMessages.filter(m => m.message_date === dateString);
    }
  },

  async addMessage(dateString, text, user) {
    if (!user) throw new Error('로그인이 필요합니다.');
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (isFirebaseConfigured) {
      const messageData = {
        user_id: user.id,
        user_name: user.name,
        message_date: dateString,
        message_text: trimmed,
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'social_messages'), messageData);
      return { id: docRef.id, ...messageData };
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      const newMessage = {
        id: `msg-${Date.now()}`,
        user_id: user.id,
        user_name: user.name,
        message_date: dateString,
        message_text: trimmed,
        created_at: new Date().toISOString()
      };
      allMessages.push(newMessage);
      localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(allMessages));
      return newMessage;
    }
  },

  async deleteMessage(messageId, user) {
    if (!user) throw new Error('로그인이 필요합니다.');

    if (isFirebaseConfigured) {
      const docRef = doc(db, 'social_messages', messageId);
      // 단순 편의상 클라이언트 단에서 검증하고 데이터 삭제 (보안 룰 적용을 추천)
      await deleteDoc(docRef);
    } else {
      const allMessages = JSON.parse(localStorage.getItem(MOCK_MESSAGES_KEY) || '[]');
      const index = allMessages.findIndex(m => m.id === messageId && m.user_id === user.id);
      if (index > -1) {
        allMessages.splice(index, 1);
        localStorage.setItem(MOCK_MESSAGES_KEY, JSON.stringify(allMessages));
      } else {
        throw new Error('삭제 권한이 없거나 메시지가 존재하지 않습니다.');
      }
    }
  }
};
