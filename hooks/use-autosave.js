import { useState, useEffect, useRef } from 'react'

/**
 * Automatically saves state to LocalStorage with a debounce delay.
 * Useful for preventing data loss in long forms across the application.
 */
export function useAutosave(key, initialValue, delay = 1000) {
    const [value, setValue] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem(key)
                if (item) return JSON.parse(item)
            } catch (error) {
                console.warn(`Error reading localStorage for ${key}`, error)
            }
        }
        return initialValue
    })

    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        const handler = setTimeout(() => {
            if (typeof window !== 'undefined') {
                try {
                    window.localStorage.setItem(key, JSON.stringify(value))
                } catch (error) {
                    console.warn(`Error setting localStorage for ${key}`, error)
                }
            }
        }, delay)

        return () => clearTimeout(handler)
    }, [value, key, delay])

    const clearAutosave = () => {
        try {
            window.localStorage.removeItem(key)
        } catch (e) { }
    }

    return [value, setValue, clearAutosave]
}
