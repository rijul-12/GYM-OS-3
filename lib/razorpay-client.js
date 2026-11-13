'use client'
// Loads Razorpay Checkout once, on demand (it is not part of the main bundle).
let loading = null

export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Razorpay) return Promise.resolve(true)
  if (!loading) {
    loading = new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => { loading = null; resolve(false) }
      document.body.appendChild(script)
    })
  }
  return loading
}
