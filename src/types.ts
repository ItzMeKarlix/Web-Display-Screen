export interface Announcement {
  id: string;
  image_url: string;
  display_duration: number; // in seconds
  transition_type: 'fade' | 'slide' | 'none';
  active: boolean;
  created_at: string;
}

export interface AppSettings {
  default_duration: number;
  refresh_interval: number; // in minutes, to check for new images
}
