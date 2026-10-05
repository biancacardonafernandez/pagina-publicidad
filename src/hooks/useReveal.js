import { useEffect, useRef, useState } from 'react'

function useReveal() {
  const elementRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [elementRef, isVisible ? 'reveal visible' : 'reveal']
}

export default useReveal
