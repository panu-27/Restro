import React, { useRef, useState } from 'react';
import axios from 'axios';
import { Camera, X, Upload, Loader2 } from 'lucide-react';

/**
 * ImageUploader
 * @param {string}   value     - Current image URL (Cloudinary or empty)
 * @param {Function} onChange  - Called with the new URL after upload (or '' on remove)
 * @param {string}   label     - Accessible label shown in the placeholder
 * @param {'square'|'circle'|'wide'} shape - Visual shape of the picker
 * @param {string}   folder    - Cloudinary folder to upload into
 * @param {string}   className - Extra wrapper classes
 */
const ImageUploader = ({
  value = '',
  onChange,
  label = 'Image',
  shape = 'square',
  folder = 'restro',
  className = '',
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  const shapeClasses = {
    square: 'w-20 h-20 rounded-2xl',
    circle: 'w-20 h-20 rounded-full',
    wide: 'w-full h-28 rounded-2xl',
    mini: 'w-8 h-8 rounded-lg',
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }

    setError('');
    setUploading(true);

    // Convert to base64 data URI for Cloudinary upload
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUri = ev.target.result;
      setPreviewUrl(dataUri);

      try {
        const res = await axios.post('/api/upload', { data: dataUri, folder });
        onChange(res.data.url);
        setPreviewUrl(''); // clear local preview — real URL now in `value`
      } catch (err) {
        setError(err.response?.data?.error || 'Upload failed. Try again.');
        setPreviewUrl('');
      } finally {
        setUploading(false);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const displayUrl = previewUrl || value;

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <div className="relative group cursor-pointer" onClick={() => !uploading && inputRef.current?.click()}>
        <div
          className={`${shapeClasses[shape]} overflow-hidden border-2 transition-all duration-200 ${
            displayUrl
              ? 'border-transparent'
              : 'border-dashed border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/30'
          } flex items-center justify-center`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-orange-400">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Uploading</span>
            </div>
          ) : displayUrl ? (
            <img
              src={displayUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-gray-300 group-hover:text-orange-400 transition-colors">
              <Camera size={22} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
            </div>
          )}
        </div>

        {/* Overlay on hover when image exists */}
        {displayUrl && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
            <Upload size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Remove button */}
      {value && !uploading && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(''); setPreviewUrl(''); }}
          className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors"
        >
          <X size={11} /> Remove
        </button>
      )}

      {error && (
        <p className="text-[10px] text-rose-500 font-semibold max-w-[160px]">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;
