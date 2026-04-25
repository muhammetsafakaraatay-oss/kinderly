'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { parseCheckInQrPayload } from '@/lib/checkin-qr'
import { getContactType } from '@/lib/contact-utils'
import { supabase } from '@/lib/supabase'
import type { Ogrenci, Okul, VeliRecord } from '@/lib/types'

type PickupType = 'check_in' | 'check_out'

export function ParentTeslimPanel({
  okul,
  children,
  contacts,
  selectedChildId,
  onSelectChild,
}: {
  okul: Okul
  children: Ogrenci[]
  contacts: VeliRecord[]
  selectedChildId: number | null
  onSelectChild: (childId: number) => void
}) {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [pickupType, setPickupType] = useState<PickupType>('check_in')
  const [pin, setPin] = useState('')
  const [note, setNote] = useState('')
  const [qrVerified, setQrVerified] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualQr, setManualQr] = useState('')
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) || null,
    [children, selectedChildId]
  )

  const availableContacts = useMemo(
    () => contacts.filter((contact) =>
      selectedChild
      && Number(contact.ogrenci_id) === Number(selectedChild.id)
      && (contact.teslim_alabilir || ['parent', 'family'].includes(getContactType(contact.iliski_tipi)))
    ),
    [contacts, selectedChild]
  )

  const selectedContact = useMemo(
    () => availableContacts.find((contact) => Number(contact.id) === Number(selectedContactId)) || null,
    [availableContacts, selectedContactId]
  )

  useEffect(() => {
    if (!availableContacts.length) {
      setSelectedContactId(null)
      return
    }

    if (!availableContacts.some((contact) => Number(contact.id) === Number(selectedContactId))) {
      setSelectedContactId(Number(availableContacts[0].id))
    }
  }, [availableContacts, selectedContactId])

  useEffect(() => {
    if (!scanning || qrVerified) return

    const BarcodeDetectorClass = typeof window !== 'undefined' ? (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector : undefined
    if (!BarcodeDetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tarayıcı kamera ile QR taramayı desteklemiyor. Alttaki manuel doğrulama alanını kullanabilirsin.')
      setScanning(false)
      return
    }

    let cancelled = false
    const detector = new BarcodeDetectorClass({ formats: ['qr_code'] })

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        timerRef.current = window.setInterval(async () => {
          if (!videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            const rawValue = barcodes[0]?.rawValue
            if (!rawValue) return
            verifyQr(rawValue)
          } catch {
            // Ignore scan frame errors while the camera is warming up.
          }
        }, 700)
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'Kamera açılamadı.')
        setScanning(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [qrVerified, scanning])

  function verifyQr(rawValue: string) {
    const payload = parseCheckInQrPayload(rawValue)
    if (!payload || String(payload.okul_id) !== String(okul.id)) {
      setBanner('Bu QR kodu seçili okula ait değil.')
      return
    }

    setQrVerified(true)
    setScanning(false)
    setCameraError('')
    setManualQr(rawValue)
    setBanner('Okul QR kodu doğrulandı.')
  }

  function resetQr() {
    setQrVerified(false)
    setScanning(false)
    setManualQr('')
    setCameraError('')
  }

  async function savePickup() {
    if (!selectedChild || !selectedContact) {
      setBanner('Önce öğrenci ve teslim kişisi seç.')
      return
    }

    if (!qrVerified) {
      setBanner('Önce okul QR kodunu doğrula.')
      return
    }

    const normalizedPin = pin.replace(/\D/g, '')
    if (normalizedPin.length !== 4) {
      setBanner('Teslim PIN kodu 4 haneli olmalı.')
      return
    }

    setSaving(true)
    setBanner('')
    const { error } = await supabase.rpc('record_parent_qr_pickup', {
      target_okul_id: Number(okul.id),
      target_ogrenci_id: Number(selectedChild.id),
      target_veli_id: Number(selectedContact.id),
      target_tip: pickupType,
      target_pin: normalizedPin,
      target_notlar: note.trim() || null,
    })
    setSaving(false)

    if (error) {
      setBanner(error.message)
      return
    }

    setPin('')
    setNote('')
    setQrVerified(false)
    setScanning(false)
    setManualQr('')
    setBanner(
      pickupType === 'check_in'
        ? `${selectedChild.ad_soyad} için giriş kaydı oluşturuldu.`
        : `${selectedChild.ad_soyad} için çıkış kaydı oluşturuldu.`
    )
  }

  return (
    <section className="mt-6 space-y-6">
      {banner ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {banner}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">1. Okul QR kodunu doğrula</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Okuldaki teslim ekranındaki QR kodu taradığında bu adım tamamlanır. Tarayıcı desteklemiyorsa manuel doğrulama alanını kullanabilirsin.
              </p>
            </div>
            {qrVerified ? (
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Doğrulandı</span>
            ) : null}
          </div>

          {qrVerified ? (
            <div className="mt-5 rounded-[24px] border border-emerald-100 bg-emerald-50 px-5 py-6 text-sm text-emerald-700">
              QR başarıyla doğrulandı. İstersen tekrar tarayabilir veya aşağıdan kayda devam edebilirsin.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
                <div className="aspect-[4/3] w-full">
                  {scanning ? (
                    <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <div className="flex h-full items-center justify-center px-5 text-center text-sm text-slate-400">
                      Kamera açık değil. Telefonundan QR taramak için aşağıdaki butonu kullan.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setBanner('')
                    setCameraError('')
                    setScanning(true)
                  }}
                  className="rounded-2xl bg-[#f59e0b] px-4 py-3 text-sm font-semibold text-white"
                >
                  Kamerayı aç
                </button>
                <button
                  onClick={resetQr}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
                >
                  Sıfırla
                </button>
              </div>
              {cameraError ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {cameraError}
                </div>
              ) : null}
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Manuel doğrulama</div>
                <textarea
                  value={manualQr}
                  onChange={(event) => setManualQr(event.target.value)}
                  placeholder='QR metnini buraya yapıştırın. Örnek: {"type":"kinderx-checkin","version":1,"okul_id":"1"}'
                  className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
                />
                <button
                  onClick={() => verifyQr(manualQr)}
                  className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  QR metnini doğrula
                </button>
              </div>
            </div>
          )}
        </PanelCard>

        <PanelCard>
          <h2 className="text-lg font-semibold text-slate-900">2. Çocuk ve teslim kişisi</h2>
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {children.map((child) => {
                const active = child.id === selectedChildId
                return (
                  <button
                    key={child.id}
                    onClick={() => onSelectChild(child.id)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? 'border-amber-200 bg-amber-50 text-[#f59e0b]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    <div>{child.ad_soyad}</div>
                    <div className="mt-1 text-xs font-normal text-slate-500">{child.sinif || 'Sınıf bilgisi'}</div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <ToggleButton active={pickupType === 'check_in'} onClick={() => setPickupType('check_in')}>Giriş</ToggleButton>
              <ToggleButton active={pickupType === 'check_out'} onClick={() => setPickupType('check_out')}>Çıkış</ToggleButton>
            </div>

            <div className="grid gap-3">
              {availableContacts.map((contact) => {
                const active = Number(contact.id) === Number(selectedContactId)
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(Number(contact.id))}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${active ? 'border-amber-200 bg-amber-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{contact.ad_soyad || 'Kişi'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {contact.yakinlik || CONTACT_LABELS[getContactType(contact.iliski_tipi)]}
                      {contact.teslim_pin ? ` · PIN ${contact.teslim_pin}` : ''}
                    </div>
                  </button>
                )
              })}
              {!availableContacts.length ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Bu çocuk için teslim alabilecek kişi kaydı bulunamadı.
                </div>
              ) : null}
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard>
        <h2 className="text-lg font-semibold text-slate-900">3. PIN ile kaydı tamamla</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Teslim PIN" value={pin} onChange={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))} placeholder="4 haneli PIN" />
          <Field label="Not" value={note} onChange={setNote} placeholder="Opsiyonel açıklama" />
        </div>
        <button
          onClick={savePickup}
          disabled={saving || !selectedContact || !selectedChild}
          className="mt-5 rounded-2xl bg-[#f59e0b] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : pickupType === 'check_in' ? 'Giriş kaydı al' : 'Çıkış kaydı al'}
        </button>
      </PanelCard>
    </section>
  )
}

const CONTACT_LABELS = {
  parent: 'Veli',
  family: 'Aile',
  approved_pickup: 'Teslim yetkilisi',
  emergency: 'Acil durum',
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">{children}</section>
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-[#f59e0b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none"
      />
    </label>
  )
}
