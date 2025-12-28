'use client'

/**
 * Landing Page
 * Beautiful animated intro for Way Back Home
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatedTitle } from '@/components/ui/Title'
import { CelestialBackground } from '@/components/ui/CelestialBackground'

export default function HomePage() {
  const [eventCode, setEventCode] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)
  
  const handleJoinEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (eventCode.trim()) {
      setIsNavigating(true)
      window.location.href = `/e/${eventCode.trim().toLowerCase()}`
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated celestial background with cursor-reactive planets */}
      <CelestialBackground />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Title */}
        <div className="mb-12">
          <AnimatedTitle />
        </div>
        
        {/* Join event form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="glass-panel p-6"
        >
          <h2 className="font-display text-lg font-semibold text-space-cream mb-4 text-center">
            Join an Event
          </h2>
          
          <form onSubmit={handleJoinEvent} className="space-y-4">
            <div>
              <label htmlFor="eventCode" className="block text-sm text-space-lavender/60 mb-2">
                Event Code
              </label>
              <input
                id="eventCode"
                type="text"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value)}
                placeholder="e.g., sandbox"
                className="w-full px-4 py-3 rounded-xl bg-space-void-lighter/50 border border-space-lavender/20
                         text-space-cream placeholder:text-space-lavender/30
                         focus:outline-none focus:ring-2 focus:ring-space-orange/50 focus:border-transparent
                         transition-all duration-200"
              />
            </div>
            
            <motion.button
              type="submit"
              disabled={!eventCode.trim() || isNavigating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigating ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    🚀
                  </motion.span>
                  Launching...
                </span>
              ) : (
                'Enter the Map'
              )}
            </motion.button>
          </form>
          
          {/* Quick links */}
          <div className="mt-6 pt-4 border-t border-space-lavender/10 text-center">
            <p className="text-xs text-space-lavender/40 mb-2">Quick Access</p>
            <a 
              href="/e/sandbox"
              className="text-space-mint hover:text-space-mint-light text-sm transition-colors"
            >
              → Sandbox Environment
            </a>
          </div>
        </motion.div>
        
        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          {/* Links */}
          <div className="flex items-center gap-3">
            {/* GitHub */}
            <a
              href="https://github.com/ayoisio/way-back-home"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-space-void-lighter/50 text-space-lavender/60 
                         hover:bg-space-void-lighter/70 hover:text-space-cream transition-all
                         backdrop-blur-sm"
              title="View on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            
            {/* Level 0 Codelab */}
            <a
              href="https://codelabs.developers.google.com/way-back-home-level-0/instructions"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-space-void-lighter/50 text-space-lavender/60 
                         hover:bg-space-void-lighter/70 hover:text-space-mint transition-all
                         backdrop-blur-sm flex items-center justify-center font-mono text-xs font-bold"
              title="Level 0 Codelab"
            >
              L0
            </a>
            
            {/* Level 1 Codelab */}
            <a
              href="https://codelabs.developers.google.com/way-back-home-level-1/instructions"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-space-void-lighter/50 text-space-lavender/60 
                         hover:bg-space-void-lighter/70 hover:text-space-orange transition-all
                         backdrop-blur-sm flex items-center justify-center font-mono text-xs font-bold"
              title="Level 1 Codelab"
            >
              L1
            </a>
          </div>
          
          <p className="text-xs text-space-lavender/40">
            An AI-powered workshop experience by Google Cloud
          </p>
        </motion.div>
      </div>
    </div>
  )
}