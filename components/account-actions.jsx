'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, Modal, Field, inputClass } from '@/components/ui-kit'
import { useAuth } from '@/lib/auth'
import { deleteMyAccount } from '@/actions/db/account'
import { sendVerificationEmailAction } from '@/actions/auth'

/** Sign-out, password, e-mail verification and account deletion for members and trainers. */
export function AccountActions() {
  const { user, signOut } = useAuth()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  const logout = async () => { setSigningOut(true); try { await signOut() } finally { window.location.assign('/login') } }
  const verify = () => start(async () => {
    const res = await sendVerificationEmailAction()
    if (res?.error) toast.error(res.error); else toast.success(res.alreadyVerified ? 'Your e-mail is already verified.' : 'Verification e-mail sent.')
  })
  const remove = () => start(async () => {
    const res = await deleteMyAccount(text)
    if (res?.error) return toast.error(res.error)
    await signOut()
    window.location.assign('/')
  })

  return (
    <>
      <Card title="Account">
        <div className="text-sm text-foreground/60 mb-3 break-all">{user?.email}{user && !user.emailVerified && <span className="ml-2 text-amber-400">· not verified</span>}</div>
        <div className="flex flex-wrap gap-2">
          <Link href="/forgot-password"><Button variant="outline" className="h-10">Change password</Button></Link>
          {user && !user.emailVerified && <Button variant="outline" className="h-10" disabled={pending} onClick={verify}>Verify e-mail</Button>}
          <Button variant="outline" className="h-10" disabled={signingOut} onClick={logout} data-testid="profile-sign-out"><LogOut className="h-4 w-4 mr-2" />{signingOut ? 'Signing out…' : 'Sign out'}</Button>
        </div>
        <button className="mt-4 text-xs text-foreground/40 hover:text-red-400 underline" onClick={() => setOpen(true)}>Delete my account</button>
      </Card>
      <Modal open={open} onClose={() => { setOpen(false); setText('') }} title="Delete your account?" footer={<><Button variant="outline" onClick={() => { setOpen(false); setText('') }}>Cancel</Button><Button disabled={pending || text !== 'DELETE'} className="bg-red-500 hover:bg-red-600 text-white border-0" onClick={remove}>{pending ? 'Deleting…' : 'Delete account'}</Button></>}>
        <p className="text-sm text-foreground/70">Your profile, photo, attendance history and login are permanently deleted. Records of payments you made are kept by your gym in anonymised form for accounting. This cannot be undone.</p>
        <div className="mt-4"><Field label="Type DELETE to confirm"><input className={inputClass} value={text} onChange={e => setText(e.target.value.toUpperCase())} autoCapitalize="characters" /></Field></div>
      </Modal>
    </>
  )
}
