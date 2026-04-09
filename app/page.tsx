'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [slug, setSlug] = useState('')
  const [rol, setRol] = useState('admin')
  const router = useRouter()

  function gir() {
    if (!slug.trim()) return
    router.push(`/${slug.trim().toLowerCase()}/${rol}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4">🌱</div>
          <h1 className="text-4xl font-bold text-white">Kinderly</h1>
          <p className="text-indigo-200 mt-2">Anaokulu Yönetim Platformu</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Panele Giriş</h2>
          
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2">OKUL KODU</label>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && gir()}
              placeholder="hilal"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-2">ROL</label>
            <div className="grid grid-cols-3 gap-2">
              {[['admin','🏠','Yönetici'],['ogretmen','👨‍🏫','Öğretmen'],['veli','👨‍👩‍👧','Veli']].map(([id,icon,label]) => (
                <button key={id} onClick={() => setRol(id)}
                  className={`py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-1 transition-all ${rol === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  <span className="text-xl">{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={gir} className="w-full bg-indigo-600 text-white rounded-xl py-4 font-bold text-base hover:bg-indigo-700 transition-colors">
            Panele Git →
          </button>
        </div>

        <div className="text-center mt-8 text-indigo-300 text-sm">
          <p>Yeni okul kaydı için</p>
          <a href="mailto:info@kinderly.app" className="text-white font-semibold underline">info@kinderly.app</a>
        </div>
      </div>
    </div>
  )
}