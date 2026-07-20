"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, User, Users, Shield, BookOpen, Activity, AlertCircle, HelpCircle, Dumbbell, Bell, Heart } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useAuth } from "@/lib/auth"
import { useBrand } from "@/components/brand-provider"

export function GlobalSearch() {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const { user } = useAuth()
    const { brand } = useBrand()

    useEffect(() => {
        const down = (e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = (command) => {
        setOpen(false)
        command()
    }

    // Don't render until authenticated or at least safely bounded
    if (!user || !user.role) return null;

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                {user.role === 'owner' && (
                    <CommandGroup heading="Gym Operations">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <Activity className="mr-2 h-4 w-4" />
                            <span>Live Intelligence</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/members"))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Members Directory</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/trainers"))}>
                            <Dumbbell className="mr-2 h-4 w-4" />
                            <span>Trainers & Staff</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/attendance-logs"))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Attendance Logs</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {user.role === 'super_admin' && (
                    <CommandGroup heading="Platform Operations">
                        <CommandItem onSelect={() => runCommand(() => router.push("/super-admin/gyms"))}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>All Gyms</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/super-admin/owners"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Gym Owners</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/super-admin/subscriptions"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Subscriptions</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {user.role === 'trainer' && (
                    <CommandGroup heading="Trainer Tools">
                        <CommandItem onSelect={() => runCommand(() => router.push("/trainer/members"))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>My Members</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/trainer/plans"))}>
                            <Dumbbell className="mr-2 h-4 w-4" />
                            <span>Workout Plans</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                <CommandSeparator />

                <CommandGroup heading="Settings & Support">
                    <CommandItem onSelect={() => runCommand(() => router.push(user.role === 'super_admin' ? '/super-admin/settings' : '/settings'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </CommandItem>
                    {user.role !== 'super_admin' && (
                        <>
                            <CommandItem onSelect={() => runCommand(() => router.push("/help"))}>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Help Center</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => router.push("/support"))}>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <span>Support Tickets</span>
                            </CommandItem>
                        </>
                    )}
                    {user.role === 'super_admin' && (
                        <CommandItem onSelect={() => runCommand(() => router.push("/super-admin/health"))}>
                            <Heart className="mr-2 h-4 w-4" />
                            <span>System Status</span>
                        </CommandItem>
                    )}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
