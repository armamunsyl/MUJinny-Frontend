import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useUser() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const token = await firebaseUser.getIdToken();
                    // In a production app, we might want a GET /api/auth/me instead of relying solely on the POST sync overhead,
                    // but since POST /sync handles both creation and tracking lastActive, it serves nicely as a unified entry fetcher as well.
                    // For the sake of purely pulling the profile without bumping lastActive, a dedicated route is better, but here we can just use the provided architecture.
                    // Assuming the syncUser POST route returns the full DB object.
                    const response = await fetch(`${API_URL}/api/auth/sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        // We pass empty object because we aren't mutating user data on fetch, just demanding the DB object
                        body: JSON.stringify({})
                    });
                    if (response.ok) {
                        const dbUser = await response.json();
                        setUser(dbUser);
                    } else {
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading };
}
