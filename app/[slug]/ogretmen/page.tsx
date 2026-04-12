'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import {
  getSupabaseErrorMessage,
  insertActivityCompat,
  insertMessageCompat,
  loadAnnouncementsCompat,
  loadSchoolMessagesCompat,
  markMessagesReadCompat,
  normalizeAnnouncement,
  resolveTeacherMessageParties,
  upsertAttendanceCompat,
  type AnnouncementItem,
  type NormalizedMessage,
} from '@/lib/supabase-helpers'
import type { Ogrenci, Okul } from '@/lib/types'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type TeacherTab = 'dashboard' | 'yoklama' | 'aktiviteler' | 'mesajlar' | 'duyurular' | 'fotograflar'
type AttendanceStatus = 'geldi' | 'gelmedi' | 'izinli'
type ActivityType = 'food' | 'nap' | 'potty' | 'photo' | 'kudos' | 'meds' | 'incident' | 'health' | 'note'

type TeacherProfile = {
  id: number
  ad_soyad?: string | null
  sinif?: string | null
}

type ActivityRow = {
  id: number
  ogrenci_id: number
  tur: ActivityType | string
  detay?: Record<string, string | number | boolean | null> | null
  kaydeden?: string | null
  created_at?: string | null
  ogrenciler?: { ad_soyad?: string | null } | { ad_soyad?: string | null }[] | null
}

type PhotoRow = {
  id: number
  ogrenci_id?: number | null
  url: string
  aciklama?: string | null
  sinif?: string | null
  created_at?: string | null
  tarih?: string | null
}

type ActivityField =
  | { key: string; label: string; kind: 'text' | 'textarea' | 'number' | 'time' }
  | { key: string; label: string; kind: 'select'; options: string[] }
  | { key: string; label: string; kind: 'checkbox' }

const tabs: Array<{ id: TeacherTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'yoklama', label: 'Yoklama' },
  { id: 'aktiviteler', label: 'Aktiviteler' },
  { id: 'mesajlar', label: 'Mesajlar' },
  { id: 'duyurular', label: 'Duyurular' },
  { id: 'fotograflar', label: 'Fotoğraflar' },
]

const activityOptions: Array<{ id: ActivityType; label: string }> = [
  { id: 'food', label: 'Yemek' },
  { id: 'nap', label: 'Uyku' },
  { id: 'potty', label: 'Tuvalet' },
  { id: 'photo', label: 'Fotoğraf' },
  { id: 'kudos', label: 'Tebrik' },
  { id: 'meds', label: 'İlaç' },
  { id: 'incident', label: 'Kaza' },
  { id: 'health', label: 'Sağlık' },
  { id: 'note', label: 'Not' },
]

const activityFieldMap: Record<ActivityType, ActivityField[]> = {
  food: [
    { key: 'ogun', label: 'Öğün', kind: 'select', options: ['Kahvaltı', 'Öğle', 'İkindi'] },
    { key: 'miktar', label: 'Miktar', kind: 'text' },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
  nap: [
    { key: 'baslangic', label: 'Başlangıç', kind: 'time' },
    { key: 'bitis', label: 'Bitiş', kind: 'time' },
    { key: 'sure', label: 'Süre', kind: 'text' },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
  potty: [
    { key: 'durum', label: 'Durum', kind: 'select', options: ['Başarılı', 'Destekli', 'Kontrol'] },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
  photo: [
    { key: 'aciklama', label: 'Açıklama', kind: 'textarea' },
    { key: 'veli_gosterilsin', label: 'Veliye gösterilsin', kind: 'checkbox' },
  ],
  kudos: [
    { key: 'baslik', label: 'Tebrik başlığı', kind: 'text' },
    { key: 'not', label: 'Kutlama notu', kind: 'textarea' },
  ],
  meds: [
    { key: 'ilac', label: 'İlaç adı', kind: 'text' },
    { key: 'doz', label: 'Doz', kind: 'text' },
    { key: 'saat', label: 'Saat', kind: 'time' },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
  incident: [
    { key: 'olay', label: 'Olay özeti', kind: 'text' },
    { key: 'aksiyon', label: 'Alınan aksiyon', kind: 'textarea' },
  ],
  health: [
    { key: 'ates', label: 'Ateş', kind: 'text' },
    { key: 'durum', label: 'Durum', kind: 'text' },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
  note: [
    { key: 'baslik', label: 'Başlık', kind: 'text' },
    { key: 'not', label: 'Not', kind: 'textarea' },
  ],
}

const attendanceOptions: AttendanceStatus[] = ['geldi', 'gelmedi', 'izinli']

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function getActivityStudentName(activity: ActivityRow) {
  if (Array.isArray(activity.ogrenciler)) {
    return activity.ogrenciler[0]?.ad_soyad ?? 'Öğrenci'
  }

  return activity.ogrenciler?.ad_soyad ?? 'Öğrenci'
}

function getActivitySummary(activity: ActivityRow) {
  const detay = activity.detay || {}
  const firstValue = ['not', 'aciklama', 'durum', 'olay', 'miktar', 'ogun', 'ilac']
    .map((key) => detay[key])
    .find(Boolean)

  return firstValue ? String(firstValue) : 'Yeni kayıt oluşturuldu.'
}

function createInitialActivityForm(type: ActivityType) {
  const fields = activityFieldMap[type]
  return Object.fromEntries(
    fields.map((field) => [field.key, field.kind === 'checkbox' ? true : ''])
  ) as Record<string, string | boolean>
}

export default function OgretmenPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { session, role, okul: authOkul, loading, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard')
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [messages, setMessages] = useState<NormalizedMessage[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [photos, setPhotos] = useState<PhotoRow[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedActivityStudentId, setSelectedActivityStudentId] = useState<number | null>(null)
  const [selectedMessageStudentId, setSelectedMessageStudentId] = useState<number | null>(null)
  const [selectedPhotoStudentId, setSelectedPhotoStudentId] = useState<number | null>(null)
  const [activityType, setActivityType] = useState<ActivityType>('food')
  const [activityForm, setActivityForm] = useState<Record<string, string | boolean>>(createInitialActivityForm('food'))
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [threadMessage, setThreadMessage] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [photoNote, setPhotoNote] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendingBulkMessage, setSendingBulkMessage] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    void params.then((value) => setSlug(value.slug))
  }, [params])

  const okul = authOkul as Okul | null

  useEffect(() => {
    if (loading || !slug) return

    if (!session || !authOkul) {
      router.replace('/giris')
      return
    }

    const expectedPath = rolePath(role)
    if (role !== 'ogretmen') {
      router.replace(`/${authOkul.slug}/${expectedPath ?? 'admin'}`)
      return
    }

    if (authOkul.slug !== slug) {
      router.replace(`/${authOkul.slug}/ogretmen`)
    }
  }, [authOkul, loading, role, router, session, slug])

  useEffect(() => {
    if (!okul || !session) return

    let alive = true
    const currentSession = session
    const currentOkul = okul

    async function loadPanelData() {
      setPageLoading(true)

      const [{ data: personel, error: personelError }, { data: students, error: studentsError }] = await Promise.all([
        supabase
          .from('personel')
          .select('id,ad_soyad,sinif')
          .eq('user_id', currentSession.user.id)
          .eq('okul_id', currentOkul.id)
          .maybeSingle(),
        supabase
          .from('ogrenciler')
          .select('*')
          .eq('okul_id', currentOkul.id)
          .eq('aktif', true)
          .order('ad_soyad'),
      ])

      if (!alive) return

      if (personelError || !personel?.id) {
        setStatusMessage(getSupabaseErrorMessage(personelError, 'Öğretmen profili yüklenemedi.'))
        setPageLoading(false)
        return
      }

      if (studentsError) {
        setStatusMessage(getSupabaseErrorMessage(studentsError, 'Öğrenci listesi yüklenemedi.'))
      }

      const safeStudents = (students || []) as Ogrenci[]
      const classFallback = personel.sinif || 'all'

      const [attendanceQuery, activityQuery, messageQuery, announcementQuery, photoQuery] = await Promise.all([
        supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', currentOkul.id).eq('tarih', today()),
        supabase
          .from('aktiviteler')
          .select('id,ogrenci_id,tur,detay,kaydeden,created_at,ogrenciler(ad_soyad)')
          .eq('okul_id', currentOkul.id)
          .eq('tarih', today())
          .order('id', { ascending: false })
          .limit(24),
        loadSchoolMessagesCompat(currentOkul.id, 300),
        loadAnnouncementsCompat(currentOkul.id, 20),
        supabase.from('fotograflar').select('*').eq('okul_id', currentOkul.id).order('id', { ascending: false }).limit(60),
      ])

      if (!alive) return

      const nextAttendance: Record<number, AttendanceStatus> = {}
      ;(attendanceQuery.data || []).forEach((row: { ogrenci_id: number; durum: AttendanceStatus }) => {
        nextAttendance[row.ogrenci_id] = row.durum
      })

      setTeacher(personel as TeacherProfile)
      setOgrenciler(safeStudents)
      setAttendance(nextAttendance)
      setActivities((activityQuery.data || []) as ActivityRow[])
      setMessages(messageQuery.data || [])
      setAnnouncements(announcementQuery.data || [])
      setPhotos((photoQuery.data || []) as PhotoRow[])
      setSelectedClass((current) => (current === 'all' ? classFallback : current))
      setSelectedActivityStudentId((current) => current ?? safeStudents[0]?.id ?? null)
      setSelectedMessageStudentId((current) => current ?? safeStudents[0]?.id ?? null)
      setSelectedPhotoStudentId((current) => current ?? safeStudents[0]?.id ?? null)
      setPageLoading(false)
    }

    void loadPanelData()

    const channel = supabase
      .channel(`ogretmen-panel-${currentOkul.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void loadSchoolMessagesCompat(currentOkul.id, 300).then((result) => setMessages(result.data || []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duyurular', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void loadAnnouncementsCompat(currentOkul.id, 20).then((result) => setAnnouncements(result.data || []))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aktiviteler', filter: `okul_id=eq.${currentOkul.id}` }, () => {
        void supabase
          .from('aktiviteler')
          .select('id,ogrenci_id,tur,detay,kaydeden,created_at,ogrenciler(ad_soyad)')
          .eq('okul_id', currentOkul.id)
          .eq('tarih', today())
          .order('id', { ascending: false })
          .limit(24)
          .then(({ data }) => setActivities((data || []) as ActivityRow[]))
      })
      .subscribe()

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [okul, session])

  const classOptions = useMemo(() => {
    const values = Array.from(new Set(ogrenciler.map((item) => item.sinif).filter(Boolean))) as string[]
    return values.sort((a, b) => a.localeCompare(b, 'tr'))
  }, [ogrenciler])

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return ogrenciler
    return ogrenciler.filter((ogrenci) => ogrenci.sinif === selectedClass)
  }, [ogrenciler, selectedClass])

  const selectedMessageStudent = useMemo(
    () => ogrenciler.find((ogrenci) => ogrenci.id === selectedMessageStudentId) ?? null,
    [ogrenciler, selectedMessageStudentId]
  )

  const selectedActivityStudent = useMemo(
    () => ogrenciler.find((ogrenci) => ogrenci.id === selectedActivityStudentId) ?? null,
    [ogrenciler, selectedActivityStudentId]
  )

  const selectedPhotoStudent = useMemo(
    () => ogrenciler.find((ogrenci) => ogrenci.id === selectedPhotoStudentId) ?? null,
    [ogrenciler, selectedPhotoStudentId]
  )

  const attendanceSummary = useMemo(() => {
    const values = filteredStudents.map((ogrenci) => attendance[ogrenci.id]).filter(Boolean)
    const geldi = values.filter((value) => value === 'geldi').length
    const gelmedi = values.filter((value) => value === 'gelmedi').length
    const izinli = values.filter((value) => value === 'izinli').length
    const rate = filteredStudents.length ? Math.round((geldi / filteredStudents.length) * 100) : 0
    return { geldi, gelmedi, izinli, rate }
  }, [attendance, filteredStudents])

  const unreadByStudent = useMemo(() => {
    const map = new Map<number, number>()
    messages.forEach((message) => {
      if (message.ogrenci_id && message.gonderen_rol.includes('veli') && !message.okundu) {
        map.set(message.ogrenci_id, (map.get(message.ogrenci_id) || 0) + 1)
      }
    })
    return map
  }, [messages])

  const threadMessages = useMemo(
    () => messages.filter((message) => message.ogrenci_id === selectedMessageStudentId),
    [messages, selectedMessageStudentId]
  )

  const photoGallery = useMemo(() => {
    if (!selectedPhotoStudentId) return photos
    return photos.filter((photo) => photo.ogrenci_id === selectedPhotoStudentId)
  }, [photos, selectedPhotoStudentId])

  useEffect(() => {
    if (!selectedMessageStudentId || !teacher || !okul) return
    void markMessagesReadCompat(okul.id, selectedMessageStudentId, teacher.id)
  }, [okul, selectedMessageStudentId, teacher])

  async function handleAttendanceSave() {
    if (!okul) return

    const rows = filteredStudents
      .map((ogrenci) => ({ ogrenci_id: ogrenci.id, durum: attendance[ogrenci.id] }))
      .filter((row): row is { ogrenci_id: number; durum: AttendanceStatus } => Boolean(row.durum))

    setSavingAttendance(true)
    const { error } = await upsertAttendanceCompat(okul.id, today(), rows)
    setSavingAttendance(false)

    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Yoklama kaydedilemedi.'))
      return
    }

    setStatusMessage('Yoklama başarıyla kaydedildi.')
  }

  async function handleActivitySave() {
    if (!okul || !selectedActivityStudent) return

    setSavingActivity(true)
    const { error } = await insertActivityCompat({
      okul_id: okul.id,
      ogrenci_id: selectedActivityStudent.id,
      tarih: today(),
      tur: activityType,
      detay: activityForm,
      kaydeden: teacher?.ad_soyad || 'Öğretmen',
      veli_gosterilsin: true,
    })
    setSavingActivity(false)

    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Aktivite kaydı oluşturulamadı.'))
      return
    }

    setActivityForm(createInitialActivityForm(activityType))
    setStatusMessage('Aktivite kaydı oluşturuldu.')
  }

  async function handleSendMessage() {
    if (!session || !okul || !selectedMessageStudent || !threadMessage.trim()) return

    setSendingMessage(true)

    const { data: parties, error: partyError } = await resolveTeacherMessageParties(
      session.user.id,
      okul.id,
      selectedMessageStudent.id
    )

    if (partyError || !parties) {
      setStatusMessage(getSupabaseErrorMessage(partyError, 'Veli eşleşmesi bulunamadı.'))
      setSendingMessage(false)
      return
    }

    const { error } = await insertMessageCompat(
      {
        okul_id: okul.id,
        ogrenci_id: selectedMessageStudent.id,
        gonderen_id: parties.senderId,
        gonderen_rol: 'ogretmen',
        alici_id: parties.receiverId,
        alici_tip: 'veli',
        okundu: false,
        olusturuldu: new Date().toISOString(),
      },
      threadMessage.trim()
    )

    setSendingMessage(false)

    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Mesaj gönderilemedi.'))
      return
    }

    setThreadMessage('')
    setStatusMessage('Mesaj gönderildi.')
  }

  async function handleBulkMessage() {
    if (!session || !okul || !bulkMessage.trim()) return

    const targets = filteredStudents
    setSendingBulkMessage(true)

    for (const ogrenci of targets) {
      const { data: parties, error: partyError } = await resolveTeacherMessageParties(session.user.id, okul.id, ogrenci.id)
      if (partyError || !parties) continue

      await insertMessageCompat(
        {
          okul_id: okul.id,
          ogrenci_id: ogrenci.id,
          gonderen_id: parties.senderId,
          gonderen_rol: 'ogretmen',
          alici_id: parties.receiverId,
          alici_tip: 'veli',
          okundu: false,
          olusturuldu: new Date().toISOString(),
        },
        bulkMessage.trim()
      )
    }

    setSendingBulkMessage(false)
    setBulkMessage('')
    setStatusMessage(`Toplu mesaj ${targets.length} öğrenci için kuyruğa alındı.`)
  }

  async function handleAnnouncementSave() {
    if (!okul || !announcementTitle.trim() || !announcementBody.trim()) return

    setSavingAnnouncement(true)
    const { error } = await supabase.from('duyurular').insert({
      okul_id: okul.id,
      baslik: announcementTitle.trim(),
      icerik: announcementBody.trim(),
      created_at: new Date().toISOString(),
      tarih: today(),
    })
    setSavingAnnouncement(false)

    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Duyuru kaydedilemedi.'))
      return
    }

    setAnnouncementTitle('')
    setAnnouncementBody('')
    const result = await loadAnnouncementsCompat(okul.id, 20)
    setAnnouncements(result.data || [])
    setStatusMessage('Duyuru yayınlandı.')
  }

  async function handleAnnouncementDelete(id: string) {
    const { error } = await supabase.from('duyurular').delete().eq('id', id)
    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Duyuru silinemedi.'))
      return
    }

    setAnnouncements((current) => current.filter((item) => item.id !== id))
    setStatusMessage('Duyuru silindi.')
  }

  async function handlePhotoUpload() {
    if (!okul || !selectedPhotoStudent || !photoFile) return

    setUploadingPhoto(true)
    const fileName = `${Date.now()}-${selectedPhotoStudent.id}-${photoFile.name.replace(/\s+/g, '-')}`
    const { error: uploadError } = await supabase.storage.from('fotograflar').upload(fileName, photoFile, {
      contentType: photoFile.type || 'image/jpeg',
      upsert: true,
    })

    if (uploadError) {
      setUploadingPhoto(false)
      setStatusMessage(getSupabaseErrorMessage(uploadError, 'Fotoğraf yüklenemedi.'))
      return
    }

    const { data } = supabase.storage.from('fotograflar').getPublicUrl(fileName)
    const insertResult = await supabase.from('fotograflar').insert({
      okul_id: okul.id,
      ogrenci_id: selectedPhotoStudent.id,
      url: data.publicUrl,
      aciklama: photoNote.trim(),
      sinif: selectedPhotoStudent.sinif,
      tarih: today(),
      created_at: new Date().toISOString(),
    })

    setUploadingPhoto(false)

    if (insertResult.error) {
      setStatusMessage(getSupabaseErrorMessage(insertResult.error, 'Fotoğraf kaydı oluşturulamadı.'))
      return
    }

    setPhotoFile(null)
    setPhotoNote('')
    const photoResult = await supabase.from('fotograflar').select('*').eq('okul_id', okul.id).order('id', { ascending: false }).limit(60)
    setPhotos((photoResult.data || []) as PhotoRow[])
    setStatusMessage('Fotoğraf galeriye eklendi.')
  }

  if (loading || pageLoading || !session || !okul) {
    return <LoadingScreen />
  }

  return (
    <main className={`${serif.variable} ${sans.variable} min-h-screen bg-[#f8fafc] font-sans text-[#0f172a]`}>
      <style>{`
        .input-base {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0.9rem 1rem;
          font-size: 0.95rem;
          color: #0f172a;
          outline: none;
        }
      `}</style>
      <div className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
        <header className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#10b981]">Öğretmen paneli</div>
              <h1 className="mt-3 text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.92] tracking-[-0.05em] [font-family:var(--font-serif)]">
                Sınıf akışını tek merkezden yönetin.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                {teacher?.ad_soyad || 'Öğretmen'} için yoklama, aktiviteler, mesajlar, duyurular ve galeri tek sayfada.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/${okul.slug}/admin`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#10b981] hover:text-[#10b981]">
                Admin paneli
              </Link>
              <button
                onClick={async () => {
                  await signOut()
                  router.replace('/giris')
                }}
                className="rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#059669]"
              >
                Çıkış yap
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  activeTab === tab.id ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {statusMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <PanelCard className="bg-[linear-gradient(135deg,#ecfdf5,white)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-500">Bugünün devam oranı</div>
                  <div className="mt-2 text-6xl font-semibold tracking-[-0.05em] text-[#10b981]">
                    %{attendanceSummary.rate}
                  </div>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-white px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Aktif filtre</div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">
                    {selectedClass === 'all' ? 'Tüm sınıflar' : selectedClass}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Toplam öğrenci" value={String(filteredStudents.length)} />
                <StatCard label="Geldi" value={String(attendanceSummary.geldi)} />
                <StatCard label="Gelmedi" value={String(attendanceSummary.gelmedi)} />
                <StatCard label="Okunmamış mesaj" value={String(Array.from(unreadByStudent.values()).reduce((sum, item) => sum + item, 0))} />
              </div>
            </PanelCard>

            <PanelCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Sınıf filtresi</h2>
                  <p className="mt-1 text-sm text-slate-500">Yoklama, mesaj ve toplu işlem görünümünü sınıf bazında daraltın.</p>
                </div>
                <select
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                >
                  <option value="all">Tüm sınıflar</option>
                  {classOptions.map((sinif) => (
                    <option key={sinif} value={sinif}>
                      {sinif}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 space-y-3">
                {filteredStudents.slice(0, 5).map((ogrenci) => (
                  <div key={ogrenci.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">{ogrenci.ad_soyad}</div>
                      <div className="text-xs text-slate-500">{ogrenci.sinif || 'Sınıf belirtilmedi'}</div>
                    </div>
                    <StatusBadge status={attendance[ogrenci.id] || 'gelmedi'} />
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard className="xl:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Aktivite akışı</h2>
                  <p className="mt-1 text-sm text-slate-500">Bugün oluşturulan son kayıtlar.</p>
                </div>
                <button
                  onClick={() => setActiveTab('aktiviteler')}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Yeni kayıt aç
                </button>
              </div>

              <div className="mt-6 grid gap-3">
                {activities.length ? activities.map((activity) => (
                  <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {activityOptions.find((item) => item.id === activity.tur)?.label || activity.tur} · {getActivityStudentName(activity)}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{getActivitySummary(activity)}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        {formatDateTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="Henüz aktivite yok" description="Yeni kayıtlar burada görünecek." />
                )}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'yoklama' && (
          <section className="mt-6">
            <PanelCard>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Günlük yoklama</h2>
                  <p className="mt-1 text-sm text-slate-500">Sınıfı filtreleyin, durumları seçin ve toplu kaydedin.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={selectedClass}
                    onChange={(event) => setSelectedClass(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  >
                    <option value="all">Tüm sınıflar</option>
                    {classOptions.map((sinif) => (
                      <option key={sinif} value={sinif}>
                        {sinif}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAttendanceSave}
                    disabled={savingAttendance}
                    className="rounded-full bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingAttendance ? 'Kaydediliyor...' : 'Toplu kaydet'}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {filteredStudents.map((ogrenci) => (
                  <div key={ogrenci.id} className="grid gap-3 rounded-2xl border border-slate-200 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="font-medium text-slate-900">{ogrenci.ad_soyad}</div>
                      <div className="text-xs text-slate-500">{ogrenci.sinif || 'Sınıf bilgisi yok'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attendanceOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => setAttendance((current) => ({ ...current, [ogrenci.id]: option }))}
                          className={cx(
                            'rounded-full px-4 py-2 text-sm font-semibold capitalize transition',
                            attendance[ogrenci.id] === option
                              ? 'bg-[#10b981] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'aktiviteler' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Yeni aktivite</h2>
              <div className="mt-5 space-y-4">
                <Field label="Öğrenci">
                  <select
                    value={selectedActivityStudentId ?? ''}
                    onChange={(event) => setSelectedActivityStudentId(Number(event.target.value))}
                    className="input-base"
                  >
                    {ogrenciler.map((ogrenci) => (
                      <option key={ogrenci.id} value={ogrenci.id}>
                        {ogrenci.ad_soyad}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Aktivite tipi">
                  <select
                    value={activityType}
                    onChange={(event) => {
                      const nextType = event.target.value as ActivityType
                      setActivityType(nextType)
                      setActivityForm(createInitialActivityForm(nextType))
                    }}
                    className="input-base"
                  >
                    {activityOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {activityFieldMap[activityType].map((field) => (
                  <Field key={field.key} label={field.label}>
                    {field.kind === 'textarea' && (
                      <textarea
                        value={String(activityForm[field.key] ?? '')}
                        onChange={(event) => setActivityForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        className="input-base min-h-[120px] resize-none"
                      />
                    )}

                    {field.kind === 'checkbox' && (
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(activityForm[field.key])}
                          onChange={(event) => setActivityForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                        />
                        Velinin günlük akışında görünür olsun
                      </label>
                    )}

                    {field.kind === 'select' && (
                      <select
                        value={String(activityForm[field.key] ?? '')}
                        onChange={(event) => setActivityForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        className="input-base"
                      >
                        <option value="">Seçin</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}

                    {(field.kind === 'text' || field.kind === 'number' || field.kind === 'time') && (
                      <input
                        type={field.kind === 'number' ? 'number' : field.kind}
                        value={String(activityForm[field.key] ?? '')}
                        onChange={(event) => setActivityForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        className="input-base"
                      />
                    )}
                  </Field>
                ))}

                <button
                  onClick={handleActivitySave}
                  disabled={savingActivity || !selectedActivityStudent}
                  className="w-full rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingActivity ? 'Kaydediliyor...' : 'Aktiviteyi kaydet'}
                </button>
              </div>
            </PanelCard>

            <PanelCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Son kayıtlar</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedActivityStudent ? `${selectedActivityStudent.ad_soyad} için en yeni aktiviteler` : 'Tüm sınıf akışı'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {activities
                  .filter((activity) => !selectedActivityStudentId || activity.ogrenci_id === selectedActivityStudentId)
                  .map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {activityOptions.find((item) => item.id === activity.tur)?.label || activity.tur}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{getActivitySummary(activity)}</div>
                        </div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(activity.created_at)}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'mesajlar' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <PanelCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Öğrenciler</h2>
                  <p className="mt-1 text-sm text-slate-500">Okunmamış mesaj rozetleri anlık güncellenir.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {Array.from(unreadByStudent.values()).reduce((sum, item) => sum + item, 0)} okunmamış
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {filteredStudents.map((ogrenci) => (
                  <button
                    key={ogrenci.id}
                    onClick={() => setSelectedMessageStudentId(ogrenci.id)}
                    className={cx(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition',
                      selectedMessageStudentId === ogrenci.id ? 'border-[#10b981] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div>
                      <div className="font-medium text-slate-900">{ogrenci.ad_soyad}</div>
                      <div className="text-xs text-slate-500">{ogrenci.veli_ad || 'Veli bilgisi'}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {unreadByStudent.get(ogrenci.id) || 0}
                    </span>
                  </button>
                ))}
              </div>
            </PanelCard>

            <PanelCard>
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-[24px] border border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="font-semibold text-slate-900">{selectedMessageStudent?.ad_soyad || 'Öğrenci seçin'}</div>
                    <div className="text-sm text-slate-500">{selectedMessageStudent?.sinif || 'Sınıf bilgisi'}</div>
                  </div>

                  <div className="max-h-[460px] space-y-3 overflow-y-auto px-5 py-5">
                    {threadMessages.length ? threadMessages.map((message) => (
                      <div key={message.id} className={cx('flex', message.gonderen_rol.includes('ogretmen') ? 'justify-end' : 'justify-start')}>
                        <div className={cx(
                          'max-w-[75%] rounded-[22px] px-4 py-3 text-sm shadow-sm',
                          message.gonderen_rol.includes('ogretmen')
                            ? 'bg-[#10b981] text-white'
                            : 'bg-slate-100 text-slate-700'
                        )}>
                          <div>{message.content}</div>
                          <div className={cx('mt-2 text-[11px]', message.gonderen_rol.includes('ogretmen') ? 'text-emerald-100' : 'text-slate-400')}>
                            {formatDateTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <EmptyState title="Henüz mesaj yok" description="Bu öğrenci ile yazışma başladığında burada görünecek." />
                    )}
                  </div>

                  <div className="border-t border-slate-200 px-5 py-4">
                    <textarea
                      value={threadMessage}
                      onChange={(event) => setThreadMessage(event.target.value)}
                      className="input-base min-h-[110px] resize-none"
                      placeholder="Öğrenci velisine mesaj yazın..."
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !selectedMessageStudent}
                      className="mt-3 rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {sendingMessage ? 'Gönderiliyor...' : 'Mesaj gönder'}
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-base font-semibold text-slate-900">Toplu mesaj</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Mesaj, mevcut sınıf filtresindeki velilere gönderilir.
                  </p>
                  <textarea
                    value={bulkMessage}
                    onChange={(event) => setBulkMessage(event.target.value)}
                    className="input-base mt-4 min-h-[160px] resize-none bg-white"
                    placeholder="Sınıf bilgilendirmesi yazın..."
                  />
                  <button
                    onClick={handleBulkMessage}
                    disabled={sendingBulkMessage || !filteredStudents.length}
                    className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {sendingBulkMessage ? 'Gönderiliyor...' : 'Toplu mesaj gönder'}
                  </button>
                </div>
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'duyurular' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Yeni duyuru</h2>
              <div className="mt-5 space-y-4">
                <Field label="Başlık">
                  <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} className="input-base" />
                </Field>
                <Field label="İçerik">
                  <textarea
                    value={announcementBody}
                    onChange={(event) => setAnnouncementBody(event.target.value)}
                    className="input-base min-h-[160px] resize-none"
                  />
                </Field>
                <button
                  onClick={handleAnnouncementSave}
                  disabled={savingAnnouncement}
                  className="w-full rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingAnnouncement ? 'Yayınlanıyor...' : 'Duyuruyu yayınla'}
                </button>
              </div>
            </PanelCard>

            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Duyuru listesi</h2>
              <div className="mt-6 space-y-3">
                {announcements.length ? announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{announcement.baslik}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{announcement.icerik}</div>
                        <div className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                          {formatDateTime(announcement.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAnnouncementDelete(announcement.id)}
                        className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                )) : (
                  <EmptyState title="Duyuru bulunamadı" description="Yayınlanan duyurular burada listelenecek." />
                )}
              </div>
            </PanelCard>
          </section>
        )}

        {activeTab === 'fotograflar' && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <PanelCard>
              <h2 className="text-lg font-semibold text-slate-900">Supabase Storage yükleme</h2>
              <div className="mt-5 space-y-4">
                <Field label="Öğrenci">
                  <select
                    value={selectedPhotoStudentId ?? ''}
                    onChange={(event) => setSelectedPhotoStudentId(Number(event.target.value))}
                    className="input-base"
                  >
                    {ogrenciler.map((ogrenci) => (
                      <option key={ogrenci.id} value={ogrenci.id}>
                        {ogrenci.ad_soyad}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Açıklama">
                  <textarea value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} className="input-base min-h-[120px] resize-none" />
                </Field>
                <Field label="Dosya">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                  />
                </Field>
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto || !selectedPhotoStudent || !photoFile}
                  className="w-full rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {uploadingPhoto ? 'Yükleniyor...' : 'Fotoğrafı yükle'}
                </button>
              </div>
            </PanelCard>

            <PanelCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Galeri</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPhotoStudent ? `${selectedPhotoStudent.ad_soyad} için son yüklemeler` : 'Tüm fotoğraflar'}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {photoGallery.length ? photoGallery.map((photo) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                    <img src={photo.url} alt={photo.aciklama || 'Öğrenci fotoğrafı'} className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                    <div className="space-y-2 p-4">
                      <div className="text-sm font-medium text-slate-900">{photo.aciklama || 'Açıklama yok'}</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        {photo.sinif || selectedPhotoStudent?.sinif || 'Sınıf'} · {formatDateTime(photo.created_at || photo.tarih)}
                      </div>
                    </div>
                  </a>
                )) : (
                  <div className="sm:col-span-2 xl:col-span-3">
                    <EmptyState title="Galeri boş" description="İlk yükleme yapıldığında burada görünür." />
                  </div>
                )}
              </div>
            </PanelCard>
          </section>
        )}
      </div>
    </main>
  )
}

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={cx('rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm', className)}>{children}</section>
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const palette =
    status === 'geldi'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'izinli'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-rose-50 text-rose-700'

  return <span className={cx('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]', palette)}>{status}</span>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-500">{description}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-slate-500">
      Panel hazırlanıyor...
    </div>
  )
}
