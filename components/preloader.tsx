"use client"

import { useEffect, useState } from "react"
import { motion, Variants } from "framer-motion"

//const words = ["Hello", "Bonjour", "Ciao", "Olà", "やあ", "Hallå", "Guten tag", "হ্যালো"]
const words = ["Hola", "Bonjour", "Ciao", "Olà", "やあ", "হ্যালো", "مرحبًا", "നമസ്കാരം", "Hello"]

const opacity: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 0.75,
    transition: { duration: 1, delay: 0.2 },
  },
}

const slideUp: Variants = {
  initial: {
    top: 0,
  },
  exit: {
    top: "-100vh",
    transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] as const, delay: 0.2 },
  },
}

interface PreloaderProps {
  onComplete?: () => void
  mode?: "wait" | "reveal"
}

export default function Preloader({ onComplete, mode = "wait" }: PreloaderProps) {
  const [index, setIndex] = useState(0)
  const [dimension, setDimension] = useState({ width: 0, height: 0 })
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    setDimension({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  useEffect(() => {
    // MODE: REVEAL (Dashboard)
    // Immediately start the exit animation to reveal content
    if (mode === "reveal") {
      setIsExiting(true)
      setTimeout(() => {
        onComplete?.()
      }, 1000)
      return
    }

    // MODE: WAIT (Login)
    // Play words animation, then trigger complete but DO NOT exit (stay black)
    if (index === words.length - 1) {
      setTimeout(() => {
        onComplete?.()
      }, 1000)
      return
    }

    const timeout = setTimeout(
      () => {
        setIndex(index + 1)
      },
      index === 0 ? 1000 : 150,
    )

    return () => clearTimeout(timeout)
  }, [index, onComplete, mode])

  const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height} L0 0`
  const targetPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height} L0 0`

  const curve: Variants = {
    initial: {
      d: initialPath,
      transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] as const },
    },
    exit: {
      d: targetPath,
      transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] as const, delay: 0.3 },
    },
  }

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate={isExiting ? "exit" : "initial"}
      className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-black z-[99999999999] pointer-events-none"
    >
      {dimension.width > 0 && (
        <>
          {/* Only show words in 'wait' mode */}
          {mode === "wait" && (
            <motion.p
              variants={opacity}
              initial="initial"
              animate="enter"
              className="flex items-center text-white text-4xl md:text-5xl lg:text-6xl absolute z-10 font-medium"
            >
              <span className="block w-2.5 h-2.5 bg-white rounded-full mr-2.5"></span>
              {words[index]}
            </motion.p>
          )}
          
          <svg className="absolute top-0 w-full h-[calc(100%+300px)] pointer-events-none">
            <motion.path 
              variants={curve} 
              initial="initial" 
              animate={isExiting ? "exit" : "initial"} 
              fill="#000000"
            />
          </svg>
        </>
      )}
    </motion.div>
  )
}