import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Card, ErrorNote, SectionHeader, inputCls, labelCls } from '../components/ui'
import { api } from '../lib/api'
import { CATEGORY_ORDER, requestCode } from '../lib/format'
import { RequestCategorySchema, type RequestCategory, type ServiceRequest } from '../types'
import { useLocale, useT } from '../i18n'
import { m } from './ReportView.i18n'

// Same limits the request-photos bucket enforces (supabase/migrations, 5 MB,
// JPEG/PNG/WebP). Checked here so the user gets instant feedback; the bucket is
// the real gate, since the browser uploads to Storage directly.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_DESCRIPTION = 2000
const MAX_LOCATION = 200

// Client-side validation problems are stored as keys so they follow a language switch.
type Invalid = Extract<keyof (typeof m)['ru'], 'photoType' | 'photoSize' | 'fileEmpty' | 'needCategory' | 'needDescription'>

function photoProblem(file: File): Invalid | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'photoType'
  if (file.size > MAX_PHOTO_BYTES) return 'photoSize'
  if (file.size === 0) return 'fileEmpty'
  return null
}

type Outcome =
  | { kind: 'done'; request: ServiceRequest }
  // The request exists, only the photo failed: offer a retry instead of a duplicate.
  | { kind: 'photo-failed'; request: ServiceRequest; photo: File; error: unknown }

// all of the reports
export function ReportView({ onOpenRequest }: { onOpenRequest: (id: string) => void }) {
  const [category, setCategory] = useState<RequestCategory | ''>('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const t = useT(m)
  const { categoryLabel } = useLocale()
  const [invalid, setInvalid] = useState<Invalid | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    e.target.value = '' // allow re-picking the same file after removing it
    if (file) {
      const problem = photoProblem(file)
      if (problem) { setInvalid(problem); return }
    }
    setInvalid(null)
    setError(null)
    setPhoto(file)
  }

  async function uploadPhoto(request: ServiceRequest, file: File) {
    try {
      setOutcome({ kind: 'done', request: await api.uploadRequestPhoto(request.id, file) })
    } catch (err) {
      setOutcome({ kind: 'photo-failed', request, photo: file, error: err })
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const desc = description.trim()
    if (!category) { setInvalid('needCategory'); return }
    if (!desc) { setInvalid('needDescription'); return }
    setBusy(true)
    setInvalid(null)
    setError(null)
    try {
      const created = await api.createRequest({ category, description: desc, location: location.trim() || null })
      if (photo) await uploadPhoto(created, photo)
      else setOutcome({ kind: 'done', request: created })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function retryPhoto(o: Extract<Outcome, { kind: 'photo-failed' }>) {
    setBusy(true)
    await uploadPhoto(o.request, o.photo)
    setBusy(false)
  }

  function reset() {
    setCategory('')
    setDescription('')
    setLocation('')
    setPhoto(null)
    setInvalid(null)
    setError(null)
    setOutcome(null)
  }

  if (outcome) {
    const code = requestCode(outcome.request.number)
    return (
      <div>
        <SectionHeader title={t('submittedTitle')} />
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-lg font-bold text-[#2C4A1A] mb-2">{t('registered', { code })}</h2>
          {outcome.kind === 'photo-failed' ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-6 text-left">
              <div className="text-xs font-semibold text-amber-800 mb-1">{t('photoFailed')}</div>
              <ErrorNote error={outcome.error} overrides={{ 413: t('photoSize') }} />
              <button onClick={() => retryPhoto(outcome)} disabled={busy}
                className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 disabled:opacity-60 text-amber-900 px-3 py-1 rounded font-medium transition-colors">
                {busy ? t('uploading') : t('retryPhoto')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#697050] mb-6">{t('doneText')}</p>
          )}
          <div className="flex gap-2 justify-center">
            {/* Locked while a photo retry is in flight: its result would replace whatever screen came next. */}
            <button onClick={() => onOpenRequest(outcome.request.id)} disabled={busy}
              className="border border-[#2C4A1A] text-[#2C4A1A] px-5 py-2 rounded text-sm font-medium hover:bg-[#F6F5DC] disabled:opacity-60 transition-colors">
              {t('openRequest')}
            </button>
            <button onClick={reset} disabled={busy}
              className="bg-[#2C4A1A] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#3A6022] disabled:opacity-60 transition-colors">
              {t('submitAnother')}
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader title={t('title')} sub={t('sub')} />
      <div className="max-w-lg">
        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="category" className={labelCls}>{t('category')}</label>
              <select
                id="category"
                className={inputCls}
                value={category}
                onChange={e => {
                  const parsed = RequestCategorySchema.safeParse(e.target.value)
                  setCategory(parsed.success ? parsed.data : '')
                }}
              >
                <option value="">{t('chooseCategory')}</option>
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{categoryLabel(c)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="location" className={labelCls}>{t('location')}</label>
              <input
                id="location"
                className={inputCls}
                placeholder={t('locationPlaceholder')}
                maxLength={MAX_LOCATION}
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelCls}>{t('description')}</label>
              <textarea
                id="description"
                className={`${inputCls} resize-none h-24`}
                placeholder={t('descriptionPlaceholder')}
                maxLength={MAX_DESCRIPTION}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div>
              <span className={labelCls}>{t('photoOptional')}</span>
              <label
                className={`block border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                  photo ? 'border-[#2C4A1A] bg-blue-50' : 'border-[#D6D3A8] hover:border-[#2C4A1A]'
                }`}
              >
                <input type="file" accept={PHOTO_TYPES.join(',')} className="sr-only" onChange={pickPhoto} />
                {photo
                  ? <span className="text-sm text-[#2C4A1A] font-medium break-all">{t('photoAttached', { name: photo.name })}</span>
                  : <span className="text-sm text-[#697050]">{t('attachPhoto')}</span>
                }
              </label>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="mt-1 text-xs text-[#A07C12] hover:underline">
                  {t('removePhoto')}
                </button>
              )}
            </div>

            {invalid !== null && <p className="text-red-600 text-xs" role="alert">{t(invalid)}</p>}
            {invalid === null && error !== null && <ErrorNote error={error} />}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#A07C12] hover:bg-[#836208] disabled:opacity-60 text-white font-semibold rounded py-2.5 text-sm transition-colors"
            >
              {busy ? t('sending') : t('send')}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}
