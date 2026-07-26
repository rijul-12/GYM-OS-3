"use client"

import { useTheme } from "next-themes"
import { useState, useEffect, useTransition } from "react"
import { motion } from "framer-motion"
import { Monitor, Moon, Sun, Check, Layout, Paintbrush, MousePointer2, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"

export function AppearanceSettings() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const { user } = useAuth()
    const { brand, setBrand } = useBrand()

    // Future state placeholders for scaling according to Firebase rules
    const [accent, setAccent] = useState("default")
    const [density, setDensity] = useState("comfortable")
    const [sidebar, setSidebar] = useState("expanded")
    const [animations, setAnimations] = useState("enabled")
    const [language, setLanguage] = useState("en")
    const [isPending, startTransition] = useTransition()

    useEffect(() => setMounted(true), [])

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme)

        // Dispatch to Firebase if authenticated without blocking UI
        if (user?.uid) {
            startTransition(async () => {
                const { updateUserAppearance } = await import('@/actions/db/settings')
                await updateUserAppearance(user.uid, { ...user.appearance, theme: newTheme })
            })
        }
    }

    const handleUpdateSetting = (key, value) => {
        // Optimistic UI updates
        if (key === 'accent') {
            const colorMap = { default: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', green: '#10b981', orange: '#f97316', red: '#ef4444' }
            setAccent(value)
            setBrand({ primaryColor: colorMap[value] || '#ef4444' })
        }
        if (key === 'density') setDensity(value)
        if (key === 'sidebar') setSidebar(value)
        if (key === 'language') setLanguage(value)

        if (user?.uid) {
            startTransition(async () => {
                const { updateUserAppearance } = await import('@/actions/db/settings')
                await updateUserAppearance(user.uid, { ...user.appearance, [key]: value })
            })
        }
    }

    if (!mounted) return null

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* Theme Selection */}
            <section>
                <div className="mb-4">
                    <h3 className="text-sm font-semibold">Theme Preference</h3>
                    <p className="text-xs text-foreground/50 dark:text-foreground/50 text-foreground/50">Select your preferred lighting environment.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${theme === 'light' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.04]'}`}
                    >
                        <Sun className="h-5 w-5 mb-2" />
                        <span className="text-xs font-medium">Light</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${theme === 'dark' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.04]'}`}
                    >
                        <Moon className="h-5 w-5 mb-2" />
                        <span className="text-xs font-medium">Dark</span>
                    </button>

                    <button
                        onClick={() => handleThemeChange('system')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${theme === 'system' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.04]'}`}
                    >
                        <Monitor className="h-5 w-5 mb-2" />
                        <span className="text-xs font-medium">System</span>
                    </button>
                </div>
            </section>

            {/* Advanced Settings */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold border-b border-border pb-2 opacity-50">Future System Layouts</h3>

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Accent Color */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Paintbrush className="h-4 w-4" />
                            <div className="text-sm font-medium">Accent Color</div>
                        </div>
                        <div className="flex gap-2">
                            {['default', 'blue', 'purple', 'green', 'orange', 'red'].map(color => (
                                <div
                                    key={color}
                                    onClick={() => handleUpdateSetting('accent', color)}
                                    className={`h-6 w-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110`}
                                    style={{
                                        background: color === 'default' ? '#ef4444' : (color === 'red' ? '#ef4444' : (color === 'blue' ? '#3b82f6' : (color === 'purple' ? '#8b5cf6' : (color === 'green' ? '#10b981' : '#f97316')))),
                                        borderColor: brand.primaryColor === (color === 'default' || color === 'red' ? '#ef4444' : (color === 'blue' ? '#3b82f6' : (color === 'purple' ? '#8b5cf6' : (color === 'green' ? '#10b981' : '#f97316')))) ? 'hsl(var(--foreground))' : 'transparent'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Density */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Layout className="h-4 w-4" />
                            <div className="text-sm font-medium">Density</div>
                        </div>
                        <select
                            value={density}
                            onChange={(e) => handleUpdateSetting('density', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none cursor-pointer">
                            <option value="comfortable">Comfortable</option>
                            <option value="compact">Compact</option>
                        </select>
                    </div>

                    {/* Sidebar */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <MousePointer2 className="h-4 w-4" />
                            <div className="text-sm font-medium">Sidebar Behavior</div>
                        </div>
                        <div className="flex gap-2 text-xs">
                            <Button
                                onClick={() => handleUpdateSetting('sidebar', 'expanded')}
                                variant={sidebar === 'expanded' ? 'default' : 'outline'}
                                className="h-8">Expanded</Button>
                            <Button
                                onClick={() => handleUpdateSetting('sidebar', 'collapsed')}
                                variant={sidebar === 'collapsed' ? 'default' : 'outline'}
                                className="h-8">Collapsed</Button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Languages className="h-4 w-4" />
                            <div className="text-sm font-medium">Language</div>
                        </div>
                        <select
                            value={language}
                            onChange={(e) => handleUpdateSetting('language', e.target.value)}
                            className="w-full bg-background border border-border rounded-lg p-2 text-sm outline-none cursor-pointer">
                            <option value="en">English (EN)</option>
                            <option value="hi">Hindi (HI)</option>
                        </select>
                    </div>
                </div>
            </section>

        </div>
    )
}
