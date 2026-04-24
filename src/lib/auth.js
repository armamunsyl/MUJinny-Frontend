import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Syncs the Firebase user with our MongoDB backend.
 */
const syncUserWithBackend = async (user, additionalData = {}) => {
    try {
        const token = await user.getIdToken();

        const response = await fetch(`${API_URL}/api/auth/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(additionalData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to sync user with backend');
        }

        return await response.json(); // Returns the MongoDB user document
    } catch (error) {
        console.error("Backend sync failed:", error.message);
        throw error;
    }
};

/**
 * Registers a new user with Firebase and syncs their profile to MongoDB.
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {Object} userData - { name, studentId, batch, sec, gender }
 */
export const registerUser = async (email, password, userData) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const backendUser = await syncUserWithBackend(userCredential.user, userData);
        return { firebaseUser: userCredential.user, dbUser: backendUser };
    } catch (error) {
        throw error;
    }
};

/**
 * Logs in an existing user with Firebase and updates their lastActive status in MongoDB.
 * 
 * @param {string} email 
 * @param {string} password 
 */
export const loginUser = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    try {
        const backendUser = await syncUserWithBackend(userCredential.user, {});
        return { firebaseUser: userCredential.user, dbUser: backendUser };
    } catch (error) {
        // If user isn't in our DB yet, still allow Firebase login to succeed
        console.warn("Backend sync failed on login:", error.message);
        return { firebaseUser: userCredential.user, dbUser: null };
    }
};
