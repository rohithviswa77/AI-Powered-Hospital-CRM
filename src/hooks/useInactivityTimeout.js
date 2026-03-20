import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to manage user session inactivity.
 * @param {number} timeoutMS Total milliseconds before logging out.
 * @param {number} warningMS Milliseconds before timeout to show the warning.
 * @param {Function} onLogout Callback function executed when timeout is reached.
 */
export const useInactivityTimeout = (timeoutMS = 30 * 60 * 1000, warningMS = 60 * 1000, onLogout) => {
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState(warningMS / 1000);
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isWarningActiveRef = useRef(isWarningActive);

  // Keep the ref strictly in sync with the state
  useEffect(() => {
    isWarningActiveRef.current = isWarningActive;
  }, [isWarningActive]);

  // Clear all existing timers
  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  // Main logic to log the user out
  const triggerLogout = useCallback(() => {
    clearAllTimers();
    setIsWarningActive(false);
    if (onLogout && typeof onLogout === 'function') {
      onLogout();
    }
  }, [clearAllTimers, onLogout]);

  // Logic to show warning and start the visible countdown
  const triggerWarning = useCallback(() => {
    setIsWarningActive(true);
    setRemainingTime(warningMS / 1000);

    // Update countdown every second
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningMS]);

  // Reset the session timers
  const resetSession = useCallback(() => {
    clearAllTimers();
    setIsWarningActive(false);
    setRemainingTime(warningMS / 1000);

    // Start warning timer
    warningRef.current = setTimeout(triggerWarning, timeoutMS - warningMS);

    // Start ultimate logout timer
    timeoutRef.current = setTimeout(triggerLogout, timeoutMS);
  }, [clearAllTimers, triggerWarning, triggerLogout, timeoutMS, warningMS]);

  useEffect(() => {
    // List of events that characterize "activity"
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Only set up listeners and timers if we have an active session to monitor
    // Any activity (mousemove, keydown, click) will reset the session and hide the modal
    const handleActivity = () => {
      resetSession();
    };

    // Attach listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Start initial timers explicitly
    resetSession();

    // Cleanup on unmount
    return () => {
      clearAllTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetSession, clearAllTimers]); // Removed isWarningActive so it doesn't loop


  // Manual reset function exposed to close the warning modal
  const handleStayLoggedIn = () => {
    resetSession();
  };

  return {
    isWarningActive,
    remainingTime,
    handleStayLoggedIn
  };
};
