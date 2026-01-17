import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    
    // Poll for updates every 5 minutes
    const pollInterval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(pollInterval);
  }, []);

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
    return <div className="flex h-screen w-full items-center justify-center bg-black text-white">Loading...</div>;
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
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
      
      {/* Optional: Progress bar or indicator */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-2">
        {announcements.map((_, idx) => (
           <div 
             key={idx}
             className={`h-2 w-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-gray-700'}`}
           />
        ))}
      </div>
    </div>
  );
}
