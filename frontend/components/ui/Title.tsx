'use client'

/**
 * Animated Title Component
 * "Way Back Home" with dreamy space aesthetics
 */

import { motion } from 'framer-motion'

export function AnimatedTitle() {
  const titleVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: 'easeOut',
        staggerChildren: 0.1,
      },
    },
  }
  
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }
  
  const words = ['Way', 'Back', 'Home']
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={titleVariants}
      className="text-center"
    >
      {/* Main title */}
      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4">
        {words.map((word, wordIndex) => (
          <motion.span
            key={wordIndex}
            className="inline-block mr-4 last:mr-0"
            variants={letterVariants}
          >
            {word.split('').map((letter, letterIndex) => (
              <motion.span
                key={letterIndex}
                className={`inline-block ${
                  wordIndex === 2 
                    ? 'text-gradient-space' 
                    : 'text-space-cream'
                }`}
                whileHover={{
                  scale: 1.1,
                  color: '#FF9F43',
                  transition: { duration: 0.2 },
                }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.span>
        ))}
      </h1>
      
      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-space-lavender/80 text-lg md:text-xl font-body max-w-md mx-auto"
      >
        Find your way through the stars
      </motion.p>
      
      {/* Decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
        className="mt-6 h-px w-48 mx-auto bg-gradient-to-r from-transparent via-space-orange/50 to-transparent"
      />
    </motion.div>
  )
}

/**
 * Smaller title for map view with home navigation
 */
export function MapTitle({ eventName }: { eventName?: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* Home link */}
      <a
        href="/"
        className="w-10 h-10 rounded-full bg-gradient-to-br from-space-orange to-space-peach 
                   flex items-center justify-center hover:scale-110 transition-transform"
        title="Back to Home"
      >
        <span className="text-space-void text-lg">🚀</span>
      </a>
      
      <div>
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-display text-xl font-bold text-space-cream"
        >
          Way Back Home
        </motion.h1>
        {eventName && (
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-space-lavender/60 text-sm font-body"
          >
            {eventName}
          </motion.p>
        )}
      </div>
    </div>
  )
}

/**
 * Footer links for the map view
 */
export function MapFooterLinks() {
  return (
    <div className="flex items-center gap-2">
      {/* GitHub */}
      <a
        href="https://github.com/ayoisio/way-back-home"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-space-void-lighter/30 text-space-lavender/40 
                   hover:bg-space-void-lighter/50 hover:text-space-cream transition-all"
        title="View on GitHub"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </a>
      
      {/* Level 0 Codelab */}
      <a
        href="https://codelabs.developers.google.com/way-back-home-level-0/instructions"
        target="_blank"
        rel="noopener noreferrer"
        className="w-7 h-7 rounded-full bg-space-void-lighter/30 text-space-lavender/40 
                   hover:bg-space-void-lighter/50 hover:text-space-mint transition-all
                   flex items-center justify-center font-mono text-[10px] font-bold"
        title="Level 0 Codelab"
      >
        L0
      </a>
      
      {/* Level 1 Codelab */}
      <a
        href="https://codelabs.developers.google.com/way-back-home-level-1/instructions"
        target="_blank"
        rel="noopener noreferrer"
        className="w-7 h-7 rounded-full bg-space-void-lighter/30 text-space-lavender/40 
                   hover:bg-space-void-lighter/50 hover:text-space-orange transition-all
                   flex items-center justify-center font-mono text-[10px] font-bold"
        title="Level 1 Codelab"
      >
        L1
      </a>
    </div>
  )
}

export default AnimatedTitle