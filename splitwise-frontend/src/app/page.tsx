'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in (you can implement proper auth check later)
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen" style={{ fontFamily: 'Lato, Montserrat, "Font Awesome 6 Free", sans-serif', backgroundColor: '#2F4F3F' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/owe-asis-logo.png" 
              alt="Owe-asis" 
              className="h-20 w-auto"
              style={{ maxWidth: '300px' }}
            />
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Split expenses with friends and family. Keep track of your shared expenses, 
            balances, and settle up in a simple and organized way.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="relative rounded-2xl shadow-xl p-8 text-center overflow-hidden backdrop-blur-sm" style={{ backgroundColor: '#A8C4A2' }}>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Track Balances</h3>
              <p className="text-gray-700 leading-relaxed">Keep track of shared expenses and see who owes what at a glance.</p>
            </div>
          </div>

          <div className="relative rounded-2xl shadow-xl p-8 text-center overflow-hidden backdrop-blur-sm" style={{ backgroundColor: '#A8C4A2' }}>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Organize Groups</h3>
              <p className="text-gray-700 leading-relaxed">Create groups for different occasions and manage expenses together.</p>
            </div>
          </div>

          <div className="relative rounded-2xl shadow-xl p-8 text-center overflow-hidden backdrop-blur-sm" style={{ backgroundColor: '#A8C4A2' }}>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Simple Splitting</h3>
              <p className="text-gray-700 leading-relaxed">Split bills easily and fairly among friends with flexible options.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link
              href="/auth/register"
              className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login" 
              className="inline-block bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold border-2 border-emerald-600 hover:bg-emerald-50 transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
