import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';
import { 
  Trash2, 
  Upload, 
  MonitorPlay, 
  X, 
  Eye, 
  Loader2,
  ImagePlus
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

export default function AdminPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(10);
  
  // Upload Modal State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  // View Modal State
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  
  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAnnouncements(data);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
    };
  }, [uploadPreviewUrl]);

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setUploadPreviewUrl(URL.createObjectURL(file));
      // Reset input value to allow selecting same file again if needed
      event.target.value = ''; 
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadPreviewUrl(null);
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
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
            display_duration: duration,
            active: true 
          },
        ]);

      if (dbError) throw dbError;
      
      fetchAnnouncements(); // Refresh list
      cancelUpload(); // Close modal
    } catch (error: any) {
      alert('Error uploading document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, newCheckedState: boolean) => {
    // Optimistic UI update could be added here, but for now we wait for server
    const { error } = await supabase
      .from('announcements')
      .update({ active: newCheckedState })
      .eq('id', id);
    
    if (!error) fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    // Delete record
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (!error) fetchAnnouncements();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Announcement Admin</h1>
            <p className="text-slate-500">Manage the content displayed on your TV announcements system.</p>
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
                            <div className="relative">
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={onFileSelect}
                                    disabled={uploading}
                                    className="cursor-pointer file:cursor-pointer"
                                />
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                   <ImagePlus className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="duration">Display Duration (seconds)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                min="1"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: List */}
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Content</CardTitle>
                        <CardDescription>
                            {announcements.length} active announcement{announcements.length !== 1 && 's'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {announcements.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center bg-white shadow-sm"
                                >
                                    {/* Thumbnail */}
                                    <div 
                                        className="relative h-32 w-full shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-24 sm:w-40 cursor-pointer group"
                                        onClick={() => setViewUrl(item.image_url)}
                                    >
                                        {/\.(mp4|webm|ogg|mov)$/i.test(item.image_url) ? (
                                            <video src={item.image_url} className="h-full w-full object-cover" muted loop autoPlay />
                                        ) : (
                                            <img src={item.image_url} alt="Announcement" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                            <Eye className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100 drop-shadow-md" />
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">
                                                {item.display_duration}s duration
                                            </span>
                                            <span className={`inline-flex h-2 w-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Uploaded {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString()}
                                        </p>
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
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => deleteAnnouncement(item.id, item.image_url)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {announcements.length === 0 && (
                                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed text-slate-400">
                                    <p className="text-sm">No announcements found</p>
                                </div>
                            )}
                        </div>
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
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="space-y-1">
                        <span className="text-slate-500">File Name</span>
                        <p className="font-medium truncate" title={selectedFile.name}>{selectedFile.name}</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-slate-500">Duration</span>
                        <p className="font-medium">{duration} seconds</p>
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
    </div>
  );
}
