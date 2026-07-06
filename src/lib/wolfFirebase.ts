import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA0M1IoXrVw5BWFtfNrZyTwmkZ3gjjx2zg",
  authDomain: "wolf-fd23b.firebaseapp.com",
  projectId: "wolf-fd23b",
  storageBucket: "wolf-fd23b.firebasestorage.app",
  messagingSenderId: "358763506708",
  appId: "1:358763506708:web:6abc3c832e8771dfce8b01",
  measurementId: "G-7J44KB8Y8B"
};

const wolfApp = initializeApp(firebaseConfig, "wolf-app");
export const wolfDb = getFirestore(wolfApp);

