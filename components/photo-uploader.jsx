'use client'
import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user-avatar'
import { useAuth } from '@/lib/auth'
import { compressProfileImage, validateImageFile } from '@/lib/image-utils'
import { uploadProfilePhoto, removeProfilePhoto } from '@/actions/db/storage'

/**
 * The single profile-photo control used by all four roles.
 * Validates and compresses in the browser, uploads through the authorised
 * server action and refreshes every avatar on screen via the auth context.
 */
export function PhotoUploader({ name, initialUrl = null, size = 88, onChange }) {
  const { user, updateUser } = useAuth()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState(initialUrl ?? user?.photoURL ?? null)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow choosing the same file again
    if (!file) return
    const problem = validateImageFile(file)
    if (problem) return toast.error(problem)

    setBusy(true)
    try {
      const dataUrl = await compressProfileImage(file)
      const res = await uploadProfilePhoto(dataUrl)
      if (!res?.success) throw new Error(res?.error || 'Upload failed')
      setUrl(res.url)
      updateUser({ photoURL: res.url })
      onChange?.(res.url)
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error(err?.message || 'The photo could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const res = await removeProfilePhoto()
      if (!res?.success) throw new Error(res?.error || 'Could not remove the photo')
      setUrl(null)
      updateUser({ photoURL: null })
      onChange?.(null)
      toast.success('Profile photo removed')
    } catch (err) {
      toast.error(err?.message || 'Could not remove the photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <UserAvatar src={url} name={name || user?.name} size={size} />
        {busy && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={pick} data-testid="photo-input" />
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] hover:bg-foreground/[0.08] disabled:opacity-50 transition">
          <Camera className="h-3.5 w-3.5" /> {url ? 'Change photo' : 'Upload photo'}
        </button>
        {url && (
          <button type="button" disabled={busy} onClick={remove}
            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg text-foreground/50 hover:text-red-400 disabled:opacity-50 transition">
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
        <p className="text-[11px] text-foreground/40">JPG, PNG or WebP. Cropped to a square.</p>
      </div>
    </div>
  )
}
