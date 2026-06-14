import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verifierAdmin() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET — liste tous les utilisateurs avec leur profil
export async function GET() {
  const admin = await verifierAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, nom, prenom, role, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupérer les emails depuis auth.users
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]))

  const result = profiles.map(p => ({ ...p, nom_complet: [p.prenom, p.nom].filter(Boolean).join(' '), email: emailMap[p.id] || '' }))
  return NextResponse.json({ utilisateurs: result })
}

// POST — créer un nouvel utilisateur
export async function POST(req: NextRequest) {
  const admin = await verifierAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { email, mot_de_passe, nom, prenom, role } = await req.json()

  if (!email || !mot_de_passe || !nom || !prenom || !role) {
    return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
  }

  const rolesValides = ['admin', 'rh', 'candidat']
  if (!rolesValides.includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: mot_de_passe,
    email_confirm: true
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    nom,
    prenom,
    role
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: authData.user.id })
}

// DELETE — supprimer un utilisateur
export async function DELETE(req: NextRequest) {
  const admin = await verifierAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  // Empêcher l'admin de se supprimer lui-même
  if (id === admin.id) return NextResponse.json({ error: 'Impossible de supprimer votre propre compte' }, { status: 400 })

  await supabaseAdmin.from('profiles').delete().eq('id', id)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
