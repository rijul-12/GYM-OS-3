'use client'
import { useEffect } from 'react'
import { useBrand } from './brand-provider'

export function BrandHydrator({ serverBrand }) {
    const { setBrand } = useBrand()

    useEffect(() => {
        if (serverBrand && Object.keys(serverBrand).length > 0) {
            setBrand({
                gymName: serverBrand.name || serverBrand.gymName || 'GymOS',
                primaryColor: serverBrand.primaryColor || '#ef4444',
                logo: serverBrand.logo
            })
        }
    }, [serverBrand, setBrand])

    return null
}
