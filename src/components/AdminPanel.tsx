import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Announcement } from '../types';

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
      
      alert('Upload successful!');
      fetchAnnouncements();
      cancelUpload(); // Close modal
    } catch (error: any) {
      alert('Error uploading document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ active: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchAnnouncements();
  };

  const deleteAnnouncement = async (id: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;

    // Try to extract filename from URL for cleanup (optional validation)
    // const fileName = imageUrl.split('/').pop();

    // Delete record
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (!error) fetchAnnouncements();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Announcement Admin</h1>
          <a href="/" className="text-blue-500 hover:underline">View Display Board &rarr;</a>
        </header>

        {/* Upload Section */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Add New Announcement</h2>
          <div className="flex items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Display Duration (seconds)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-32 rounded border border-gray-300 p-2"
                min="1"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Media File (Image or Video)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={onFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Upload Confirmation Modal */}
        {selectedFile && uploadPreviewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-bold">Preview Upload</h2>
              
              <div className="mb-6 flex max-h-[60vh] items-center justify-center bg-gray-100 p-2">
                 {selectedFile.type.startsWith('video/') ? (
                    <video src={uploadPreviewUrl} controls className="max-h-full max-w-full" />
                 ) : (
                    <img src={uploadPreviewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                 )}
              </div>
              
              <div className="mb-4">
                 <p className="text-sm text-gray-600">File: <span className="font-semibold">{selectedFile.name}</span></p>
                 <p className="text-sm text-gray-600">Duration: <span className="font-semibold">{duration} seconds</span></p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelUpload}
                  className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpload}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setViewUrl(null)}>
            <div className="relative max-h-screen max-w-screen-xl" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setViewUrl(null)}
                className="absolute -right-4 -top-4 rounded-full bg-white p-2 text-black shadow hover:bg-gray-200"
              >
                ✕
              </button>
               {/\.(mp4|webm|ogg|mov)$/i.test(viewUrl) ? (
                  <video src={viewUrl} controls autoPlay className="max-h-[85vh] max-w-full rounded shadow-lg" />
               ) : (
                  <img src={viewUrl} alt="Full view" className="max-h-[85vh] max-w-full rounded shadow-lg" />
               )}
            </div>
          </div>
        )}

        {/* List Section */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Manage Announcements</h2>
          <div className="space-y-4">
            {announcements.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0">
                <div 
                  className="h-24 w-32 flex-shrink-0 cursor-pointer overflow-hidden bg-gray-200"
                  onClick={() => setViewUrl(item.image_url)}
                  title="Click to view full size"
                >
                  {/\.(mp4|webm|ogg|mov)$/i.test(item.image_url) ? (
                    <video src={item.image_url} className="h-full w-full object-cover" muted loop autoPlay />
                  ) : (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover transition-transform hover:scale-110" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Duration: {item.display_duration}s</p>
                  <p className="text-xs text-gray-400">Created: {new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(item.id, item.active)}
                    className={`rounded px-3 py-1 text-sm font-medium ${
                      item.active 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                  >
                    {item.active ? 'Active' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(item.id, item.image_url)}
                    className="rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-gray-500">No announcements found.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
