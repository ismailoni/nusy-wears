'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { frameColors, lensOptions } from '@/data/products';
import { Upload, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function AddProductPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    image: '',
    video: '',
    description: '',
    material: '',
    color: '',
    defaultLensType: 'standard',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const uploadToCloudinary = async (file: File, resourceType: 'image' | 'video') => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary credentials not configured');
    }

    const formDataObj = new FormData();
    formDataObj.append('file', file);
    formDataObj.append('upload_preset', uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formDataObj,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file, 'image');
      setFormData(prev => ({ ...prev, image: uploadedUrl }));
      setImagePreview(uploadedUrl);
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file, 'video');
      setFormData(prev => ({ ...prev, video: uploadedUrl }));
      setVideoPreview(uploadedUrl);
    } catch (err) {
      console.error('Video upload error:', err);
      setError('Video upload failed');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        price: parseFloat(formData.price.toString()),
        stock: parseInt(formData.stock.toString()),
        createdAt: serverTimestamp(),
      });

      router.push('/admin/products');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b p-6 flex items-center justify-between">
        <Link href="/admin/dashboard" className="text-2xl font-bold text-blue-600">
          Add Product
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium mb-2">Product Name</Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Category</Label>
                <Input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Price (₦)</Label>
                <Input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Stock</Label>
                <Input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Material</Label>
                <Input
                  type="text"
                  required
                  value={formData.material}
                  onChange={(e) => setFormData({...formData, material: e.target.value})}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Color</Label>
                <Select value={formData.color} onValueChange={(val) => setFormData({ ...formData, color: val })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Color" />
                  </SelectTrigger>
                  <SelectContent>
                    {frameColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-2">Default Lens Type</Label>
                <Select
                  value={formData.defaultLensType}
                  onValueChange={(val) => setFormData({ ...formData, defaultLensType: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lensOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">Description</Label>
              <Textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Product Image</label>
              <div className="border-2 border-dashed rounded px-4 py-6 text-center">
                {imagePreview ? (
                  <div>
                    <Image src={imagePreview} alt="Preview" className="w-32 h-32 object-cover mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Image uploaded successfully</p>
                  </div>
                ) : null}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  className="hidden"
                  id="image-input"
                />
                <Label htmlFor="image-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {uploadingImage ? 'Uploading...' : 'Click to upload image'}
                  </p>
                </Label>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium mb-2">Product Video (Optional)</Label>
              <div className="border-2 border-dashed rounded px-4 py-6 text-center">
                {videoPreview ? (
                  <div>
                    <video src={videoPreview} className="w-32 h-32 object-cover mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Video uploaded successfully</p>
                  </div>
                ) : null}
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  disabled={uploadingVideo}
                  className="hidden"
                  id="video-input"
                />
                <Label htmlFor="video-input" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {uploadingVideo ? 'Uploading...' : 'Click to upload video'}
                  </p>
                </Label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || uploadingImage || uploadingVideo}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Adding...' : 'Add Product'}
              </Button>
              <Link 
                href="/admin/products"
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded hover:bg-gray-400 text-center font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
