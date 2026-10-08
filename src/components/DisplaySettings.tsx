import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement, AppSettings, Scene } from '../types';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Trash2, 
  Upload, 
  MonitorPlay, 
  X, 
  Eye, 
  Loader2,
  ImagePlus,
  Pencil,
  Check,
  UploadCloud,
  Settings,
  Save,
  ChevronDown,
  ImageOff,
  Lock,
  Unlock,
  KeyRound,
  EyeOff,
  LogOut,
  Heart,
  Github,
  PlusCircle,
  List
} from 'lucide-react';

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Skeleton } from './ui/skeleton';

// Helper component for Password Input with toggle
function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input 
        {...props} 
        type={show ? "text" : "password"} 
        className={`pr-10 ${props.className || ''}`} 
      />
      <button 
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// Helper component for editable title
function EditableTitle({ id, initialTitle, onSave }: { id: string, initialTitle: string, onSave: (id: string, newTitle: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);

  const handleSave = () => {
    if (value !== initialTitle) {
      onSave(id, value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 max-w-62.5">
        <Input 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setValue(initialTitle);
              setIsEditing(false);
            }
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group/title">
      <span className="font-semibold text-slate-900 truncate max-w-50" title={initialTitle}>
        {initialTitle || "Untitled"}
      </span>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-6 w-6 opacity-0 group-hover/title:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3 text-slate-400 hover:text-slate-600" />
      </Button>
      
    </div>
  );
}

// Helper component for editable duration
function EditableDuration({ id, initialDuration, onSave }: { id: string, initialDuration: number, onSave: (id: string, newDuration: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialDuration);

  const handleSave = () => {
    if (value !== initialDuration) {
      onSave(id, value);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input 
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-6 w-16 text-xs"
          autoFocus
          min="1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setValue(initialDuration);
              setIsEditing(false);
            }
          }}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600" onClick={handleSave}>
          <Check className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 group/duration">
      <span>Duration: {initialDuration}s</span>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-4 w-4 opacity-0 group-hover/duration:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-2.5 w-2.5 text-slate-400 hover:text-slate-600" />
      </Button>
    </div>
  );
}

// Helper component for Media Thumbnail with Loading State
function MediaThumbnail({ url, onClick }: { url: string; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
        setLoaded(true);
    }
    // For video, we rely on onLoadedData, but we can check readyState
    if (videoRef.current && videoRef.current.readyState >= 3) {
        setLoaded(true);
    }
  }, [url]);

  return (
    <div 
        className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-24 sm:w-40 cursor-pointer group"
        onClick={onClick}
    >
        {!loaded && !error && (
           <Skeleton className="absolute inset-0 h-full w-full" />
        )}
        
        {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-100 p-2 text-center">
                <ImageOff className="h-6 w-6 mb-1 opacity-50" />
                <span className="text-[10px] leading-tight">Failed to load</span>
            </div>
        ) : isVideo ? (
            <video 
                ref={videoRef}
                src={url} 
                className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                muted 
                loop 
                autoPlay 
                playsInline
                onLoadedData={() => setLoaded(true)}
                onError={() => setError(true)}
            />
        ) : (
            <img 
                ref={imgRef}
                src={url} 
                alt="Display" 
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />
        )}
        
        {loaded && !error && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
               <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100 drop-shadow-md" />
           </div>
        )}
    </div>
  );
}

interface SortableRowProps {
  item: Announcement;
  updateTitle: (id: string, newTitle: string) => void;
  updateDuration: (id: string, newDuration: number) => void;
  toggleActive: (id: string, checked: boolean) => void;
  deleteAnnouncement: (id: string, imageUrl: string) => void;
  setViewUrl: (url: string) => void;
}

function SortableAnnouncementRow({ 
  item, 
  updateTitle, 
  updateDuration, 
  toggleActive, 
  deleteAnnouncement, 
  setViewUrl
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.3 : 1,
    position: 'relative' as const,
  };

  return (
    <div 
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style} 
        className={`flex cursor-grab flex-col gap-4 rounded-lg border p-4 shadow-sm touch-none active:cursor-grabbing sm:flex-row sm:items-center ${isDragging ? 'bg-slate-50 border-blue-200' : 'bg-white'}`}
    >
        <MediaThumbnail url={item.image_url} onClick={() => setViewUrl(item.image_url)} />

        {/* Info */}
        <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
                <EditableTitle 
                    id={item.id} 
                    initialTitle={(item as any).title} 
                    onSave={updateTitle} 
                />
                <span className={`inline-flex h-2 w-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-slate-300'}`} />
            </div>
            <div className="flex flex-col gap-1 text-xs text-slate-500">
                <EditableDuration 
                    id={item.id}
                    initialDuration={item.display_duration}
                    onSave={updateDuration}
                />
                <p>Uploaded {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}</p>
            </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-2">
                <Label htmlFor={`active-${item.id}`} className="text-xs text-slate-600">
                    {item.active ? 'Active' : 'Hidden'}
                </Label>
                <Switch 
                    id={`active-${item.id}`}
                    checked={item.active}
                    onCheckedChange={(checked) => toggleActive(item.id, checked)}
                />
            </div>
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the display from your display board.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAnnouncement(item.id, item.image_url)} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}

export default function AdminPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState('');
  const [activeSceneId, setActiveSceneId] = useState('');
  const [sceneToDelete, setSceneToDelete] = useState<Scene | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ default_duration: 10, refresh_interval: 5 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  
  // Password Update State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  
  const [duration, setDuration] = useState(10);
  const [title, setTitle] = useState('');
  
  // Scroll Indicator State
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // Upload Modal State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadPreviewUrls, setUploadPreviewUrls] = useState<string[]>([]);
  const [uploadSceneId, setUploadSceneId] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // View Modal State
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const fetchAnnouncements = async () => {
    let { data: scenesData } = await supabase.from('scenes').select('*').order('created_at');
    if (scenesData && scenesData.length === 0) {
      const { data: defaultScene } = await supabase
        .from('scenes')
        .upsert({ name: 'Default' }, { onConflict: 'name' })
        .select()
        .single();
      if (defaultScene) scenesData = [defaultScene];
    }
    if (scenesData) setScenes(scenesData);

    const { data: settingsData } = await supabase
      .from('settings')
      .select('id, refresh_interval, default_duration, security_enabled, active_scene_id')
      .eq('id', 1)
      .single();
    const sceneId = selectedSceneId || settingsData?.active_scene_id || scenesData?.[0]?.id || '';
    if (settingsData) {
      setSettings(settingsData);
      setActiveSceneId(settingsData.active_scene_id || '');
      if (!selectedSceneId) setSelectedSceneId(sceneId);
    }

    let announcementsQuery = supabase
      .from('announcements')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });
    if (sceneId) announcementsQuery = announcementsQuery.eq('scene_id', sceneId);
    const { data: announcementsData } = await announcementsQuery;
    
    if (announcementsData) setAnnouncements(announcementsData);
    
    // Check if password is set
    const { data: hasPass } = await supabase.rpc('is_password_set');
    setIsPasswordSet(!!hasPass);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
        // Prepare payload, only include password if it is not empty
        const payload: any = { 
            id: 1, 
            refresh_interval: settings.refresh_interval, 
            default_duration: settings.default_duration,
            security_enabled: settings.security_enabled
        };

        // Standard save doesn't handle password changes anymore (handled by dedicated function)
        
        const { error } = await supabase
            .from('settings')
            .upsert(payload);
            
        if (error) throw error;
        toast.success('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        toast.error('Failed to save settings');
    } finally {
        setSavingSettings(false);
    }
  };

  const handleToggleSecurity = async (checked: boolean) => {
    if (checked) {
        // Turning ON
        if (isPasswordSet) {
             setSettings(prev => ({ ...prev, security_enabled: true }));
             // Optimistically notify user or wait for explicit save?
             // Since we're not saving to DB immediately in this specific function (saveSettings is separate),
             // showing a toast might be misleading if they don't click saved.
             // HOWEVER, the previous implementation implied we just set state.
             // User asked for "button have toast". The switch is a button.
             // Let's add a small toast that says "Remember to save".
             toast("Password protection enabled. Click Save to apply.", { icon: '🔒' });
        } else {
            // No password set, show modal
            setShowSetupModal(true);
            return; // Don't set state yet
        }
    } else {
        // Turning OFF - allow
        setSettings(prev => ({ ...prev, security_enabled: false }));
        toast("Password protection disabled. Click Save to apply.", { icon: '🔓' });
    }
  };

  const handleSetupPassword = async () => {
    if (setupPassword.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
    }
    if (setupPassword !== setupConfirm) {
        toast.error("Passwords do not match");
        return;
    }
    if (!setupPassword) return;

    setSavingSettings(true);
    try {
        const { data: created, error } = await supabase
            .rpc('setup_admin_password', { new_password: setupPassword });

        if (error) throw error;
        if (!created) throw new Error('Password setup failed');

        const { error: settingsError } = await supabase
            .from('settings')
            .update({ security_enabled: true })
            .eq('id', 1);
        if (settingsError) throw settingsError;

        toast.success("Security enabled and password set");
        setSettings(prev => ({ ...prev, security_enabled: true }));
        setIsPasswordSet(true);
        setShowSetupModal(false);
        setSetupPassword('');
        setSetupConfirm('');
    } catch (error) {
        console.error('Setup error', error);
        toast.error("Failed to setup security");
    } finally {
        setSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        return;
    }
    if (!oldPassword || !newPassword) {
        toast.error("All fields are required");
        return;
    }

    setChangingPassword(true);
    try {
        const { data: success, error } = await supabase
            .rpc('change_admin_password', { 
                current_password: oldPassword, 
                new_password: newPassword 
            });

        if (error) throw error;

        if (success) {
            toast.success("Password updated successfully");
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            toast.error("Incorrect old password");
        }
    } catch (error) {
        console.error('Change password error', error);
        toast.error("Failed to update password");
    } finally {
        setChangingPassword(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedSceneId]);

  // Update scroll indicator when announcements change
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCanScrollDown(!entry.isIntersecting);
      },
      { threshold: 1.0 }
    );

    if (scrollSentinelRef.current) {
      observer.observe(scrollSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [announcements]);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      uploadPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadPreviewUrls]);

  const MAX_UPLOAD_FILES = 20;
  const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp']);
  const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|bmp)$/i;
  const isStaticImage = (file: File) => SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase()) && SUPPORTED_IMAGE_EXTENSIONS.test(file.name);

  const processFiles = (incomingFiles: File[]) => {
    const rejected = incomingFiles.filter((file) => !isStaticImage(file));
    const accepted = incomingFiles.filter(isStaticImage).slice(0, MAX_UPLOAD_FILES);
    if (rejected.length > 0) toast.error('Only static JPG, PNG, WebP, AVIF, and BMP images are supported. GIFs, videos, and animated media are rejected.');
    if (incomingFiles.length > MAX_UPLOAD_FILES) toast.error(`Only the first ${MAX_UPLOAD_FILES} valid images were selected.`);
    if (accepted.length === 0) return;
    setUploadSceneId(selectedSceneId);
    setSelectedFiles(accepted);
    setUploadPreviewUrls(accepted.map((file) => URL.createObjectURL(file)));
    if (!title && accepted.length === 1) setTitle(accepted[0].name.replace(/\.[^.]+$/, ''));
  };

  const activateScene = async (sceneId: string) => {
    const { count, error: countError } = await supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('scene_id', sceneId)
      .eq('active', true);
    if (countError) {
      toast.error('Could not check this scene. Please try again.');
      return;
    }
    if (!count) {
      toast.error('This scene has no active images. Add an image before putting it live.');
      return;
    }

    const { error } = await supabase.rpc('activate_scene', { target_scene_id: sceneId });
    if (error) {
      toast.error(error.message || 'Scene must contain an active image');
      return;
    }
    setActiveSceneId(sceneId);
    toast.success('Scene is now live on the display');
    fetchAnnouncements();
  };

  const toggleSceneLive = async (checked: boolean) => {
    if (checked) {
      await activateScene(selectedSceneId);
      return;
    }

    const { error } = await supabase
      .from('settings')
      .update({ active_scene_id: null })
      .eq('id', 1);
    if (error) {
      toast.error('Could not take the scene off the display');
      return;
    }
    setActiveSceneId('');
    toast.success('Scene removed from the display');
  };

  const createScene = async () => {
    const name = `Scene ${scenes.length + 1}`;
    const { data, error } = await supabase.from('scenes').insert({ name }).select().single();
    if (error) {
      toast.error(error.message || 'Could not create scene');
      return;
    }
    setScenes((current) => [...current, data]);
    setSelectedSceneId(data.id);
    toast.success(`Scene “${name}” created`);
  };

  const deleteScene = async (scene: Scene) => {
    const { data: sceneAnnouncements, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('scene_id', scene.id);
    if (announcementsError) {
      toast.error('Could not prepare the scene for deletion');
      return;
    }

    if (activeSceneId === scene.id) {
      const defaultScene = scenes.find((candidate) => candidate.name === 'Default');
      if (!defaultScene) {
        toast.error('The Default scene must remain available before deleting the live scene');
        return;
      }
      const { error: activationError } = await supabase
        .from('settings')
        .update({ active_scene_id: defaultScene.id })
        .eq('id', 1);
      if (activationError) {
        toast.error('Could not switch the display back to Default');
        return;
      }
      setActiveSceneId(defaultScene.id);
    }

    const { error } = await supabase.from('scenes').delete().eq('id', scene.id);
    if (error) {
      toast.error(error.message || 'Could not delete scene');
      return;
    }

    const deletedAnnouncements = sceneAnnouncements || [];
    const storagePaths = deletedAnnouncements
      .map((item) => item.image_url.split('/').pop())
      .filter((path): path is string => Boolean(path));
    const restore = async () => {
      const { error: sceneError } = await supabase.from('scenes').insert(scene);
      if (sceneError) throw sceneError;
      if (deletedAnnouncements.length > 0) {
        const { error: restoreError } = await supabase.from('announcements').insert(deletedAnnouncements);
        if (restoreError) throw restoreError;
      }
      setScenes((current) => [...current, scene].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setSelectedSceneId(scene.id);
      toast.success('Scene restored');
    };

    if (selectedSceneId === scene.id) {
      const nextScene = scenes.find((candidate) => candidate.id !== scene.id);
      if (nextScene) setSelectedSceneId(nextScene.id);
    }
    setScenes((current) => current.filter((candidate) => candidate.id !== scene.id));

    let undoTimer: ReturnType<typeof setTimeout>;
    const undoToast = toast.custom((t) => (
      <div className={`pointer-events-auto w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ${t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'animate-out fade-out'}`}>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-medium text-slate-800">“{scene.name}” deleted</span>
          <button
            type="button"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            onClick={async () => {
              clearTimeout(undoTimer);
              toast.dismiss(t.id);
              try {
                await restore();
              } catch {
                toast.error('Could not restore the scene');
              }
            }}
          >Undo</button>
        </div>
        <div className="h-1 origin-left bg-blue-500" style={{ animation: 'scene-delete-progress 8s linear forwards' }} />
      </div>
    ), { duration: 8000 });
    undoTimer = setTimeout(async () => {
      if (storagePaths.length > 0) await supabase.storage.from('announcements').remove(storagePaths);
      toast.dismiss(undoToast);
    }, 8000);
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFiles(Array.from(event.target.files));
      event.target.value = ''; 
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const cancelUpload = () => {
    if (selectedFiles.length > 0) {
        toast('Upload cancelled', { icon: '🚫' });
    }
    setSelectedFiles([]);
    setUploadPreviewUrls([]);
    setUploadSceneId('');
    setTitle('');
  };

  const confirmUpload = async () => {
    if (selectedFiles.length === 0 || !uploadSceneId) {
      toast.error('Select a scene before uploading images');
      return;
    }

    const loadingToast = toast.loading('Uploading media...');
    const uploadedPaths: string[] = [];

    try {
      setUploading(true);
      const records: Array<{ image_url: string; title: string; display_duration: number; active: boolean; scene_id: string }> = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop()!.toLowerCase();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('announcements').upload(filePath, file, {
          cacheControl: '31536000', upsert: false, contentType: file.type,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(filePath);
        const { data: { publicUrl } } = supabase.storage.from('announcements').getPublicUrl(filePath);
        records.push({ image_url: publicUrl, title: title || file.name.replace(/\.[^.]+$/, ''), display_duration: duration, active: true, scene_id: uploadSceneId });
      }

      const { error: dbError } = await supabase.from('announcements').insert(records);

      if (dbError) {
        throw dbError;
      }
      
      toast.success(`${records.length} image${records.length === 1 ? '' : 's'} uploaded successfully!`);
      fetchAnnouncements(); // Refresh list
      cancelUpload(); // Close modal
    } catch (error: any) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('announcements').remove(uploadedPaths);
      }
      console.error(error);
      toast.error(error.message || 'Error uploading display');
    } finally {
      setUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const updateTitle = async (id: string, newTitle: string) => {
    const { error } = await supabase
      .from('announcements')
      .update({ title: newTitle })
      .eq('id', id);
      
    if (error) {
      toast.error('Failed to update title');
    } else {
      toast.success('Title updated');
      fetchAnnouncements();
    }
  };

  const updateDuration = async (id: string, newDuration: number) => {
    const { error } = await supabase
      .from('announcements')
      .update({ display_duration: newDuration })
      .eq('id', id);
      
    if (error) {
      toast.error('Failed to update duration');
    } else {
      toast.success('Duration updated');
      fetchAnnouncements();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAnnouncements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        void saveOrder(reordered);
        return reordered;
      });
    }
  };

  const saveOrder = async (items: Announcement[]) => {
    setSavingOrder(true);
    try {
        // Must include all required fields for upsert to work (Postgres requirement for INSERT path)
        const updates = items.map((item, idx) => ({
            ...item,
            order_index: idx + 1,
        }));

        const { error } = await supabase
            .from('announcements')
            .upsert(
                updates,
                { onConflict: 'id', ignoreDuplicates: false } 
            )
            .select();

        if (error) throw error;
        // The local order is already canonical after the successful write.
    } catch (error) {
        console.error('Error saving order:', error);
        toast.error('Failed to save order');
    } finally {
        setSavingOrder(false);
    }
  };

  const toggleActive = async (id: string, newCheckedState: boolean) => {
    // Find item for better toast message
    const item = announcements.find(a => a.id === id);
    const title = item ? `"${item.title}"` : 'Display';

    // Optimistic UI update could be added here, but for now we wait for server
    const { error } = await supabase
      .from('announcements')
      .update({ active: newCheckedState })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`${title} ${newCheckedState ? 'is now active' : 'is now hidden'}`);
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (id: string, imageUrl: string) => {
    // Note: Confirmation handled by UI now
    
    const deletingToast = toast.loading('Deleting display...');
    
    try {
        // 1. Delete file from Storage
        if (imageUrl) {
            // Extract filename from the public URL
            // URL format: .../storage/v1/object/public/announcements/[filename]
            const fileName = imageUrl.split('/').pop();
            
            if (fileName) {
                const { error: storageError } = await supabase.storage
                    .from('announcements')
                    .remove([fileName]);
                    
                if (storageError) {
                    console.error('Error removing file from storage:', storageError);
                    // We continue to delete the record even if file deletion fails
                    // to keep the UI consistent, though strictly we failed the "cleanup"
                }
            }
        }

        // 2. Delete record from Database
        const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

        if (error) throw error;

        toast.success('Display deleted');
        fetchAnnouncements();
    } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete display');
    } finally {
        toast.dismiss(deletingToast);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('display_board_auth');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6 lg:p-8">
        <Toaster position="top-right" />
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Display Settings</h1>
                <p className="text-slate-500">Manage the content displayed on your display system.</p>
            </div>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to log out? You will need to enter the password again to access the settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" asChild>
                <a href="/">
                <MonitorPlay className="mr-2 h-4 w-4" />
                View Display Board
                </a>
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Upload & Settings */}
            <div className="min-w-0 lg:col-span-1 flex flex-col gap-6 lg:h-[calc(100vh-12rem)]">
                <Card className="shrink-0">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" />
                            Add New Media
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <div 
                                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="flex flex-col items-center justify-center space-y-1 text-center">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 mb-1">
                                        {isDragging ? (
                                            <UploadCloud className="h-5 w-5 text-blue-500" />
                                        ) : (
                                            <ImagePlus className="h-5 w-5 text-slate-400" />
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-700">
                                        {isDragging ? 'Drop images here' : 'Click to Upload Images'}
                                    </p>
                                </div>
                                <Input
                                    id="image"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.avif,.bmp"
                                    multiple
                                    onChange={onFileSelect}
                                    disabled={uploading}
                                    className="absolute inset-0 cursor-pointer opacity-0 h-full w-full"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Configuration Card (Tabbed) */}
                <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="pb-3 shrink-0">
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Configuration
                        </CardTitle>
                        <CardDescription>Manage system settings and security.</CardDescription>
                    </CardHeader>
                    <ScrollArea className="min-h-0 flex-1">
                        <CardContent className="space-y-4 p-6 pt-0">
                        {/* Tabs Navigation */}
                        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                             <button
                                onClick={() => setActiveTab('general')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                    activeTab === 'general' 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                             >
                                <div className="flex items-center justify-center gap-2">
                                    <Settings className="h-3.5 w-3.5" />
                                    General
                                </div>
                             </button>
                             <button
                                onClick={() => setActiveTab('security')}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                                    activeTab === 'security' 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                                }`}
                             >
                                <div className="flex items-center justify-center gap-2">
                                    {settings.security_enabled ? <Lock className="h-3.5 w-3.5 text-green-600" /> : <Unlock className="h-3.5 w-3.5" />}
                                    Security
                                </div>
                             </button>
                        </div>

                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-left-1 duration-200">
                                <div className="space-y-2">
                                    <Label htmlFor="refreshInterval">Refresh Interval (minutes)</Label>
                                    <Input 
                                        id="refreshInterval" 
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min="1"
                                        value={settings.refresh_interval}
                                        onChange={(e) => setSettings({...settings, refresh_interval: Number(e.target.value)})}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveSettings();
                                        }}
                                    />
                                    <p className="text-[0.8rem] text-slate-500">
                                        How often the display board checks for new content.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="defaultDuration">Default Duration (seconds)</Label>
                                    <Input 
                                        id="defaultDuration" 
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min="5"
                                        value={settings.default_duration}
                                        onChange={(e) => setSettings({...settings, default_duration: Number(e.target.value)})}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveSettings();
                                        }}
                                    />
                                    <p className="text-[0.8rem] text-slate-500">
                                        Default time for new uploads (can be overridden).
                                    </p>
                                </div>

                                <Button 
                                    className="w-full" 
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                >
                                    {savingSettings ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Settings
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-1 duration-200">
                                <div className="flex items-center justify-between space-x-2 rounded-md border p-3 shadow-sm bg-slate-50">
                                    <Label htmlFor="security-mode" className="flex flex-col space-y-1">
                                        <span className="font-semibold">Password Protection</span>
                                        <span className="font-normal text-xs text-muted-foreground">Require login to view content</span>
                                    </Label>
                                    <Switch
                                        id="security-mode"
                                        checked={settings.security_enabled || false}
                                        onCheckedChange={handleToggleSecurity}
                                    />
                                </div>

                                {settings.security_enabled && (
                                    <div className="space-y-4 rounded-md border p-4 bg-white">
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <KeyRound className="h-4 w-4 text-slate-500" />
                                            <h3 className="font-medium text-sm">Update Access Password</h3>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="oldPass" className="text-xs">Old Password</Label>
                                                <PasswordInput 
                                                    id="oldPass" 
                                                    placeholder="Current Password"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="newPass" className="text-xs">New Password</Label>
                                                    <PasswordInput 
                                                        id="newPass" 
                                                        placeholder="New Password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="confirmPass" className="text-xs">Confirm</Label>
                                                    <PasswordInput 
                                                        id="confirmPass" 
                                                        placeholder="Confirm Password"
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button 
                                            className="w-full" 
                                            onClick={handleChangePassword}
                                            disabled={changingPassword}
                                            variant="secondary"
                                        >
                                            {changingPassword ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : 'Update Password'}
                                        </Button>
                                    </div>
                                )}

                                {/* Save button mainly for the toggle if not handled immediately, but good to have global save */}
                                <Button 
                                    className="w-full" 
                                    onClick={saveSettings}
                                    disabled={savingSettings}
                                >
                                    {savingSettings ? 'Saving...' : 'Save Configuration'}
                                </Button>
                            </div>
                        )}
                        </CardContent>
                    </ScrollArea>
                </Card>

                {/* Setup Password Modal */}
                {showSetupModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                        <Card className="w-full max-w-sm border-0 shadow-2xl">
                            <CardHeader>
                                <CardTitle>Set Admin Password</CardTitle>
                                <CardDescription>
                                    Password protection is enabled. Please set a password for the display board.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="setupPass">Password</Label>
                                    <PasswordInput
                                        id="setupPass"
                                        placeholder="Enter password"
                                        value={setupPassword}
                                        onChange={(e) => setSetupPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="setupConfirm">Confirm Password</Label>
                                    <PasswordInput
                                        id="setupConfirm"
                                        placeholder="Confirm password"
                                        value={setupConfirm}
                                        onChange={(e) => setSetupConfirm(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => {
                                            setShowSetupModal(false);
                                            // Revert toggle visually (state wasn't updated to true yet)
                                        }}
                                        disabled={savingSettings}
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleSetupPassword} 
                                        disabled={savingSettings} 
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Set Password
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Right Column: List */}
            <div className="min-w-0 lg:col-span-2">
                <Card className="flex min-h-[360px] h-[min(70vh,500px)] min-w-0 flex-col lg:h-[calc(100vh-12rem)]">
                    <div className="bg-slate-100 px-6 pt-2">
                        <div className="flex flex-wrap items-end gap-1 overflow-hidden" role="tablist" aria-label="Scenes">
                            {scenes.map((scene) => {
                                const isSelected = scene.id === selectedSceneId;
                                return (
                                    <button
                                        key={scene.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSelected}
                                        onClick={() => setSelectedSceneId(scene.id)}
                                        className={`group relative flex min-w-max items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                                            isSelected
                                                ? '-mb-px border-transparent bg-white text-slate-900'
                                                : 'border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800'
                                        }`}
                                    >
                                        {scene.name}
                                        {scene.name !== 'Default' && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Delete ${scene.name}`}
                                                className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSceneToDelete(scene);
                                                }}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        setSceneToDelete(scene);
                                                    }
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={createScene}
                                className="mb-1 ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                aria-label="Add scene"
                                title="Add scene"
                            >
                                <PlusCircle className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <CardHeader className="flex flex-col items-start gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="flex flex-col space-y-1.5">
                            <CardTitle className="flex items-center gap-2">
                                <List className="h-5 w-5" />
                                Manage Content
                            </CardTitle>
                            <CardDescription>
                                {announcements.length} active display{announcements.length !== 1 && 's'}
                            </CardDescription>
                        </div>
                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5">
                                <Label htmlFor="scene-live-toggle" className="text-xs font-medium text-slate-600">
                                    Live on display
                                </Label>
                                <Switch
                                    id="scene-live-toggle"
                                    checked={activeSceneId === selectedSceneId}
                                    onCheckedChange={toggleSceneLive}
                                    aria-label="Show selected scene on display"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="relative min-h-0 flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full p-6">
                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={announcements.map(a => a.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4">
                                        {announcements.map((item, index) => (
                                            <SortableAnnouncementRow 
                                                key={item.id}
                                                item={item}
                                                updateTitle={updateTitle}
                                                updateDuration={updateDuration}
                                                toggleActive={toggleActive}
                                                deleteAnnouncement={deleteAnnouncement}
                                                setViewUrl={setViewUrl}
                                            />
                                        ))}

                                        {announcements.length === 0 && (
                                            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-slate-400">
                                                <p className="text-sm">No displays found</p>
                                            </div>
                                        )}
                                        
                                        {/* Scroll Sentinel */}
                                        <div ref={scrollSentinelRef} className="h-px w-full" />
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </ScrollArea>
                        
                        {/* Scroll Indicator Overlay */}
                        {canScrollDown && announcements.length > 0 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                                <div className="flex items-center gap-2 rounded-full bg-slate-900/10 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm animate-pulse border border-slate-200/50">
                                    More below <ChevronDown className="h-3 w-3" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
        </div>

        <div className="mt-8 flex w-full justify-center py-2 lg:fixed lg:bottom-6 lg:right-6 lg:mt-0 lg:w-auto lg:py-0 lg:justify-end items-center gap-2 text-xs text-slate-400 z-40 lg:pointer-events-none">
            <div className="flex items-center gap-1 group select-none pointer-events-auto">
                Made with <Heart className="h-3 w-3 text-slate-400 group-hover:fill-red-500 group-hover:text-red-500 transition-colors" /> by <span className="font-medium text-slate-500">Karl</span>
            </div>
            <div className="h-3 w-px bg-slate-200 mx-1"></div>
            <a 
                href="https://github.com/ItzMeKarlix/" 
                target="_blank" 
                rel="noreferrer"
                className="hover:text-slate-600 transition-colors pointer-events-auto"
                title="Only Karl"
            >
                <Github className="h-4 w-4" />
            </a>
        </div>

        <AlertDialog open={Boolean(sceneToDelete)} onOpenChange={(open) => !open && setSceneToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{sceneToDelete?.name}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This removes the scene and its images from the content list. You will have 8 seconds to undo this action.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setSceneToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={async () => {
                            if (sceneToDelete) await deleteScene(sceneToDelete);
                            setSceneToDelete(null);
                        }}
                    >
                        Delete Scene
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Upload Confirmation Modal */}
        {selectedFiles.length > 0 && uploadPreviewUrls.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg border-0 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Confirm Upload ({selectedFiles.length} images)</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">
                    Adding to {scenes.find((scene) => scene.id === uploadSceneId)?.name || 'selected scene'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                    <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded-md bg-slate-100 p-2 sm:grid-cols-3">
                     {uploadPreviewUrls.map((url, index) => (
                       <div key={url} className="aspect-video overflow-hidden rounded bg-white">
                         <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-contain" />
                       </div>
                     ))}
                  </div>
                  
                  <div className="grid gap-4 text-sm">
                     <div className="space-y-1.5">
                        <Label htmlFor="title">Title (Optional)</Label>
                        <Input
                            id="title"
                            type="text"
                            placeholder="Enter display name"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmUpload();
                            }}
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="duration">Display Duration (seconds)</Label>
                        <Input
                            id="duration"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            min="1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmUpload();
                            }}
                        />
                     </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={cancelUpload} disabled={uploading}>
                      Cancel
                    </Button>
                    <Button onClick={confirmUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                      {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {uploading ? 'Uploading...' : 'Confirm Upload'}
                    </Button>
                  </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full View Modal */}
        {viewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setViewUrl(null)}>
            <Button 
                variant="ghost" 
                size="icon"
                className="absolute right-4 top-4 text-white hover:bg-white/20"
                onClick={() => setViewUrl(null)}
            >
                <X className="h-6 w-6" />
            </Button>
            
            <div className="relative max-h-screen w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
               {/\.(mp4|webm|ogg|mov)$/i.test(viewUrl) ? (
                  <video src={viewUrl} controls autoPlay className="h-full w-full rounded-lg shadow-2xl" />
               ) : (
                  <img src={viewUrl} alt="Full view" className="h-full w-full object-contain rounded-lg shadow-2xl" />
               )}
            </div>
          </div>
        )}

      </div>
  );
}
