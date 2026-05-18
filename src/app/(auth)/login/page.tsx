'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Target, Users, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Redirect based on role - we'll fetch session after login
        router.push('/dashboard')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { label: 'Goals Completed', value: '94%', icon: Target },
    { label: 'Teams On Track', value: '12', icon: Users },
    { label: 'Check-ins Done', value: '847', icon: CheckCircle },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[60%] bg-bg-base relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Gradient mesh */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#818CF8]/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-[#818CF8] flex items-center justify-center mb-8"
          >
            <span className="font-display font-bold text-3xl text-white">M</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display font-bold text-4xl text-text-primary mb-4 text-center"
          >
            Meridian
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-text-secondary text-lg mb-12 text-center"
          >
            Set goals. Track progress. Drive outcomes.
          </motion.p>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-6 w-full max-w-md">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="bg-bg-surface/50 backdrop-blur-sm border border-border-subtle rounded-xl p-4 text-center"
              >
                <stat.icon className="w-5 h-5 text-accent mx-auto mb-2" />
                <div className="font-mono text-2xl font-semibold text-text-primary">{stat.value}</div>
                <div className="text-xs text-text-muted mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[40%] bg-bg-surface border-l border-border-subtle flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-[#818CF8] flex items-center justify-center mx-auto mb-4">
              <span className="font-display font-bold text-xl text-white">M</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary text-sm mb-8">Sign in to Meridian</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="email"
                label="Email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    className="text-sm text-accent hover:text-accent-hover"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-danger bg-danger-subtle px-3 py-2 rounded-md"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-bg-surface px-2 text-text-muted">or</span>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
            >
              <svg className="w-4 h-4" viewBox="0 0 21 21" fill="currentColor">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Continue with Microsoft
            </Button>

            <p className="text-xs text-text-muted text-center mt-8">
              Version 1.0.0 — © 2026 Meridian
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
