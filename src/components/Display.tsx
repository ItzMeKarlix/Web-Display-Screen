import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';
import { ChevronLeft, ChevronRight, Settings, Loader2 } from 'lucide-react';

const AnnouncementMedia = ({ 
  item, 
  isActive, 
  shouldLoad 
}: { 
  item: Announcement; 
  isActive: boolean; 
  shouldLoad: boolean 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(item.image_url);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.debug("Auto-play prevented", error);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  if (!shouldLoad) return null;

  if (isVideo) {
    return (
      <video 
        ref={videoRef}
        src={item.image_url} 
        className="max-h-full max-w-full object-contain"
        muted
        loop
        playsInline
      /> 
    );
  }

  return (
    <img 
      src={item.image_url} 
      alt="Announcement" 
      className="max-h-full max-w-full object-contain"
    />
  );
};

export default function Display() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // Default 5 mins
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Keep TV awake - combines screen wake lock API + periodic input simulation + hidden audio
  useEffect(() => {
    // Create and play hidden audio to prevent sleep
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioOscillator = audioContext.createOscillator();
    const audioGain = audioContext.createGain();
    audioOscillator.connect(audioGain);
    audioGain.connect(audioContext.destination);
    audioGain.gain.value = 0; // Silent (mute)
    audioOscillator.frequency.value = 250;
    audioOscillator.start();

    // Request wake lock for modern browsers
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');
        }
      } catch (err) {
        console.log('Wake Lock not available, using fallback methods');
      }
    };

    requestWakeLock();

    // Re-acquire wake lock if visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        wakeLockRef.current?.release();
        wakeLockRef.current = null;
      } else {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Aggressive keep-alive: every 10 seconds instead of 30
    const keepAliveInterval = setInterval(() => {
      // Simulate mouse movement
      document.body.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: Math.random() * 10,
        clientY: Math.random() * 10
      }));
      
      // Simulate keyboard press (Shift key - non-intrusive)
      document.body.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Shift',
        code: 'ShiftLeft',
        bubbles: true
      }));
      
      // Simulate focus
      document.body.focus();
    }, 10000);

    return () => {
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLockRef.current?.release();
      audioOscillator.stop();
    };
  }, []);

  // Fetch data
  const fetchAnnouncements = async () => {
    // 1. Fetch announcements
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }

    // 2. Fetch settings
    const { data: settings } = await supabase
        .from('settings')
        .select('refresh_interval')
        .single();
    
    if (settings) {
        setRefreshInterval(settings.refresh_interval);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Poll for updates
  useEffect(() => {
    // Safety check: Ensure interval is at least 1 minute
    const safeInterval = Math.max(1, refreshInterval); 
    const intervalMs = safeInterval * 60 * 1000;
    
    const pollInterval = setInterval(fetchAnnouncements, intervalMs);
    return () => clearInterval(pollInterval);
  }, [refreshInterval]);

  // Cycle logic
  useEffect(() => {
    if (announcements.length <= 1) return;

    const currentAnnouncement = announcements[currentIndex];
    const duration = (currentAnnouncement?.display_duration || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, announcements]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <Loader2 className="h-10 w-10 animate-spin text-white/50" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <h1 className="text-4xl text-gray-500">No Displays</h1>
      </div>
    );
  }

  const currentItem = announcements[currentIndex];

  const getTransitionClass = (index: number, currentIdx: number, type: 'fade' | 'slide' | 'none') => {
    const isActive = index === currentIdx;
    
    if (type === 'none') {
        return isActive ? 'opacity-100' : 'opacity-0 hidden';
    }
    
    if (type === 'slide') {
        // Simple slide logic: Active slides in, others hide. 
        // For a proper carousel sliding out, we need prev/next logic, 
        // but for now let's just do a translate transformation.
        return isActive 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0';
    }

    // Default to fade
    return isActive ? 'opacity-100' : 'opacity-0';
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const isItemLoaded = (index: number) => {
      // Always load if there are few items
      if (announcements.length <= 1) return true;
      
      const len = announcements.length;
      // Load current, next (buffer), and prev (for transitions)
      const isCurrent = index === currentIndex;
      const isNext = index === (currentIndex + 1) % len;
      // Calculate previous correctly with modulo
      const isPrev = index === (currentIndex - 1 + len) % len;
      
      return isCurrent || isNext || isPrev;
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black group">
      {/* Invisible background video - keeps LG TV awake during display mode */}
      <video 
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
      >
        <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc2FjLW1wNDEAAAAIZnJlZQAAAuhtZGF0AAACrwYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLWNvZGVjIGxpYnMveDI2NC5zbyBjb3B5bGVmdD0wIGNhY2EtbGV2ZWw9MjggcHJlZmlsdGVyPTAgYW9xPTAgcHQ9MCBkZXEtY29sb3JzcGFjZT0wIGhpZXIteD0wIGhpZXItaT0wIGl1cD0wIGFzcGVjdC1yYXRpbz0xIHJhc3VwLW1vZGU9MCBjdXRldnBzPTAgcmE9cyBzc3ItZHk9MCBzcz0wIGItcHlyYW1pZD0wIGNoYXJtYT0wIHJjZ2xvd3A9MCByY2cwPTAgYm93eT0xIGNvYmF0YT0wIGNvZXZjPTAgY2c9MCBjdHJsPTAgc2xpY2VzPTAgb3B0aW1pemVtdj0wIHJlZj0zIGZiPTAgY2F2bGMtY29tcGxpYW50PSBsYXN0LW1idHM9MCBzcHM9MCB2ZWlpPTAgdGlkLXBvY2s9MCBvcGVuZ29wPTAgZGVibG9jaz0wOjAgZGlzdHJ5c3RlPTAgZGVibG9jaz0wOjAgbXRyYT1mYWxzZSBub2pkPjAgbG9va2FoZWFkLWF0cmFzcz1mYWxzZSBzbGljZXM9IDEgc2xpY2VfbWF4X3NpemU9MCBzbGljZV9tYXhfbXVhPTAgc3BsaXRfbWluX2J0bD0gZGlzcF9sZXZlbD0gZGlzcF9kZWxvYXNzPTAgdGFnZWQtY2FzZT0wIHY0X21lPTAgYXBlLWJ5LXBvYT1mYWxzZSBjdXRldnBzPTAgY3JhZnQ9MCBjcmFmdF9taW49IDAgY3JhZnRfbWF4PSAwIGNvZGluZ3RyZWU9IGN0dD0wIHRvb2xzPSBjaGVja3BvaW50PTAgaHdzPSBzbW9vdGhfZXc9IDAgYWhzLWFsd2F5cz0wIHN0aXRjaD0wIGFzeW09MCBhdmctY3Bncy1yYXRlPWZhbHNlIGhtb2NvcT0wIGx1bWE9MCBsb29rYWhlYWR9IGhtPTAgYXJjPTAgc3RzZHQ9IDAgYmlkPTAgYnJmdD0wIGdvb3A9MCBzdGFydHI9IDAgbWluYXRyPTAgbW9zaW49IDAgc2FkPTAgcGd4PSAwIHRzZz0wIHdhZm9ybT0wIHdweT0wIGNodz0gYXE9IDE6MSBZCG09Ig0BDAIgLCAiOiIsCnl1dmogZXhjZXNzIHhkYXRhAAB3BQGsj+Q=" type="video/mp4" />
      </video>

      {announcements.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out ${getTransitionClass(index, currentIndex, item.transition_type)}`}
        >
            <AnnouncementMedia 
              item={item} 
              isActive={index === currentIndex} 
              shouldLoad={isItemLoaded(index)}
            />
        </div>
      ))}
      
      {/* Admin Button */}
      <div className="absolute top-4 right-4 z-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <a 
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white hover:scale-110"
            title="Go to Admin Panel"
        >
            <Settings className="h-5 w-5" />
        </a>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-10 left-0 right-0 z-50 flex items-center justify-center gap-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <button 
            onClick={handlePrev}
            className="rounded-full bg-black/30 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white hover:scale-110"
        >
            <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex gap-2">
            {announcements.map((_, idx) => (
            <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/30 hover:bg-white/50'}`}
            />
            ))}
        </div>

        <button 
            onClick={handleNext}
            className="rounded-full bg-black/30 p-2 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white hover:scale-110"
        >
            <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
