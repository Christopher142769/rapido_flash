import React, { useRef, useState } from 'react';
import { filterImageFiles } from '../../utils/shopImageUpload';
import './ShopImageUploadZone.css';

export default function ShopImageUploadZone({
  onFiles,
  uploading = false,
  label = 'Importer depuis mon PC',
  hint = 'JPG, PNG, WebP — glissez-déposez ou cliquez',
  multiple = true,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (fileList) => {
    const list = filterImageFiles(fileList);
    if (!list.length || uploading) return;
    await onFiles(list);
  };

  const onInputChange = async (e) => {
    await handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploading) return;
    await handleFiles(e.dataTransfer?.files);
  };

  return (
    <div
      className={`shop-upload-zone${compact ? ' shop-upload-zone--compact' : ''}${dragActive ? ' is-drag' : ''}${uploading ? ' is-busy' : ''}`}
      onDragEnter={onDrag}
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple={multiple}
        hidden
        onChange={onInputChange}
      />
      <button
        type="button"
        className="shop-upload-zone-btn"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Import en cours…' : label}
      </button>
      {!compact ? <p className="shop-upload-zone-hint">{hint}</p> : null}
    </div>
  );
}
