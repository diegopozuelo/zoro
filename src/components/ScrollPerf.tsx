'use client'

import { useEffect } from 'react'

/**
 * Pauses decorative CSS animations while the user is scrolling.
 * Fixed/animated layers under scrolling content are the main scroll jank source.
 */
export default function ScrollPerf() {
  useEffect(() => {
    const root = document.documentElement
    let timer = 0

    const onScroll = () => {
      root.dataset.scrolling = '1'
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        delete root.dataset.scrolling
      }, 140)
    }

    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.clearTimeout(timer)
      delete root.dataset.scrolling
    }
  }, [])

  return null
}
