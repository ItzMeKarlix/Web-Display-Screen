export interface Announcement {
  id: string;
  image_url: string;
  title: string;
  display_duration: number; // in seconds
  transition_type: 'fade' | 'slide' | 'none';
  active: boolean;
  order_index: number;
  created_at: string;
  scene_id?: string;
}

export interface Scene {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id?: number;
  default_duration: number; // in seconds
  refresh_interval: number; // in minutes
  security_enabled?: boolean;
  admin_password?: string; // Only used when updating
  active_scene_id?: string;
}
// Wake Lock API types
export interface WakeLockSentinel {
  release(): Promise<void>;
}

declare global {
  interface Navigator {
    wakeLock?: {
      request(type: 'screen' | 'system'): Promise<WakeLockSentinel>;
    };
  }
}
