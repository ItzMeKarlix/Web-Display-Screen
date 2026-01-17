import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement, AppSettings } from '../types';
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
  ArrowUp,
  ArrowDown
} from 'lucide-react';

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
      <div className="flex items-center gap-2 max-w-[250px]">
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
      <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={initialTitle}>
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
          type="number"
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
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);

  return (
    <div 
        className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-24 sm:w-40 cursor-pointer group"
        onClick={onClick}
    >
        {!loaded && (
           <Skeleton className="absolute inset-0 h-full w-full" />
        )}
        
        {isVideo ? (
            <video 
                src={url} 
                className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                muted 
                loop 
                autoPlay 
                onLoadedData={() => setLoaded(true)}
            />
        ) : (
            <img 
                src={url} 
                alt="Announcement" 
                className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
            />
        )}
        
        {loaded && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
               <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100 drop-shadow-md" />
           </div>
        )}
    </div>
  );
}

export default function AdminPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ default_duration: 10, refresh_interval: 5 });
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [duration, setDuration] = useState(10);
  const [title, setTitle] = useState('');
  
  // Scroll Indicator State
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);

  // Upload Modal State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // View Modal State
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  
  const fetchAnnouncements = async () => {
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (announcementsData) setAnnouncements(announcementsData);
    
    // Also fetch settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .single();
      
    if (settingsData) {
        setSettings(settingsData);
        // Update local default if meaningful
        // setDuration(settingsData.default_duration); 
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({ id: 1, ...settings });
            
        if (error) throw error;
        toast.success('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        toast.error('Failed to save settings');
    } finally {
        setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

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
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

  const processFile = (file: File) => {
    setSelectedFile(file);
    setUploadPreviewUrl(URL.createObjectURL(file));
    if (!title) {
        setTitle(file.name.split('.').slice(0, -1).join('.'));
    }
  };

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
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
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        processFile(file);
      } else {
        toast.error('Please upload an image or video file');
      }
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadPreviewUrl(null);
    setTitle('');
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;

    const loadingToast = toast.loading('Uploading media...');

    try {
      setUploading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      // 3. Save to Database
      const { error: dbError } = await supabase
        .from('announcements')
        .insert([
          { 
            image_url: publicUrl,
            title: title || selectedFile.name,
            display_duration: duration,
            active: true 
          },
        ]);

      if (dbError) throw dbError;
      
      toast.success('Announcement uploaded successfully!');
      fetchAnnouncements(); // Refresh list
      cancelUpload(); // Close modal
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error uploading announcement');
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

  const moveAnnouncement = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === announcements.length - 1) return;

    const newAnnouncements = [...announcements];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap in UI immediately
    [newAnnouncements[index], newAnnouncements[targetIndex]] = [newAnnouncements[targetIndex], newAnnouncements[index]];
    setAnnouncements(newAnnouncements);
    setHasOrderChanges(true);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
        // Must include all required fields for upsert to work (Postgres requirement for INSERT path)
        const updates = announcements.map((item, idx) => ({
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
        toast.success("Order saved successfully");
        setHasOrderChanges(false);
        // Refresh to get canonical state
        fetchAnnouncements();
    } catch (error) {
        console.error('Error saving order:', error);
        toast.error('Failed to save order');
    } finally {
        setSavingOrder(false);
    }
  };

  const toggleActive = async (id: string, newCheckedState: boolean) => {
    // Optimistic UI update could be added here, but for now we wait for server
    const { error } = await supabase
      .from('announcements')
      .update({ active: newCheckedState })
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(newCheckedState ? 'Announcement activated' : 'Announcement hidden');
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (id: string, imageUrl: string) => {
    // Note: Confirmation handled by UI now
    
    const deletingToast = toast.loading('Deleting announcement...');
    
    // Delete record
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete announcement');
    } else {
      toast.success('Announcement deleted');
      fetchAnnouncements();
    }
    toast.dismiss(deletingToast);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Announcement Admin</h1>
            <p className="text-slate-500">Manage the content displayed on your announcements system.</p>
          </div>
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <MonitorPlay className="mr-2 h-4 w-4" />
              View Display Board
            </a>
          </Button>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column: Upload */}
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New</CardTitle>
                        <CardDescription>Upload a new image or video announcement.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="image">Media File</Label>
                            <div 
                                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                        {isDragging ? (
                                            <UploadCloud className="h-6 w-6 text-blue-500" />
                                        ) : (
                                            <ImagePlus className="h-6 w-6 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-slate-700">
                                            {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Images and Videos supported
                                        </p>
                                    </div>
                                </div>
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={onFileSelect}
                                    disabled={uploading}
                                    className="absolute inset-0 cursor-pointer opacity-0 h-full w-full"
                                />
                            </div>
                        </div>

                        <div className="grid w-full items-center gap-1.5">
                        </div>
                    </CardContent>
                </Card>

                {/* Settings Card */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            System Settings
                        </CardTitle>
                        <CardDescription>Global configuration for the display board.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="refreshInterval">Refresh Interval (minutes)</Label>
                            <Input 
                                id="refreshInterval" 
                                type="number" 
                                min="1"
                                value={settings.refresh_interval}
                                onChange={(e) => setSettings({...settings, refresh_interval: Number(e.target.value)})}
                            />
                            <p className="text-[0.8rem] text-slate-500">
                                How often the display board checks for new content.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="defaultDuration">Default Duration (seconds)</Label>
                            <Input 
                                id="defaultDuration" 
                                type="number" 
                                min="5"
                                value={settings.default_duration}
                                onChange={(e) => setSettings({...settings, default_duration: Number(e.target.value)})}
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
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: List */}
            <div className="lg:col-span-2">
                <Card className="flex flex-col h-[750px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div className="flex flex-col space-y-1.5">
                            <CardTitle>Manage Content</CardTitle>
                            <CardDescription>
                                {announcements.length} active announcement{announcements.length !== 1 && 's'}
                            </CardDescription>
                        </div>
                        {hasOrderChanges && (
                            <Button size="sm" onClick={saveOrder} disabled={savingOrder}>
                                {savingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Order
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        <ScrollArea className="h-full p-6">
                            <div className="space-y-4">
                                {announcements.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center bg-white shadow-sm"
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
                                        {/* Reorder Buttons */}
                                        <div className="flex items-center gap-1 rounded-md border bg-slate-50 p-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-slate-500 hover:bg-white hover:text-slate-900"
                                                onClick={() => moveAnnouncement(announcements.indexOf(item), 'up')}
                                                disabled={announcements.indexOf(item) === 0}
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                             <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-slate-500 hover:bg-white hover:text-slate-900"
                                                onClick={() => moveAnnouncement(announcements.indexOf(item), 'down')}
                                                disabled={announcements.indexOf(item) === announcements.length - 1}
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>

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
                                                        This action cannot be undone. This will permanently delete the announcement from your display board.
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
                            ))}

                            {announcements.length === 0 && (
                                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-slate-400">
                                    <p className="text-sm">No announcements found</p>
                                </div>
                            )}
                            
                            {/* Scroll Sentinel */}
                            <div ref={scrollSentinelRef} className="h-px w-full" />
                        </div>
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

        {/* Upload Confirmation Modal */}
        {selectedFile && uploadPreviewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg border-0 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Confirm Upload</CardTitle>
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                    <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-slate-100">
                     {selectedFile.type.startsWith('video/') ? (
                        <video src={uploadPreviewUrl} controls className="h-full w-full object-contain" />
                     ) : (
                        <img src={uploadPreviewUrl} alt="Preview" className="h-full w-full object-contain" />
                     )}
                  </div>
                  
                  <div className="grid gap-4 text-sm">
                     <div className="space-y-1.5">
                        <Label htmlFor="title">Title (Optional)</Label>
                        <Input
                            id="title"
                            type="text"
                            placeholder="Enter announcement name"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="duration">Display Duration (seconds)</Label>
                        <Input
                            id="duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            min="1"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md" onClick={() => setViewUrl(null)}>
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
