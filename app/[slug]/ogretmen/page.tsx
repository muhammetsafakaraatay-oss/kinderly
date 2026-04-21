'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { ThemeToggle } from '@/components/theme-toggle'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { rolePath } from '@/lib/auth-helpers'
import {
  getUserFacingErrorMessage,
  getSupabaseErrorMessage,
  insertActivityCompat,
  insertAnnouncementCompat,
  loadAnnouncementsCompat,
  loadSchoolMessagesCompat,
  markMessagesReadCompat,
  resolveTeacherMessageParties,
  sendMessageToRecipientsCompat,
  upsertAttendanceCompat,
  withSignedPhotoUrls,
  type AnnouncementItem,
  type NormalizedMessage,
} from '@/lib/supabase-helpers'
import type { Ogrenci, Okul } from '@/lib/types'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-serif' })
const sans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

type TeacherTab = 'dashboard' | 'yoklama' | 'aktiviteler' | 'mesajlar' | 'duyurular' | 'fotograflar' | 'gunluk' | 'ayarlar'
type AttendanceStatus = 'geldi' | 'gelmedi' | 'izinli' | ''
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
  detay?: Record<string, unknown> | null
  kaydeden?: string | null
  created_at?: string | null
  olusturuldu?: string | null
  ogrenciler?: { ad_soyad?: string | null } | { ad_soyad?: string | null }[] | null
}

type PhotoCard = {
  id: number
  ogrenci_id: number
  studentName: string
  note: string
  imageUrl: string | null
  createdAt: string | null
}

const tabs: Array<{ id: TeacherTab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'yoklama', label: 'Yoklama', icon: '✅' },
  { id: 'aktiviteler', label: 'Aktiviteler', icon: '⚡' },
  { id: 'mesajlar', label: 'Mesajlar', icon: '💬' },
  { id: 'duyurular', label: 'Duyurular', icon: '📢' },
  { id: 'fotograflar', label: 'Fotoğraflar', icon: '📷' },
  { id: 'gunluk', label: 'Günlük Rapor', icon: '📋' },
  { id: 'ayarlar', label: 'Ayarlar', icon: '⚙️' },
]

const activityTypeConfig: Array<{ id: ActivityType; label: string; emoji: string; color: string; bg: string }> = [
  { id: 'food', label: 'Yemek', emoji: '🍎', color: '#00b884', bg: '#dcfce7' },
  { id: 'nap', label: 'Uyku', emoji: '😴', color: '#3d4eb8', bg: '#e0e7ff' },
  { id: 'potty', label: 'Tuvalet', emoji: '🚽', color: '#00b8d4', bg: '#e0f2fe' },
  { id: 'photo', label: 'Fotoğraf', emoji: '📷', color: '#e91e8c', bg: '#fce7f3' },
  { id: 'kudos', label: 'Tebrik', emoji: '⭐', color: '#9c27b0', bg: '#f3e8ff' },
  { id: 'meds', label: 'İlaç', emoji: '💊', color: '#f5a623', bg: '#fef3c7' },
  { id: 'incident', label: 'Kaza', emoji: '🩹', color: '#f44336', bg: '#fee2e2' },
  { id: 'health', label: 'Sağlık', emoji: '🌡️', color: '#7c4dff', bg: '#ede9fe' },
  { id: 'note', label: 'Not', emoji: '📝', color: '#00897b', bg: '#ccfbf1' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function initials(name?: string | null) {
  return (name || 'Kinderly')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDateLabel(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
}

function formatTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Bugün'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Bugün'
  return date.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function activityMeta(type: string) {
  return activityTypeConfig.find((item) => item.id === type) || { id: type as ActivityType, label: type, emoji: '📋', color: '#64748b', bg: '#f1f5f9' }
}

function activityStudentName(activity: ActivityRow) {
  if (Array.isArray(activity.ogrenciler)) return activity.ogrenciler[0]?.ad_soyad || 'Öğrenci'
  return activity.ogrenciler?.ad_soyad || 'Öğrenci'
}

function activitySummary(activity: ActivityRow) {
  const detay = activity.detay || {}
  const values = [
    detay.not,
    detay.aciklama,
    detay.ogun ? `${String(detay.ogun)}${detay.yeme ? ` · ${String(detay.yeme)}` : ''}` : null,
    detay.sure,
    detay.ilac ? `${String(detay.ilac)}${detay.doz ? ` · ${String(detay.doz)}` : ''}` : null,
    detay.ates ? `${String(detay.ates)}°C` : null,
    detay.olay,
    detay.durum,
  ].filter(Boolean)

  return values[0] ? String(values[0]) : 'Detay eklenmedi'
}

function activityPhotoUrl(activity: ActivityRow) {
  return activity.tur === 'photo' && typeof activity.detay?.url === 'string' ? activity.detay.url : null
}

async function uploadPhotoFile(okulId: number | string, ogrenciId: number, file: File) {
  const storagePath = `${okulId}/${ogrenciId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
  const { error } = await supabase.storage.from('photos').upload(storagePath, file, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  })

  if (error) throw error
  return storagePath
}

export default function OgretmenPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { session, role, okul: authOkul, loading, hasValidSession, signOut } = useAuth()
  const [slug, setSlug] = useState('')
  const [activeTab, setActiveTab] = useState<TeacherTab>('dashboard')
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [students, setStudents] = useState<Ogrenci[]>([])
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({})
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [messages, setMessages] = useState<NormalizedMessage[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [photoCards, setPhotoCards] = useState<PhotoCard[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [selectedActivityStudentId, setSelectedActivityStudentId] = useState<number | null>(null)
  const [selectedMessageStudentId, setSelectedMessageStudentId] = useState<number | null>(null)
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<number | null>(null)
  const [selectedPhotoStudentId, setSelectedPhotoStudentId] = useState<number | null>(null)
  const [activityType, setActivityType] = useState<ActivityType>('food')
  const [activityForm, setActivityForm] = useState<Record<string, string>>({})
  const [activityNote, setActivityNote] = useState('')
  const [activityPhotoFile, setActivityPhotoFile] = useState<File | null>(null)
  const [threadDraft, setThreadDraft] = useState('')
  const [bulkDraft, setBulkDraft] = useState('')
  const [announcementForm, setAnnouncementForm] = useState({ baslik: '', icerik: '' })
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [galleryUpload, setGalleryUpload] = useState<File | null>(null)
  const [galleryNote, setGalleryNote] = useState('')
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [sendingThread, setSendingThread] = useState(false)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [authTimeout, setAuthTimeout] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ yeni: '', tekrar: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const dark = resolvedTheme === 'dark'
  // Prevents re-fetching when auth fires TOKEN_REFRESHED for the same user/school
  const loadedRef = useRef<string | null>(null)
  const teacherStudentIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    void params.then((value) => setSlug(value.slug))
  }, [params])

  const okul = authOkul as Okul | null

  useEffect(() => {
    if ((loading && !hasValidSession) || !slug) return

    if (!session || !authOkul) {
      if (hasValidSession) return
      // Reset loadedRef so the next login (same account) triggers a fresh data load.
      loadedRef.current = null
      router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/ogretmen`)}`)
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
  }, [authOkul, hasValidSession, loading, role, router, session, slug])

  useEffect(() => {
    if (!loading || hasValidSession) {
      if (!authTimeout) return
      const resetTimeout = window.setTimeout(() => setAuthTimeout(false), 0)
      return () => window.clearTimeout(resetTimeout)
    }
    const timeout = window.setTimeout(() => setAuthTimeout(true), 10000)
    return () => window.clearTimeout(timeout)
  }, [authTimeout, hasValidSession, loading])

  useEffect(() => {
    if (!authTimeout || session || hasValidSession) return
    router.replace(`/giris?redirect=${encodeURIComponent(`/${slug}/ogretmen`)}`)
  }, [authTimeout, hasValidSession, router, session, slug])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session && okul) {
        setPageLoading(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, okul])

  useEffect(() => {
    if (!okul || !session) return

    // Guard: skip if we already loaded data for this exact school+user combo.
    // Prevents duplicate loads when auth fires TOKEN_REFRESHED or INITIAL_SESSION.
    const loadKey = `${okul.id}-${session.user.id}`
    if (loadedRef.current === loadKey) {
      // Effect re-ran (auth emitted) but data is already loaded — ensure loading is cleared.
      setPageLoading(false)
      return
    }
    loadedRef.current = loadKey

    let alive = true
    const currentOkul = okul
    const currentSession = session

    async function loadData() {
      setPageLoading(true)
      try {
        const [{ data: personel, error: personelError }, { data: studentRows, error: studentError }] = await Promise.all([
          supabase
            .from('personel')
            .select('id,ad_soyad,sinif')
            .eq('user_id', currentSession.user.id)
            .eq('okul_id', currentOkul.id)
            .maybeSingle(),
          supabase
            .from('ogrenciler')
            .select('id,ad_soyad,sinif,okul_id,aktif,dogum_tarihi')
            .eq('okul_id', currentOkul.id)
            .eq('aktif', true)
            .order('ad_soyad'),
        ])

        if (!alive) return

        if (personelError || !personel?.id) {
          setStatusMessage(getSupabaseErrorMessage(personelError, 'Öğretmen bilgisi yüklenemedi.'))
          return
        }

        if (studentError) {
          setStatusMessage(getSupabaseErrorMessage(studentError, 'Öğrenciler yüklenemedi.'))
        }

        const allStudents = (studentRows || []) as Ogrenci[]
        const teacherAssignedClass = typeof personel.sinif === 'string' ? personel.sinif.trim() : ''
        const nextStudents = teacherAssignedClass
          ? allStudents.filter((student) => student.sinif === teacherAssignedClass)
          : []
        const allowedStudentIds = new Set(nextStudents.map((student) => student.id))
        teacherStudentIdsRef.current = allowedStudentIds

        if (!teacherAssignedClass) {
          setStatusMessage('Bu öğretmene sınıf atanmamış. Admin panelinden sınıf seçildiğinde öğrenciler görünecek.')
        }

        const [attendanceQuery, activityQuery, messageQuery, announcementQuery] = await Promise.all([
          supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', currentOkul.id).eq('tarih', today()),
          supabase
            .from('aktiviteler')
            .select('id,ogrenci_id,tur,detay,kaydeden,created_at,olusturuldu,ogrenciler(ad_soyad)')
            .eq('okul_id', currentOkul.id)
            .eq('tarih', today())
            .order('id', { ascending: false })
            .limit(120),
          loadSchoolMessagesCompat(currentOkul.id, 400),
          loadAnnouncementsCompat(currentOkul.id, 30),
        ])

        if (!alive) return

        const nextAttendance: Record<number, AttendanceStatus> = {}
        ;(attendanceQuery.data || []).forEach((row: { ogrenci_id: number; durum: AttendanceStatus }) => {
          if (!allowedStudentIds.has(row.ogrenci_id)) return
          nextAttendance[row.ogrenci_id] = row.durum
        })

        const rawActivityRows = ((activityQuery.data || []) as ActivityRow[]).filter((activity) => allowedStudentIds.has(activity.ogrenci_id))
        const activityRows = await withSignedPhotoUrls(rawActivityRows)
        const photoRows = activityRows.filter((item) => item.tur === 'photo')
        const nextPhotos = photoRows.map((row) => {
            const detay = row.detay || {}
            const existingUrl = typeof detay.url === 'string' ? detay.url : null
            return {
              id: row.id,
              ogrenci_id: row.ogrenci_id,
              studentName: activityStudentName(row),
              note: typeof detay.not === 'string' ? detay.not : typeof detay.aciklama === 'string' ? detay.aciklama : '',
              imageUrl: existingUrl,
              createdAt: row.created_at || row.olusturuldu || null,
            } satisfies PhotoCard
          })

        const teacherClass = teacherAssignedClass || 'all'
        setTeacher(personel as TeacherProfile)
        setStudents(nextStudents)
        setAttendance(nextAttendance)
        setActivities(activityRows)
        setMessages((messageQuery.data || []).filter((message) => !message.ogrenci_id || allowedStudentIds.has(message.ogrenci_id)))
        setAnnouncements(announcementQuery.data || [])
        setPhotoCards(nextPhotos.filter((item) => item.imageUrl))
        setClassFilter((current) => (current === 'all' ? teacherClass : current))
        setSelectedActivityStudentId((current) => current ?? nextStudents[0]?.id ?? null)
        setSelectedMessageStudentId((current) => current ?? nextStudents[0]?.id ?? null)
        setSelectedReportStudentId((current) => current ?? nextStudents[0]?.id ?? null)
        setSelectedPhotoStudentId((current) => current ?? nextStudents[0]?.id ?? null)
      } catch (error) {
        if (!alive) return
        setStatusMessage(getSupabaseErrorMessage(error as { message?: string }, 'Panel verileri yüklenemedi.'))
      } finally {
        // Always clear loading — even if effect re-ran (alive=false) we must not stay stuck.
        setPageLoading(false)
      }
    }

    void loadData()

    const channel = supabase
      .channel(`ogretmen-web-${currentOkul.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesajlar', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const result = await loadSchoolMessagesCompat(currentOkul.id, 400)
        const allowedIds = teacherStudentIdsRef.current
        setMessages((result.data || []).filter((message) => !message.ogrenci_id || allowedIds.has(message.ogrenci_id)))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aktiviteler', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const { data } = await supabase
          .from('aktiviteler')
          .select('id,ogrenci_id,tur,detay,kaydeden,created_at,olusturuldu,ogrenciler(ad_soyad)')
          .eq('okul_id', currentOkul.id)
          .eq('tarih', today())
          .order('id', { ascending: false })
          .limit(120)
        const allowedIds = teacherStudentIdsRef.current
        const rows = await withSignedPhotoUrls(((data || []) as ActivityRow[]).filter((item) => allowedIds.has(item.ogrenci_id)))
        setActivities(rows)
        const nextPhotos = rows.filter((item) => item.tur === 'photo').map((row) => {
            const detay = row.detay || {}
            const existingUrl = typeof detay.url === 'string' ? detay.url : null
            return {
              id: row.id,
              ogrenci_id: row.ogrenci_id,
              studentName: activityStudentName(row),
              note: typeof detay.not === 'string' ? detay.not : typeof detay.aciklama === 'string' ? detay.aciklama : '',
              imageUrl: existingUrl,
              createdAt: row.created_at || row.olusturuldu || null,
            } satisfies PhotoCard
          })
        setPhotoCards(nextPhotos.filter((item) => item.imageUrl))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yoklama', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const { data } = await supabase.from('yoklama').select('ogrenci_id,durum').eq('okul_id', currentOkul.id).eq('tarih', today())
        const allowedIds = teacherStudentIdsRef.current
        const nextAttendance: Record<number, AttendanceStatus> = {}
        ;(data || []).forEach((row: { ogrenci_id: number; durum: AttendanceStatus }) => {
          if (!allowedIds.has(row.ogrenci_id)) return
          nextAttendance[row.ogrenci_id] = row.durum
        })
        setAttendance(nextAttendance)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duyurular', filter: `okul_id=eq.${currentOkul.id}` }, async () => {
        const result = await loadAnnouncementsCompat(currentOkul.id, 30)
        setAnnouncements(result.data || [])
      })
      .subscribe()

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [okul, session])

  const classOptions = useMemo(() => {
    const values = Array.from(new Set(students.map((student) => student.sinif).filter(Boolean))) as string[]
    return values.sort((a, b) => a.localeCompare(b, 'tr'))
  }, [students])

  const filteredStudents = useMemo(() => {
    const byClass = classFilter === 'all' ? students : students.filter((student) => student.sinif === classFilter)
    return byClass
  }, [classFilter, students])

  const searchableStudents = useMemo(() => {
    const base = filteredStudents.length ? filteredStudents : students
    if (!activitySearch.trim()) return base
    return base.filter((student) => student.ad_soyad.toLocaleLowerCase('tr-TR').includes(activitySearch.toLocaleLowerCase('tr-TR')))
  }, [activitySearch, filteredStudents, students])

  const attendanceStats = useMemo(() => {
    const values = filteredStudents.map((student) => attendance[student.id])
    const geldi = values.filter((value) => value === 'geldi').length
    const gelmedi = values.filter((value) => value === 'gelmedi').length
    const izinli = values.filter((value) => value === 'izinli').length
    const bekliyor = filteredStudents.length - geldi - gelmedi - izinli
    const progress = filteredStudents.length ? Math.round((geldi / filteredStudents.length) * 100) : 0
    return { geldi, gelmedi, izinli, bekliyor, progress }
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

  const selectedMessageStudent = useMemo(
    () => students.find((student) => student.id === selectedMessageStudentId) || null,
    [selectedMessageStudentId, students]
  )

  const selectedReportStudent = useMemo(
    () => students.find((student) => student.id === selectedReportStudentId) || null,
    [selectedReportStudentId, students]
  )

  const messageThread = useMemo(
    () => messages.filter((message) => message.ogrenci_id === selectedMessageStudentId).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [messages, selectedMessageStudentId]
  )

  const reportActivities = useMemo(
    () => activities.filter((activity) => activity.ogrenci_id === selectedReportStudentId),
    [activities, selectedReportStudentId]
  )

  const galleryItems = useMemo(
    () => selectedPhotoStudentId ? photoCards.filter((item) => item.ogrenci_id === selectedPhotoStudentId) : photoCards,
    [photoCards, selectedPhotoStudentId]
  )

  useEffect(() => {
    if (!okul || !selectedMessageStudentId || !teacher) return
    void markMessagesReadCompat(okul.id, selectedMessageStudentId, teacher.id)
  }, [okul, selectedMessageStudentId, teacher])

  async function handleAttendanceSave() {
    if (!okul) return

    setSavingAttendance(true)
    const rows = filteredStudents
      .filter((student) => attendance[student.id])
      .map((student) => ({ ogrenci_id: student.id, durum: attendance[student.id] }))

    const { error } = await upsertAttendanceCompat(okul.id, today(), rows)
    setSavingAttendance(false)

    if (error) {
      setStatusMessage(getUserFacingErrorMessage(error, 'Yoklama kaydedilemedi.'))
      return
    }

    setStatusMessage('Yoklama başarıyla kaydedildi.')
  }

  async function handleActivitySave() {
    if (!okul || !selectedActivityStudentId) return

    setSavingActivity(true)
    const detail: Record<string, unknown> = { ...activityForm }
    if (activityNote.trim()) detail.not = activityNote.trim()

    try {
      if (activityType === 'photo' && activityPhotoFile) {
        const storagePath = await uploadPhotoFile(okul.id, selectedActivityStudentId, activityPhotoFile)
        detail.storagePath = storagePath
        detail.url = null
      }

      const { error } = await insertActivityCompat({
        okul_id: okul.id,
        ogrenci_id: selectedActivityStudentId,
        tarih: today(),
        tur: activityType,
        detay: detail,
        kaydeden: teacher?.ad_soyad || 'Öğretmen',
        veli_gosterilsin: true,
      })

      setSavingActivity(false)

      if (error) {
        setStatusMessage(getUserFacingErrorMessage(error, 'Aktivite kaydedilemedi.'))
        return
      }

      setActivityForm({})
      setActivityNote('')
      setActivityPhotoFile(null)
      setStatusMessage('Aktivite kaydı oluşturuldu.')
    } catch (error) {
      setSavingActivity(false)
      setStatusMessage(getUserFacingErrorMessage(error as { message?: string }, 'Fotoğraf yüklenemedi.'))
    }
  }

  async function handleSendMessage() {
    if (!session || !okul || !selectedMessageStudent || !threadDraft.trim()) return

    setSendingThread(true)
    const { data: parties, error: partyError } = await resolveTeacherMessageParties(session.user.id, okul.id, selectedMessageStudent.id)
    if (partyError || !parties) {
      setSendingThread(false)
      setStatusMessage(getUserFacingErrorMessage(partyError, 'Veli eşleşmesi bulunamadı.'))
      return
    }

    const result = await sendMessageToRecipientsCompat({
      okul_id: okul.id,
      ogrenci_id: selectedMessageStudent.id,
      gonderen_id: parties.senderId,
      gonderen_rol: 'ogretmen',
      gonderen_ad: teacher?.ad_soyad || 'Öğretmen',
      alici_tip: 'veli',
      okundu: false,
      created_at: new Date().toISOString(),
    }, parties.receiverIds, threadDraft.trim())

    setSendingThread(false)

    if (result.error) {
      setStatusMessage(getUserFacingErrorMessage(result.error, 'Mesaj gönderilemedi.'))
      return
    }

    setThreadDraft('')
    setStatusMessage(result.failedCount > 0
      ? `Mesaj ${result.sentCount} veliye gönderildi, ${result.failedCount} veliye gönderilemedi.`
      : 'Mesaj gönderildi.')
  }

  async function handleBulkMessage() {
    if (!session || !okul || !bulkDraft.trim()) return
    setSendingBulk(true)

    let sentCount = 0
    let failedCount = 0
    for (const student of filteredStudents) {
      const { data: parties } = await resolveTeacherMessageParties(session.user.id, okul.id, student.id)
      if (!parties?.receiverIds?.length) continue
      const result = await sendMessageToRecipientsCompat({
        okul_id: okul.id,
        ogrenci_id: student.id,
        gonderen_id: parties.senderId,
        gonderen_rol: 'ogretmen',
        gonderen_ad: teacher?.ad_soyad || 'Öğretmen',
        alici_tip: 'veli',
        okundu: false,
        created_at: new Date().toISOString(),
      }, parties.receiverIds, bulkDraft.trim())
      sentCount += result.sentCount > 0 ? 1 : 0
      failedCount += result.failedCount
    }

    setSendingBulk(false)
    setBulkDraft('')
    setStatusMessage(failedCount > 0
      ? `Toplu mesaj ${sentCount} öğrenci hattına iletildi, ${failedCount} veliye gönderilemedi.`
      : `Toplu mesaj ${sentCount} öğrenci hattına iletildi.`)
  }

  async function handleAnnouncementSave() {
    if (!okul || !announcementForm.baslik.trim() || !announcementForm.icerik.trim()) return

    setSavingAnnouncement(true)
    const { error } = await insertAnnouncementCompat(
      { okul_id: okul.id, gonderen_id: session?.user.id ?? null },
      announcementForm.baslik.trim(),
      announcementForm.icerik.trim()
    )
    setSavingAnnouncement(false)

    if (error) {
      setStatusMessage(getSupabaseErrorMessage(error, 'Duyuru yayınlanamadı.'))
      return
    }

    setAnnouncementForm({ baslik: '', icerik: '' })
    setAnnouncementModalOpen(false)
    const result = await loadAnnouncementsCompat(okul.id, 30)
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
  }

  async function handleGalleryUpload() {
    if (!okul || !selectedPhotoStudentId || !galleryUpload) return

    setUploadingGallery(true)
    try {
      const storagePath = await uploadPhotoFile(okul.id, selectedPhotoStudentId, galleryUpload)
      const { error } = await insertActivityCompat({
        okul_id: okul.id,
        ogrenci_id: selectedPhotoStudentId,
        tarih: today(),
        tur: 'photo',
        detay: {
          storagePath,
          not: galleryNote.trim(),
        },
        kaydeden: teacher?.ad_soyad || 'Öğretmen',
        veli_gosterilsin: true,
      })
      setUploadingGallery(false)

      if (error) {
        setStatusMessage(getSupabaseErrorMessage(error, 'Fotoğraf paylaşılamadı.'))
        return
      }

      setGalleryUpload(null)
      setGalleryNote('')
      setStatusMessage('Fotoğraf galeriye eklendi.')
    } catch (error) {
      setUploadingGallery(false)
      setStatusMessage(getSupabaseErrorMessage(error as { message?: string }, 'Fotoğraf yüklenemedi.'))
    }
  }

  async function handlePasswordChange() {
    if (!passwordForm.yeni.trim() || passwordForm.yeni.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (passwordForm.yeni !== passwordForm.tekrar) {
      setPasswordError('Şifreler eşleşmiyor.')
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.yeni })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setPasswordSuccess(true)
    setPasswordForm({ yeni: '', tekrar: '' })
  }

  if ((loading && !hasValidSession) || pageLoading || !session || !okul) {
    if (authTimeout && !hasValidSession) return <LoadingScreen message="Oturum doğrulanamadı, giriş ekranına yönlendiriliyor..." />
    return <TeacherPanelSkeleton dark={dark} />
  }

  const totalUnread = Array.from(unreadByStudent.values()).reduce((sum, value) => sum + value, 0)
  const allStudents = students.length
  const activityToday = activities.length

  return (
    <main className={`${serif.variable} ${sans.variable} ${dark ? 'panel-skin-dark' : ''} min-h-screen bg-[var(--bg)] font-sans text-[var(--text)]`}>
      <style>{`
        .panel-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 0.85rem 1rem;
          background: #fff;
          color: #0f172a;
          outline: none;
        }
        .panel-skin-dark {
          --bg: #090b10;
          --card: #111317;
          --border-subtle: #252a33;
          --text: #f3f4f6;
          --muted-text: #9ca3af;
        }
        .panel-skin-dark .panel-input {
          background: #1a1d23;
          border-color: #343a45;
          color: #f3f4f6;
        }
        .panel-skin-dark .text-slate-900 { color: #f3f4f6 !important; }
        .panel-skin-dark .text-slate-600 { color: #d1d5db !important; }
        .panel-skin-dark .text-slate-500 { color: #9ca3af !important; }
        .panel-skin-dark .text-slate-400 { color: #94a3b8 !important; }
        .panel-skin-dark .bg-slate-50 { background: #111317 !important; }
        .panel-skin-dark .bg-white { background: #111317 !important; }
        .panel-skin-dark .border-slate-200 { border-color: #252a33 !important; }
        .panel-skin-dark .ring-slate-200 { --tw-ring-color: #252a33 !important; }
        .panel-skin-dark .hover\\:bg-slate-100:hover { background: #1a1d23 !important; }
      `}</style>

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-[var(--border-subtle)] bg-[var(--card)] shadow-sm lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:flex-none lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="flex items-center gap-3">
              {okul.logo_url ? (
                <img src={okul.logo_url} alt={okul.ad} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10b981] text-lg font-bold text-white">
                  {initials(okul.ad)}
                </div>
              )}
              <div>
                <div className="text-base font-semibold text-slate-900">{okul.ad}</div>
                <div className="text-sm text-slate-500">Öğretmen Paneli</div>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition',
                    activeTab === tab.id ? 'bg-emerald-50 text-[#10b981]' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{teacher?.ad_soyad || 'Öğretmen'}</div>
              <div className="mt-1 text-xs text-slate-500">{teacher?.sinif || 'Tüm sınıflar'}</div>
              <button
                onClick={async () => {
                  await signOut()
                  window.location.href = '/giris'
                }}
                className="mt-4 w-full rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-semibold text-white"
              >
                Çıkış yap
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 px-4 py-5 lg:px-8 lg:py-7">
          <header className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--card)] px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#10b981]">{tabs.find((tab) => tab.id === activeTab)?.label}</div>
                <h1 className="mt-2 text-[clamp(2rem,4vw,3.8rem)] leading-[0.95] tracking-[-0.05em] text-slate-900 [font-family:var(--font-serif)]">
                  Sınıf akışını webde yönetin.
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-500">{formatDateLabel()} · {teacher?.sinif || 'Tüm sınıflar'}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ThemeToggle />
                <Link href={`/${okul.slug}/admin`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#10b981] hover:text-[#10b981]">
                  Admin paneli
                </Link>
                <button onClick={() => setActiveTab('yoklama')} className="rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white">
                  Bugünün yoklaması
                </button>
              </div>
            </div>
          </header>

          {statusMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <section className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Toplam Öğrenci" value={String(allStudents)} icon="👦" accent="#10b981" bg="#dcfce7" />
                <StatCard label="Bugün Geldi" value={String(attendanceStats.geldi)} icon="✅" accent="#0284c7" bg="#dbeafe" />
                <StatCard label="Bugün Aktivite" value={String(activityToday)} icon="⚡" accent="#d97706" bg="#fef3c7" />
                <StatCard label="Okunmamış Mesaj" value={String(totalUnread)} icon="💬" accent="#7c3aed" bg="#ede9fe" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <PanelCard>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Yoklama ilerlemesi</h2>
                      <p className="mt-1 text-sm text-slate-500">{attendanceStats.geldi}/{filteredStudents.length || allStudents} öğrenci işaretlendi</p>
                    </div>
                    <button onClick={() => setActiveTab('yoklama')} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                      Detaya git
                    </button>
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${attendanceStats.progress}%` }} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <MiniCount label="Geldi" value={attendanceStats.geldi} tone="text-emerald-600" />
                    <MiniCount label="Gelmedi" value={attendanceStats.gelmedi} tone="text-rose-600" />
                    <MiniCount label="İzinli" value={attendanceStats.izinli} tone="text-amber-600" />
                    <MiniCount label="Bekliyor" value={attendanceStats.bekliyor} tone="text-slate-500" />
                  </div>
                </PanelCard>

                <PanelCard>
                  <h2 className="text-lg font-semibold text-slate-900">Hızlı erişim</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {tabs.filter((tab) => tab.id !== 'dashboard').map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-[#10b981] hover:bg-emerald-50">
                        <div className="text-2xl">{tab.icon}</div>
                        <div className="mt-3 text-sm font-semibold text-slate-900">{tab.label}</div>
                      </button>
                    ))}
                  </div>
                </PanelCard>
              </div>

              <PanelCard>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Son aktiviteler</h2>
                    <p className="mt-1 text-sm text-slate-500">Mobil akışın web görünümü</p>
                  </div>
                  <button onClick={() => setActiveTab('aktiviteler')} className="rounded-full bg-[#10b981] px-4 py-2 text-sm font-semibold text-white">
                    Aktivite ekle
                  </button>
                </div>
                <div className="mt-6 space-y-3">
                  {activities.slice(0, 8).map((activity) => {
                    const meta = activityMeta(activity.tur)
                    const photoUrl = activityPhotoUrl(activity)
                    return (
                      <div key={activity.id} className="flex items-start gap-4 rounded-[22px] border border-slate-200 px-4 py-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg }}>
                          <span className="text-xl">{meta.emoji}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">{meta.label} · {activityStudentName(activity)}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatTime(activity.created_at || activity.olusturuldu)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{activitySummary(activity)}</div>
                          {photoUrl ? (
                            <a href={photoUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                              <img src={photoUrl} alt="Aktivite fotoğrafı" className="h-52 w-full object-cover" />
                            </a>
                          ) : null}
                          {activity.tur === 'photo' && !photoUrl ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                              Fotoğraf yükleniyor veya erişim izni bekleniyor.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'yoklama' && (
            <section className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <StatusCard label="Geldi" value={attendanceStats.geldi} bg="bg-emerald-50" text="text-emerald-700" />
                <StatusCard label="Gelmedi" value={attendanceStats.gelmedi} bg="bg-rose-50" text="text-rose-700" />
                <StatusCard label="İzinli" value={attendanceStats.izinli} bg="bg-amber-50" text="text-amber-700" />
                <StatusCard label="Bekliyor" value={attendanceStats.bekliyor} bg="bg-slate-100" text="text-slate-700" />
              </div>

              <PanelCard>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Chip active={classFilter === 'all'} onClick={() => setClassFilter('all')}>Tümü</Chip>
                    {classOptions.map((sinif) => (
                      <Chip key={sinif} active={classFilter === sinif} onClick={() => setClassFilter(sinif)}>{sinif}</Chip>
                    ))}
                  </div>
                  <button onClick={handleAttendanceSave} disabled={savingAttendance} className="rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {savingAttendance ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className={cx(
                      'grid gap-4 rounded-[22px] border px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center',
                      attendance[student.id] === 'geldi' ? 'border-emerald-200 bg-emerald-50/60' :
                        attendance[student.id] === 'gelmedi' ? 'border-rose-200 bg-rose-50/60' :
                          attendance[student.id] === 'izinli' ? 'border-amber-200 bg-amber-50/60' :
                            'border-slate-200 bg-white'
                    )}>
                      <div>
                        <div className="font-semibold text-slate-900">{student.ad_soyad}</div>
                        <div className="text-xs text-slate-500">{student.sinif || 'Sınıf bilgisi yok'}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'geldi', label: 'Geldi ✓' },
                          { id: 'gelmedi', label: 'Gelmedi ✗' },
                          { id: 'izinli', label: 'İzinli İ' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setAttendance((current) => ({ ...current, [student.id]: current[student.id] === option.id ? '' : option.id as AttendanceStatus }))}
                            className={cx(
                              'rounded-full px-4 py-2 text-sm font-semibold transition',
                              attendance[student.id] === option.id ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            )}
                          >
                            {option.label}
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
            <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
              <PanelCard>
                <input
                  value={activitySearch}
                  onChange={(event) => setActivitySearch(event.target.value)}
                  className="panel-input"
                  placeholder="Öğrenci ara..."
                />
                <div className="mt-4 max-h-[680px] space-y-2 overflow-y-auto">
                  {searchableStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedActivityStudentId(student.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition',
                        selectedActivityStudentId === student.id ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className={cx('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', selectedActivityStudentId === student.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')}>
                        {initials(student.ad_soyad)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{student.ad_soyad}</div>
                        <div className={cx('text-xs', selectedActivityStudentId === student.id ? 'text-emerald-50' : 'text-slate-500')}>{student.sinif || 'Sınıf yok'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </PanelCard>

              <div className="space-y-6">
                <PanelCard>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Aktivite tipi</h2>
                      <p className="mt-1 text-sm text-slate-500">{students.find((student) => student.id === selectedActivityStudentId)?.ad_soyad || 'Öğrenci seçin'}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activityTypeConfig.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setActivityType(item.id); setActivityForm({}); setActivityPhotoFile(null) }}
                        className={cx(
                          'rounded-[20px] border px-4 py-4 text-left transition',
                          activityType === item.id ? 'border-transparent text-white' : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                        style={activityType === item.id ? { backgroundColor: item.color } : undefined}
                      >
                        <div className="text-2xl">{item.emoji}</div>
                        <div className="mt-3 text-sm font-semibold">{item.label}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {activityType === 'food' && (
                      <>
                        <Field label="Öğün">
                          <select className="panel-input" value={activityForm.ogun || ''} onChange={(event) => setActivityForm((current) => ({ ...current, ogun: event.target.value }))}>
                            <option value="">Seçin</option>
                            {['Kahvaltı', 'Kuşluk', 'Öğle', 'İkindi'].map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <Field label="Yeme durumu">
                          <select className="panel-input" value={activityForm.yeme || ''} onChange={(event) => setActivityForm((current) => ({ ...current, yeme: event.target.value }))}>
                            <option value="">Seçin</option>
                            {['Hepsini', 'Çoğunu', 'Birazını', 'Hiç'].map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                      </>
                    )}

                    {activityType === 'nap' && (
                      <Field label="Uyku süresi">
                        <select className="panel-input" value={activityForm.sure || ''} onChange={(event) => setActivityForm((current) => ({ ...current, sure: event.target.value }))}>
                          <option value="">Seçin</option>
                          {['30 dk', '1 saat', '1.5 saat', '2 saat'].map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </Field>
                    )}

                    {activityType === 'health' && (
                      <Field label="Ateş">
                        <input className="panel-input" placeholder="36.5" value={activityForm.ates || ''} onChange={(event) => setActivityForm((current) => ({ ...current, ates: event.target.value }))} />
                      </Field>
                    )}

                    {activityType === 'meds' && (
                      <>
                        <Field label="İlaç adı">
                          <input className="panel-input" value={activityForm.ilac || ''} onChange={(event) => setActivityForm((current) => ({ ...current, ilac: event.target.value }))} />
                        </Field>
                        <Field label="Doz">
                          <input className="panel-input" value={activityForm.doz || ''} onChange={(event) => setActivityForm((current) => ({ ...current, doz: event.target.value }))} />
                        </Field>
                      </>
                    )}

                    {activityType === 'photo' && (
                      <Field label="Fotoğraf dosyası">
                        <input type="file" accept="image/*" className="panel-input" onChange={(event) => setActivityPhotoFile(event.target.files?.[0] ?? null)} />
                      </Field>
                    )}
                  </div>

                  <Field label="Not" className="mt-4">
                    <textarea className="panel-input min-h-[120px] resize-none" value={activityNote} onChange={(event) => setActivityNote(event.target.value)} placeholder="İsteğe bağlı not..." />
                  </Field>

                  <button onClick={handleActivitySave} disabled={savingActivity || !selectedActivityStudentId} className="mt-5 rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {savingActivity ? 'Kaydediliyor...' : `${activityMeta(activityType).emoji} ${activityMeta(activityType).label} Kaydet`}
                  </button>
                </PanelCard>

                <PanelCard>
                  <h2 className="text-lg font-semibold text-slate-900">Bugünün aktivite feed’i</h2>
                  <div className="mt-5 space-y-3">
                    {activities.map((activity) => {
                      const meta = activityMeta(activity.tur)
                      const photoUrl = activityPhotoUrl(activity)
                      return (
                        <div key={activity.id} className="flex items-start gap-4 rounded-[20px] border border-slate-200 px-4 py-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg }}>
                            <span className="text-xl">{meta.emoji}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">{activityStudentName(activity)} · {meta.label}</div>
                              <div className="text-xs text-slate-400">{formatTime(activity.created_at || activity.olusturuldu)}</div>
                            </div>
                            <div className="mt-1 text-sm text-slate-600">{activitySummary(activity)}</div>
                            {photoUrl ? (
                              <a href={photoUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                                <img src={photoUrl} alt="Aktivite fotoğrafı" className="h-56 w-full object-cover" />
                              </a>
                            ) : null}
                            {activity.tur === 'photo' && !photoUrl ? (
                              <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                Fotoğraf yükleniyor veya erişim izni bekleniyor.
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </PanelCard>
              </div>
            </section>
          )}

          {activeTab === 'mesajlar' && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
              <PanelCard>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Öğrenci listesi</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{totalUnread} okunmamış</span>
                </div>
                <div className="mt-5 space-y-2">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedMessageStudentId(student.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition',
                        selectedMessageStudentId === student.id ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className={cx('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', selectedMessageStudentId === student.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')}>
                        {initials(student.ad_soyad)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{student.ad_soyad}</div>
                        <div className={cx('text-xs', selectedMessageStudentId === student.id ? 'text-emerald-50' : 'text-slate-500')}>{student.sinif || 'Sınıf bilgisi'}</div>
                      </div>
                      {(unreadByStudent.get(student.id) || 0) > 0 && (
                        <span className={cx('rounded-full px-2 py-1 text-xs font-bold', selectedMessageStudentId === student.id ? 'bg-white text-[#10b981]' : 'bg-[#10b981] text-white')}>
                          {unreadByStudent.get(student.id)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </PanelCard>

              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <PanelCard>
                  <div className="border-b border-slate-200 pb-4">
                    <h2 className="text-lg font-semibold text-slate-900">{selectedMessageStudent?.ad_soyad || 'Öğrenci seçin'}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedMessageStudent?.sinif || 'Veli mesajlaşma hattı'}</p>
                  </div>
                  <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto">
                    {messageThread.map((message) => (
                      <div key={message.id} className={cx('flex', message.gonderen_rol.includes('ogretmen') ? 'justify-end' : 'justify-start')}>
                        <div className={cx(
                          'max-w-[75%] rounded-[22px] px-4 py-3 text-sm shadow-sm',
                          message.gonderen_rol.includes('ogretmen') ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-700'
                        )}>
                          <div>{message.content}</div>
                          <div className={cx('mt-2 text-[11px]', message.gonderen_rol.includes('ogretmen') ? 'text-emerald-100' : 'text-slate-400')}>{formatDateTime(message.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <textarea className="panel-input min-h-[110px] resize-none" value={threadDraft} onChange={(event) => setThreadDraft(event.target.value)} placeholder="Mesaj yazın..." />
                    <button onClick={handleSendMessage} disabled={sendingThread || !selectedMessageStudent} className="mt-3 rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      {sendingThread ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                </PanelCard>

                <PanelCard>
                  <h2 className="text-lg font-semibold text-slate-900">Toplu mesaj</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Mevcut sınıf filtresindeki velilere tek seferde gönderilir.</p>
                  <textarea className="panel-input mt-4 min-h-[220px] resize-none" value={bulkDraft} onChange={(event) => setBulkDraft(event.target.value)} placeholder="Duyuru niteliğinde mesaj..." />
                  <button onClick={handleBulkMessage} disabled={sendingBulk || !filteredStudents.length} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {sendingBulk ? 'Gönderiliyor...' : 'Toplu mesaj gönder'}
                  </button>
                </PanelCard>
              </div>
            </section>
          )}

          {activeTab === 'duyurular' && (
            <section className="mt-6 space-y-6">
              <div className="flex items-center justify-end">
                <button onClick={() => setAnnouncementModalOpen(true)} className="rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white">
                  Yeni duyuru
                </button>
              </div>
              <PanelCard>
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-[22px] border border-slate-200 px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-semibold text-slate-900">{announcement.baslik}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(announcement.created_at)}</div>
                          <div className="mt-3 text-sm leading-7 text-slate-600">{announcement.icerik}</div>
                        </div>
                        <button onClick={() => handleAnnouncementDelete(announcement.id)} className="rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'fotograflar' && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Fotoğraf yükle</h2>
                <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                  {students.map((student) => (
                    <Chip key={student.id} active={selectedPhotoStudentId === student.id} onClick={() => setSelectedPhotoStudentId(student.id)}>
                      {student.ad_soyad.split(' ')[0]}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4 space-y-4">
                  <input type="file" accept="image/*" className="panel-input" onChange={(event) => setGalleryUpload(event.target.files?.[0] ?? null)} />
                  <textarea className="panel-input min-h-[120px] resize-none" value={galleryNote} onChange={(event) => setGalleryNote(event.target.value)} placeholder="Fotoğraf notu..." />
                  <button onClick={handleGalleryUpload} disabled={uploadingGallery || !selectedPhotoStudentId || !galleryUpload} className="w-full rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                    {uploadingGallery ? 'Yükleniyor...' : 'Fotoğraf yükle'}
                  </button>
                </div>
              </PanelCard>

              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Grid galeri</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {galleryItems.map((item) => (
                    <a key={item.id} href={item.imageUrl || '#'} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.note || item.studentName} className="h-48 w-full object-cover" />
                      ) : (
                        <div className="flex h-48 items-center justify-center text-4xl">📸</div>
                      )}
                      <div className="space-y-2 p-4">
                        <div className="text-sm font-semibold text-slate-900">{item.studentName}</div>
                        <div className="text-sm text-slate-600">{item.note || 'Not eklenmedi'}</div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDateTime(item.createdAt)}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </PanelCard>
            </section>
          )}

          {activeTab === 'gunluk' && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Öğrenci seç</h2>
                <div className="mt-5 space-y-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedReportStudentId(student.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left transition',
                        selectedReportStudentId === student.id ? 'bg-[#10b981] text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      )}
                    >
                      <div className={cx('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', selectedReportStudentId === student.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')}>
                        {initials(student.ad_soyad)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{student.ad_soyad}</div>
                        <div className={cx('text-xs', selectedReportStudentId === student.id ? 'text-emerald-50' : 'text-slate-500')}>{student.sinif || 'Sınıf yok'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </PanelCard>

              <PanelCard>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{selectedReportStudent?.ad_soyad || 'Öğrenci seçin'}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedReportStudent?.sinif || 'Bugünkü timeline'}</p>
                  </div>
                  <span className={cx(
                    'rounded-full px-4 py-2 text-sm font-semibold',
                    attendance[selectedReportStudentId || 0] === 'geldi' ? 'bg-emerald-50 text-emerald-700' :
                      attendance[selectedReportStudentId || 0] === 'gelmedi' ? 'bg-rose-50 text-rose-700' :
                        attendance[selectedReportStudentId || 0] === 'izinli' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                  )}>
                    {attendance[selectedReportStudentId || 0] || 'bekleniyor'}
                  </span>
                </div>
                <div className="mt-6 space-y-4">
                  {reportActivities.map((activity, index) => {
                    const meta = activityMeta(activity.tur)
                    const photoUrl = activityPhotoUrl(activity)
                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg }}>
                            <span className="text-xl">{meta.emoji}</span>
                          </div>
                          {index !== reportActivities.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}
                        </div>
                        <div className="flex-1 rounded-[22px] border border-slate-200 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatTime(activity.created_at || activity.olusturuldu)}</div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{activitySummary(activity)}</div>
                          {photoUrl ? (
                            <a href={photoUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                              <img src={photoUrl} alt="Aktivite fotoğrafı" className="h-56 w-full object-cover" />
                            </a>
                          ) : null}
                          {activity.tur === 'photo' && !photoUrl ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                              Fotoğraf yükleniyor veya erişim izni bekleniyor.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PanelCard>
            </section>
          )}
          {activeTab === 'ayarlar' && (
            <section className="mt-6 max-w-lg">
              <PanelCard>
                <h2 className="text-lg font-semibold text-slate-900">Şifre değiştir</h2>
                <p className="mt-1 text-sm text-slate-500">Yeni şifreniz en az 6 karakter olmalıdır.</p>

                <div className="mt-5 space-y-4">
                  <Field label="Yeni şifre">
                    <input
                      type="password"
                      className="panel-input"
                      value={passwordForm.yeni}
                      onChange={(event) => { setPasswordForm((current) => ({ ...current, yeni: event.target.value })); setPasswordError(null); setPasswordSuccess(false) }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field label="Yeni şifre (tekrar)">
                    <input
                      type="password"
                      className="panel-input"
                      value={passwordForm.tekrar}
                      onChange={(event) => { setPasswordForm((current) => ({ ...current, tekrar: event.target.value })); setPasswordError(null); setPasswordSuccess(false) }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </Field>
                </div>

                {passwordError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Şifreniz başarıyla güncellendi.
                  </div>
                )}

                <button
                  onClick={handlePasswordChange}
                  disabled={savingPassword}
                  className="mt-5 rounded-2xl bg-[#10b981] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingPassword ? 'Kaydediliyor...' : 'Şifreyi güncelle'}
                </button>
              </PanelCard>
            </section>
          )}
        </div>
      </div>

      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">Yeni duyuru</h2>
              <button onClick={() => setAnnouncementModalOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">Kapat</button>
            </div>
            <div className="mt-5 space-y-4">
              <Field label="Başlık">
                <input className="panel-input" value={announcementForm.baslik} onChange={(event) => setAnnouncementForm((current) => ({ ...current, baslik: event.target.value }))} />
              </Field>
              <Field label="İçerik">
                <textarea className="panel-input min-h-[180px] resize-none" value={announcementForm.icerik} onChange={(event) => setAnnouncementForm((current) => ({ ...current, icerik: event.target.value }))} />
              </Field>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAnnouncementModalOpen(false)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">İptal</button>
                <button onClick={handleAnnouncementSave} disabled={savingAnnouncement} className="rounded-2xl bg-[#10b981] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {savingAnnouncement ? 'Yayınlanıyor...' : 'Yayınla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm">{children}</section>
}

function StatCard({ label, value, icon, accent, bg }: { label: string; value: string; icon: string; accent: string; bg: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: bg }}>{icon}</div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.05em]" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function StatusCard({ label, value, bg, text }: { label: string; value: number; bg: string; text: string }) {
  return (
    <div className={cx('rounded-[22px] px-5 py-5 shadow-sm', bg)}>
      <div className={cx('text-3xl font-semibold tracking-[-0.05em]', text)}>{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  )
}

function MiniCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/60">
      <div className={cx('text-2xl font-semibold', tone)}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{label}</div>
    </div>
  )
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cx('rounded-full px-4 py-2 text-sm font-semibold transition', active ? 'bg-[#10b981] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
      {children}
    </button>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted-text)]">
      {message}
    </div>
  )
}

function TeacherPanelSkeleton({ dark }: { dark: boolean }) {
  const skBase = dark ? 'bg-[#1a1d23]' : 'bg-slate-200'
  const cardBase = dark ? 'bg-[#111317] border-[#252a33]' : 'bg-white border-slate-200'
  return (
    <div className={`flex min-h-screen flex-col lg:flex-row ${dark ? 'bg-[#090b10]' : 'bg-slate-50'}`}>
      <aside className={`w-full border-b lg:w-[260px] lg:border-b-0 lg:border-r border-[${dark ? '#252a33' : '#e2e8f0'}] ${dark ? 'bg-[#111317]' : 'bg-white'} px-5 py-6`}>
        <div className="flex items-center gap-3">
          <div className={`h-14 w-14 rounded-2xl animate-pulse ${skBase}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 w-28 rounded animate-pulse ${skBase}`} />
            <div className={`h-2 w-20 rounded animate-pulse ${skBase}`} />
          </div>
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`h-11 rounded-2xl animate-pulse ${skBase}`} style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </aside>
      <div className="flex-1 px-4 py-5 lg:px-8 lg:py-7 space-y-6">
        <div className={`rounded-[24px] border p-5 animate-pulse ${cardBase}`}>
          <div className={`h-3 w-24 rounded ${skBase}`} />
          <div className={`mt-3 h-12 w-3/4 rounded-xl ${skBase}`} />
          <div className={`mt-3 h-3 w-40 rounded ${skBase}`} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-[22px] border p-5 animate-pulse ${cardBase}`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className={`h-12 w-12 rounded-2xl ${skBase}`} />
              <div className={`mt-4 h-8 w-16 rounded ${skBase}`} />
              <div className={`mt-2 h-3 w-24 rounded ${skBase}`} />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className={`rounded-[24px] border p-5 animate-pulse h-48 ${cardBase}`} />
          <div className={`rounded-[24px] border p-5 animate-pulse h-48 ${cardBase}`} />
        </div>
      </div>
    </div>
  )
}
