import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';
import { ChevronLeft, ChevronRight, Settings, Loader2 } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // Default 5 mins

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
    if (refreshInterval <= 0) return;
    
    const intervalMs = refreshInterval * 60 * 1000;
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
        <h1 className="text-4xl text-gray-500">No Announcements</h1>
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black group">
      {announcements.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out ${getTransitionClass(index, currentIndex, item.transition_type)}`}
        >
            {/\.(mp4|webm|ogg|mov)$/i.test(item.image_url) ? (
              <video 
                src={item.image_url} 
                className="max-h-full max-w-full object-contain"
                autoPlay
                muted
                loop
                playsInline
              /> 
            ) : (
              <img 
                  src={item.image_url} 
                  alt="Announcement" 
                  className="max-h-full max-w-full object-contain"
              />
            )}
        </div>
      ))}
      
      {/* Admin Button */}
      <div className="absolute top-4 right-4 z-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <a 
            href="/admin"
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
