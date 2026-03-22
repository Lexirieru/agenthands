"use client"
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './Clock.module.css';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function Clock() {
  const [time, setTime] = useState({
    day: '',
    hours: '',
    minutes: '',
    seconds: ''
  });

  const prevTimeRef = useRef({ day: '', hours: '', minutes: '', seconds: '' });
  const animationKeyRef = useRef(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = DAYS[now.getDay()];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      setTime((prevTime) => {
        prevTimeRef.current = { ...prevTime };
        return { day, hours, minutes, seconds };
      });
    };

    // Update immediately
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const renderDigits = useCallback((value, prevValue, keyPrefix) => {
    if (!value) return null;
    
    return value.split('').map((digit, index) => {
      const shouldAnimate = prevValue && prevValue[index] !== digit;
      const uniqueKey = `${keyPrefix}-${index}-${digit}`;
      
      // Increment the key only if the animation is needed
      if (shouldAnimate) {
        animationKeyRef.current += 1;
      }
      
      return (
        <span 
          key={shouldAnimate ? `${uniqueKey}-${animationKeyRef.current}` : uniqueKey}
          className={`${styles.digit} ${shouldAnimate ? styles.animate : ''}`}
        >
          {digit}
        </span>
      );
    });
  }, []);

  const dayShouldAnimate = useMemo(() => 
    prevTimeRef.current.day !== time.day, 
    [time.day]
  );

  return (
    <span className={styles.clock}>
      <span 
        className={`${styles.day} ${dayShouldAnimate ? styles.animate : ''}`}
        key={`day-${time.day}`}
      >
        {time.day}
      </span>
      {renderDigits(time.hours, prevTimeRef.current.hours, 'hours')}
      <span className={styles.separator}>:</span>
      {renderDigits(time.minutes, prevTimeRef.current.minutes, 'minutes')}
      <span className={styles.separator}>:</span>
      {renderDigits(time.seconds, prevTimeRef.current.seconds, 'seconds')}
    </span>
  );
}
