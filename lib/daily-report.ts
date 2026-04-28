type ActivityDetail = Record<string, unknown>

export type DailyReportActivityRow = {
  id?: string | number
  tur: string
  detay?: ActivityDetail | null
  created_at?: string | null
  olusturuldu?: string | null
  kaydeden?: string | null
}

export type DailyReportRow = {
  id?: string | number
  baslik?: string | null
  icerik?: string | null
  tarih?: string | null
  created_at?: string | null
  ozet?: {
    total?: number
    counts?: Record<string, number>
    highlights?: string[]
    attendance?: string | null
  } | null
}

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => String(value || '').trim()).filter(Boolean)
}

function sentence(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function shortDate(date: string) {
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

export function activitySummary(activity: DailyReportActivityRow) {
  const detail = (activity.detay || {}) as ActivityDetail
  if (activity.tur === 'food') return compact([
    typeof detail.saat === 'string' ? detail.saat : null,
    typeof detail.foodType === 'string' ? detail.foodType : null,
    typeof detail.ogun === 'string' ? detail.ogun : null,
    typeof detail.yeme === 'string' ? detail.yeme : typeof detail.biberonMl === 'string' ? detail.biberonMl : null,
    Array.isArray(detail.yemekler) ? detail.yemekler.map(String).join(', ') : typeof detail.yemekler === 'string' ? detail.yemekler : null,
    typeof detail.menuNotu === 'string' ? detail.menuNotu : null,
  ]).join(' · ')
  if (activity.tur === 'nap') return compact([
    typeof detail.napAction === 'string' ? detail.napAction : null,
    typeof detail.baslangic === 'string' && typeof detail.bitis === 'string'
      ? `${detail.baslangic}-${detail.bitis}`
      : typeof detail.baslangic === 'string'
        ? detail.baslangic
        : typeof detail.bitis === 'string'
          ? detail.bitis
          : null,
    typeof detail.sure === 'string' ? detail.sure : null,
    typeof detail.pozisyon === 'string' ? detail.pozisyon : null,
    typeof detail.gozlem === 'string' ? detail.gozlem : null,
  ]).join(' · ')
  if (activity.tur === 'potty') return compact([
    typeof detail.saat === 'string' ? detail.saat : null,
    typeof detail.pottyType === 'string' ? detail.pottyType : null,
    typeof detail.durum === 'string' ? detail.durum : null,
    Array.isArray(detail.ekDetaylar) ? detail.ekDetaylar.map(String).join(', ') : typeof detail.ekDetaylar === 'string' ? detail.ekDetaylar : null,
  ]).join(' · ')
  if (activity.tur === 'health') return typeof detail.ates === 'string' || typeof detail.ates === 'number' ? `${detail.ates} °C` : ''
  if (activity.tur === 'meds') return compact([
    typeof detail.ilac === 'string' ? detail.ilac : null,
    typeof detail.doz === 'string' ? detail.doz : null,
  ]).join(' · ')
  if (activity.tur === 'incident') return typeof detail.seviye === 'string' ? detail.seviye : ''
  if (activity.tur === 'kudos') return typeof detail.basari === 'string' ? detail.basari : ''

  return compact([
    typeof detail.not === 'string' ? detail.not : null,
    typeof detail.aciklama === 'string' ? detail.aciklama : null,
  ]).join(' · ')
}

export function activityMediaUrl(activity: DailyReportActivityRow) {
  if ((activity.tur === 'photo' || activity.tur === 'video') && typeof activity.detay?.url === 'string') {
    return activity.detay.url
  }
  return null
}

export function buildDailyReportQualityTips(activities: DailyReportActivityRow[]) {
  const types = new Set(activities.map((activity) => activity.tur))
  return [
    !types.has('food') ? 'Yemek kaydı eksik' : '',
    !types.has('nap') ? 'Uyku bilgisi eklenebilir' : '',
    !types.has('photo') && !types.has('video') ? 'Günün akışını güçlendirecek bir medya paylaşımı yok' : '',
    !types.has('note') && !types.has('kudos') ? 'Kısa öğretmen notu raporu daha değerli kılar' : '',
  ].filter(Boolean)
}

export function buildDailyReportHighlights(activities: DailyReportActivityRow[]) {
  const counts = activities.reduce<Record<string, number>>((acc, activity) => {
    acc[activity.tur] = (acc[activity.tur] || 0) + 1
    return acc
  }, {})

  const highlights = [
    counts.food ? 'Yemek takibi tamamlandı' : '',
    counts.nap ? 'Uyku bilgisi paylaşıldı' : '',
    counts.photo || counts.video ? 'Galeriye yeni medya eklendi' : '',
    counts.kudos ? 'Olumlu gelişim notu var' : '',
    counts.health || counts.meds || counts.incident ? 'Sağlık / ilaç kaydı işlendi' : '',
  ].filter(Boolean)

  return { counts, highlights }
}

export function buildDailyReport({
  studentName,
  date,
  attendance,
  activities,
}: {
  studentName: string
  date: string
  attendance?: string | null
  activities: DailyReportActivityRow[]
}) {
  const { counts, highlights } = buildDailyReportHighlights(activities)
  const qualityTips = buildDailyReportQualityTips(activities)
  const lines: string[] = []

  const attendanceText =
    attendance === 'geldi'
      ? 'Bugün okula katıldı.'
      : attendance === 'gelmedi'
        ? 'Bugün okula gelmedi.'
        : attendance === 'izinli'
          ? 'Bugün izinli olarak kaydedildi.'
          : 'Bugünkü yoklama bilgisi henüz tamamlanmadı.'

  lines.push(`${studentName} için ${shortDate(date)} gün sonu özeti hazır.`)
  lines.push(attendanceText)

  const foods = activities.filter((activity) => activity.tur === 'food')
  if (foods.length) {
    const foodText = foods.map(activitySummary).filter(Boolean).join('; ')
    lines.push(foodText ? `Yemek: ${foodText}.` : `${foods.length} yemek kaydı girildi.`)
  }

  const naps = activities.filter((activity) => activity.tur === 'nap')
  if (naps.length) {
    const napText = naps.map(activitySummary).filter(Boolean).join(', ')
    lines.push(napText ? `Uyku: ${napText}.` : `${naps.length} uyku kaydı girildi.`)
  }

  const potty = activities.filter((activity) => activity.tur === 'potty')
  if (potty.length) {
    const pottyText = potty.map(activitySummary).filter(Boolean).join(', ')
    lines.push(pottyText ? `Tuvalet: ${pottyText}.` : `${potty.length} tuvalet kaydı girildi.`)
  }

  const health = activities.filter((activity) => ['health', 'meds', 'incident'].includes(activity.tur))
  if (health.length) {
    lines.push(`${health.length} sağlık / ilaç / olay kaydı okul notlarına eklendi.`)
  }

  const kudos = activities.filter((activity) => activity.tur === 'kudos')
  if (kudos.length) {
    const kudosText = kudos
      .map((activity) => {
        const detail = activity.detay || {}
        return typeof detail.basari === 'string' ? detail.basari : typeof detail.not === 'string' ? detail.not : ''
      })
      .filter(Boolean)
      .join(', ')
    lines.push(kudosText ? `Günün güzel anı: ${sentence(kudosText)}` : 'Bugün olumlu gelişim notu paylaşıldı.')
  }

  const notes = activities
    .map((activity) => {
      const detail = activity.detay || {}
      return typeof detail.not === 'string' ? detail.not : null
    })
    .filter(Boolean)
    .slice(0, 3) as string[]

  if (notes.length) {
    lines.push(`Öğretmen notu: ${notes.map(sentence).join(' ')}`)
  }

  const mediaCount = (counts.photo || 0) + (counts.video || 0)
  if (mediaCount) {
    lines.push(`${mediaCount} fotoğraf/video paylaşımı galeriye eklendi.`)
  }

  if (!activities.length) {
    lines.push('Bugün için henüz aktivite kaydı girilmedi. Gün içinde kayıt eklendikçe özet güncellenebilir.')
  }

  lines.push('Sorularınız olursa mesajlar bölümünden öğretmeninizle iletişime geçebilirsiniz.')

  return {
    title: `${studentName} gün sonu raporu`,
    body: lines.filter(Boolean).join('\n\n'),
    summary: {
      total: activities.length,
      counts,
      highlights,
      attendance: attendance || null,
      qualityTips,
      hasMedia: mediaCount > 0,
    },
  }
}
