'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Récupérer le rôle
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role
    if (role === 'rh') router.push('/rh')
    else if (role === 'admin') router.push('/admin')
    else if (role === 'superviseur') router.push('/superviseur')
    else router.push('/candidat')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-900 font-black text-xl">H</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Connexion</h1>
          <p className="text-blue-300 text-sm mt-1">Plateforme HCP Recrutement</p>
        </div>

        <div className="bg-white/5 border border-blue-700/40 rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            
            <div>
              <label className="block text-blue-200 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-blue-900/50 border border-blue-600/40 rounded-lg px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-blue-400 text-sm"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-blue-200 text-sm mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-blue-900/50 border border-blue-600/40 rounded-lg px-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-blue-400 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-blue-900 font-bold py-3 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

          </form>
        </div>

        <p className="text-center text-blue-400 text-sm mt-6">
          Candidat ?{' '}
          <Link href="/candidature" className="text-white hover:underline">
            Postulez sans compte →
          </Link>
        </p>

      </div>
    </div>
  )
}