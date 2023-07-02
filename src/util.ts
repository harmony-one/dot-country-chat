import React, { useState, useEffect } from 'react'
export function getStoredSessionString (): string {
  const s = localStorage.getItem('dc-chat-session')
  if (!s) {
    return ''
  }
  return s
}

export function simpleCallback (param): () => Promise<any> {
  return async function (): Promise<any> {
    return await new Promise(resolve => { resolve(param) })
  }
}

export function extractError (error: Error): string {
  const s = error.toString()
  if (s.startsWith('Error: ')) {
    return s.slice('Error: '.length)
  }
  return s
}

export const Breakpoints = {
  LARGE: 1280,
  MOBILE: 992
}

export function getWindowDimensions () {
  const { innerWidth: width, innerHeight: height } = window
  return {
    width,
    height
  }
}

export const OSType = {
  Unknown: 0,
  iOS: 1,
  Android: 2,
  Windows: 3
}
function iOSDetect (): boolean {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform) ||
      // iPad on iOS 13 detection
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
}

function getMobileOS (): number {
  // @ts-expect-error browser-specific properties
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return OSType.Windows
  }
  if (/android/i.test(userAgent)) {
    return OSType.Android
  }
  // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios/9039885#9039885
  // @ts-expect-error browser-specific properties
  if (iOSDetect() || (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)) {
    return OSType.iOS
  }
  return OSType.Unknown
}

export function useWindowDimensions (): { width: number, height: number, os: number, isMobile: boolean } {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions())
  const isMobile = !(windowDimensions.width >= Breakpoints.MOBILE)

  const os = isMobile ? getMobileOS() : OSType.Unknown

  useEffect(() => {
    function handleResize (): void {
      setWindowDimensions(getWindowDimensions())
    }

    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [])

  return { isMobile, os, ...windowDimensions }
}
