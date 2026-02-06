'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { frameColors, lensOptions } from '@/types/products';
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
import { Toggle } from '@/components/ui/toggle';

export default function AddProductPage() {
  const router = useRouter();
  const [, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: 0,
    stock: 0,
    image: '',
    images: [] as string[],
    video: '',
    description: '',
    material: '',
    color: '',
    featured: false,
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
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadToCloudinary(file, 'image'))
      );
      setFormData((prev) => {
        const images = [...prev.images, ...uploadedUrls];
        return {
          ...prev,
          images,
          image: images[0] || '',
        };
      });
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetMainImage = (index: number) => {
    setFormData((prev) => {
      const images = [...prev.images];
      const [selected] = images.splice(index, 1);
      images.unshift(selected);
      return {
        ...prev,
        images,
        image: images[0] || '',
      };
    });
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const images = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images,
        image: images[0] || '',
      };
    });
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
    <main className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/admin/products"
              className="text-2xl font-bold text-[#1d4e89] hover:text-[#15396b] transition-colors"
            >
              Add New Product
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Link
            href="/admin/dashboard"
            className="text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg mb-6 flex items-start gap-3">
              <svg
                className="w-5 h-5 mt-0.5 shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full"
                    placeholder="e.g., Sunglasses, Eyeglasses"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₦) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => {
                      const nextValue =
                        e.target.value === "" ? 0 : e.target.valueAsNumber;
                      setFormData({
                        ...formData,
                        price: Number.isNaN(nextValue) ? 0 : nextValue,
                      });
                    }}
                    className="w-full"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => {
                      const nextValue =
                        e.target.value === "" ? 0 : e.target.valueAsNumber;
                      setFormData({
                        ...formData,
                        stock: Number.isNaN(nextValue)
                          ? 0
                          : Math.trunc(nextValue),
                      });
                    }}
                    className="w-full"
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Material <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.material}
                    onChange={(e) =>
                      setFormData({ ...formData, material: e.target.value })
                    }
                    className="w-full"
                    placeholder="e.g., Metal, Plastic, Acetate"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Color <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.color}
                    onValueChange={(val) =>
                      setFormData({ ...formData, color: val })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a color" />
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

                <div className="md:col-span-2">
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Lens Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.defaultLensType}
                    onValueChange={(val) =>
                      setFormData({ ...formData, defaultLensType: val })
                    }
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
            </div>

            {/* Description Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Product Description
              </h3>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full h-32 resize-none"
                  placeholder="Describe your product in detail..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Provide a detailed description of the product features and
                  benefits.
                </p>
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Featured Product
              </Label>
              <Toggle
                type="button"
                pressed={formData.featured}
                onPressedChange={(pressed) =>
                  setFormData({ ...formData, featured: pressed })
                }
                className="data-[state=on]:bg-[#1d4e89] h-6 w-11 rounded-full bg-gray-200 relative after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform data-[state=on]:after:translate-x-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Toggle to feature this product on the homepage.
              </p>
            </div>

            {/* Media Upload Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                Product Media
              </h3>

              {/* Image Upload */}
              <div className="mb-6">
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Image <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#1d4e89] transition-colors bg-gray-50">
                  {formData.images.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {formData.images.map((img, index) => (
                          <div key={img} className="relative group">
                            <Image
                              src={img}
                              alt={`Product image ${index + 1}`}
                              className="w-full h-28 object-cover rounded-lg shadow-sm"
                              width={160}
                              height={112}
                            />
                            {index === 0 && (
                              <span className="absolute top-2 left-2 bg-[#1d4e89] text-white text-xs px-2 py-1 rounded-full">
                                Main
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              {index !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleSetMainImage(index)}
                                  className="text-xs bg-white text-gray-900 px-2 py-1 rounded"
                                >
                                  Set main
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        Images uploaded successfully!
                      </p>
                      <Label
                        htmlFor="image-input"
                        className="cursor-pointer inline-block"
                      >
                        <span className="text-sm text-[#1d4e89] hover:text-[#15396b] font-medium underline">
                          Add more images
                        </span>
                      </Label>
                    </div>
                  ) : (
                    <Label
                      htmlFor="image-input"
                      className="cursor-pointer block"
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-700 mb-1">
                        {uploadingImage
                          ? "Uploading images..."
                          : "Click to upload product images"}
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG up to 10MB • First image is main
                      </p>
                    </Label>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-input"
                  />
                </div>
              </div>

              {/* Video Upload */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-3">
                  Product Video{" "}
                  <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#1d4e89] transition-colors bg-gray-50">
                  {videoPreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <video
                          src={videoPreview}
                          className="w-48 h-48 object-cover mx-auto rounded-lg shadow-md"
                          controls
                        />
                        <div className="absolute top-2 right-2 bg-green-500 text-white p-2 rounded-full shadow-lg">
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        Video uploaded successfully!
                      </p>
                      <Label
                        htmlFor="video-input"
                        className="cursor-pointer inline-block"
                      >
                        <span className="text-sm text-[#1d4e89] hover:text-[#15396b] font-medium underline">
                          Change video
                        </span>
                      </Label>
                    </div>
                  ) : (
                    <Label
                      htmlFor="video-input"
                      className="cursor-pointer block"
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-700 mb-1">
                        {uploadingVideo
                          ? "Uploading video..."
                          : "Click to upload product video"}
                      </p>
                      <p className="text-sm text-gray-500">
                        MP4, MOV up to 50MB
                      </p>
                    </Label>
                  )}
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    disabled={uploadingVideo}
                    className="hidden"
                    id="video-input"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={
                  loading ||
                  uploadingImage ||
                  uploadingVideo ||
                  formData.images.length === 0
                }
                className="flex-1 bg-[#1d4e89] text-white py-3 rounded-lg hover:bg-[#15396b] disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Adding Product...
                  </span>
                ) : (
                  "Add Product"
                )}
              </Button>
              <Link
                href="/admin/products"
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 text-center font-medium transition-colors text-base flex items-center justify-center"
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
