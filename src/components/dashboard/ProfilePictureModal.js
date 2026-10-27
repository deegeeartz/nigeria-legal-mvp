"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Check, Trash2, Sparkles, User, AlertCircle, Loader2 } from "lucide-react";

export const PRESET_AVATARS = [
  {
    id: "av_amaka",
    label: "Corporate Counsel",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "av_ibrahim",
    label: "Senior Advocate",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "av_chioma",
    label: "Commercial Counsel",
    url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "av_sadiq",
    label: "Legal Associate",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "av_kemi",
    label: "Managing Partner",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "av_tunde",
    label: "Corporate Executive",
    url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
  },
];

export function ProfilePictureModal({ isOpen, onClose, currentUser, onAvatarUpdated }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar_url || "");
  const [previewError, setPreviewError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setPreviewError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPreviewError("Please select a valid image file (.jpg, .png, or .webp)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPreviewError("Image file size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedAvatar(event.target.result);
    };
    reader.onerror = () => {
      setPreviewError("Failed to read image file. Please try another.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onAvatarUpdated) {
        await onAvatarUpdated(selectedAvatar);
      }
      onClose();
    } catch (err) {
      setPreviewError("Failed saving profile picture. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    setSelectedAvatar("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 bg-stone-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900 font-serif">Update Profile Picture</h3>
                <p className="text-xs text-stone-500 font-medium">Personalize your verified Wigally identity</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Live Preview Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-amber-600 shadow-md bg-stone-900 flex items-center justify-center">
                  {selectedAvatar ? (
                    <img
                      src={selectedAvatar}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewError("Failed to display image. It may be broken.")}
                    />
                  ) : (
                    <span className="text-amber-400 font-black text-3xl">
                      {currentUser?.full_name?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                {selectedAvatar && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    title="Remove Photo"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="text-center sm:text-left min-w-0 flex-1">
                <h4 className="text-sm font-black text-stone-900 font-serif truncate">
                  {currentUser?.full_name}
                </h4>
                <p className="text-xs text-stone-500 truncate mb-2">{currentUser?.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-amber-100 text-amber-800">
                    {currentUser?.role || "Member"}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check size={12} strokeWidth={3} /> Verified ID
                  </span>
                </div>
              </div>
            </div>

            {previewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{previewError}</span>
              </div>
            )}

            {/* Upload Custom Photo Button */}
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-2">
                Option 1: Upload from Device
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-stone-300 hover:border-amber-600 rounded-2xl flex items-center justify-center gap-2 text-stone-700 font-bold text-xs bg-stone-50/50 hover:bg-amber-50/30 transition-all cursor-pointer group"
              >
                <Upload size={16} className="text-amber-600 group-hover:scale-110 transition-transform" />
                <span>Choose photo from computer or phone (.jpg, .png, .webp)</span>
              </button>
            </div>

            {/* Curated Professional Avatars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  Option 2: Choose Curated Practitioner Avatar
                </label>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.url);
                        setPreviewError("");
                      }}
                      className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all p-0.5 group ${
                        isSelected
                          ? "border-amber-600 shadow-md ring-2 ring-amber-500/20 scale-105"
                          : "border-stone-200 hover:border-stone-400 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-full h-full object-cover rounded-xl"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-amber-600/20 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50">
            {selectedAvatar ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 transition-colors flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Reset to Initial</span>
              </button>
            ) : (
              <span className="text-[11px] font-medium text-stone-400">Using name initials</span>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
