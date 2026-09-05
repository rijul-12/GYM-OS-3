'use client'
import { useEffect } from 'react'
import { useBrand } from './brand-provider'

export function BrandHydrator({ serverBrand }) {
    const { setBrand } = useBrand()

    useEffect(() => {
        if (serverBrand && Object.keys(serverBrand).length > 0) {
            // Merge all available gym_settings into global UI state, mapping legacy 'name' appropriately
            setBrand({
                ...serverBrand,
                gymName: serverBrand.name || serverBrand.gymName || 'BGM',
                primaryColor: serverBrand.primaryColor || '#ef4444',
            })
        }
    }, [serverBrand, setBrand])

    return null
}
