"use client"

import { useState } from "react"
import { MessageSquare, Send, CheckCircle2, Loader2, Bug, Lightbulb, HelpCircle, Frown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { submitFeedback } from "@/actions/db/activity"

export function FeedbackButton({ wrapperClass = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] transition-colors cursor-pointer w-full" }) {
    const [open, setOpen] = useState(false)
    const [category, setCategory] = useState('Suggestion')
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const { user } = useAuth()

    const categories = [
        { id: 'Bug', icon: Bug, color: 'text-red-500' },
        { id: 'Suggestion', icon: Lightbulb, color: 'text-amber-500' },
        { id: 'Question', icon: HelpCircle, color: 'text-blue-500' },
        { id: 'Complaint', icon: Frown, color: 'text-purple-500' }
    ]

    const handleSubmit = async () => {
        if (!text.trim()) return
        setLoading(true)
        try {
            await submitFeedback({
                uid: user?.uid,
                email: user?.email,
                role: user?.role,
                gymCode: user?.gymCode || 'DEMO',
                category,
                text
            })

            setSubmitted(true)
            toast.success("Feedback submitted to engineering.")
            setTimeout(() => { setOpen(false); setSubmitted(false); setText('') }, 2000)
        } catch (e) {
            toast.error("Failed to submit feedback")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className={wrapperClass}>
                    <MessageSquare className="h-4 w-4" />
                    Send Feedback
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-border bg-card">
                {submitted ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Message Received</h2>
                        <p className="text-muted-foreground text-sm">Thank you for helping us improve GymOS. Our engineering team will review your report shortly.</p>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="p-6 pb-2 border-b border-border bg-foreground/[0.01]">
                            <DialogTitle>Send Feedback</DialogTitle>
                            <p className="text-sm text-muted-foreground">Log a bug or request a feature directly to the engineering team.</p>
                        </DialogHeader>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {categories.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setCategory(c.id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm cursor-pointer transition-all ${category === c.id ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-transparent text-muted-foreground hover:bg-foreground/[0.02]'}`}
                                    >
                                        <c.icon className={`h-4 w-4 ${c.color}`} /> {c.id}
                                    </div>
                                ))}
                            </div>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Describe your issue or suggestion in detail..."
                                className="w-full h-32 p-3 rounded-xl border border-border bg-background resize-none outline-none text-sm focus:border-primary transition-colors"
                            />
                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSubmit} disabled={loading || !text.trim()} className="w-full sm:w-auto h-10">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Submit Report
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
