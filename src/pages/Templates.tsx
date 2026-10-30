import { Check, Cloud, Download, Layers, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ColorDot, EmptyState, Field, FormActions, Modal, PageHeader, Toggle } from '../components/ui'
import {
  listCloudTemplates,
  publishCloudTemplate,
  snapshotTemplate,
  typeCount,
  uniqueTypes,
  unpublishCloudTemplate,
  type CloudShareDraft,
} from '../cloud'
import { useStore, useWorkspace } from '../store'
import type { CloudTemplate, Template } from '../types'

export function Templates() {
  const {
    createTemplate,
    renameTemplate,
    deleteTemplate,
    setActiveTemplate,
    setTemplateCloud,
    importSharedTemplate,
    state,
    user,
  } = useStore()
  const { templates, template } = useWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sharing, setSharing] = useState<Template | null>(null)
  const [draft, setDraft] = useState<CloudShareDraft | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState<CloudTemplate[]>([])
  const [importing, setImporting] = useState<CloudTemplate | null>(null)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [catalogBusy, setCatalogBusy] = useState(false)

  const refreshCatalog = async () => {
    const rows = await listCloudTemplates()
    setCatalog(rows)
    return rows
  }

  const browseCatalog = async () => {
    setCatalogBusy(true)
    const rows = await refreshCatalog()
    setCatalogBusy(false)
    if (rows.length === 0) {
      setBrowseOpen(true)
      return
    }
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await listCloudTemplates()
      if (cancelled) return
      setCatalog(rows)
      if (window.location.hash !== '#catalog') return
      if (rows.length === 0) setBrowseOpen(true)
      else {
        requestAnimationFrame(() => {
          document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openShare = (t: Template) => {
    if (!user) return
    const snap = snapshotTemplate(state, user.id, t.id)
    setSharing(t)
    setDraft(snap)
    setAnonymous(t.sharedAnonymous)
    setError('')
  }

  const publish = async () => {
    if (!user || !sharing || !draft) return
    setBusy(true)
    setError('')
    const published = await publishCloudTemplate({
      draft,
      ownerId: user.id,
      username: user.username,
      anonymous,
      cloudId: sharing.cloudId,
    })
    setBusy(false)
    if (!published) {
      setError('Could not publish this template.')
      return
    }
    setTemplateCloud(sharing.id, published.id, anonymous)
    setSharing(null)
    await refreshCatalog()
  }

  const unshare = async (t: Template) => {
    if (!user || !t.cloudId) return
    if (!confirm(`Remove “${t.name}” from the catalog?`)) return
    const ok = await unpublishCloudTemplate(t.cloudId, user.id)
    if (ok) {
      setTemplateCloud(t.id, null)
      await refreshCatalog()
    }
  }

  const importNow = (shared: CloudTemplate) => {
    const id = importSharedTemplate(shared)
    if (!id) return
    setImporting(null)
    navigate('/income?setup=1')
  }

  return (
    <div>
      <PageHeader
        title="Wallet Templates"
        subtitle="A template is a set of accounts. Share the names and type colors — never the money."
        action={
          <Button
            className="btn-pad-x whitespace-nowrap"
            onClick={() => {
              setEditingId(null)
              setName('')
              setOpen(true)
            }}
          >
            <Plus size={16} /> Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title="Create your first template"
          body="Then add accounts, drop expense types into them, and split your inflow. Or import one from the catalog below."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setEditingId(null)
                  setName('')
                  setOpen(true)
                }}
              >
                <Plus size={16} />
                Create template
              </Button>
              <Button variant="outline" onClick={() => void browseCatalog()} disabled={catalogBusy}>
                <Cloud size={16} />
                Browse catalog
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {templates.map((t) => {
            const active = t.id === user?.activeTemplateId
            return (
              <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted">
                    {active ? 'Active template' : 'Inactive'}
                    {t.cloudId
                      ? t.sharedAnonymous
                        ? ' · On the catalog as name only'
                        : ` · Shared as ${user?.username}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {!active ? (
                    <Button variant="soft" onClick={() => setActiveTemplate(t.id)}>
                      <Check size={16} /> Use
                    </Button>
                  ) : (
                    <span className="px-2 text-xs font-semibold text-brand">Current</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 min-w-11 px-0"
                    onClick={() => openShare(t)}
                    aria-label={t.cloudId ? 'Update share' : 'Share template'}
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 min-w-11 px-0"
                    onClick={() => {
                      setEditingId(t.id)
                      setName(t.name)
                      setOpen(true)
                    }}
                    aria-label="Rename"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 min-w-11 px-0 hover:text-danger"
                    onClick={async () => {
                      if (!confirm(`Delete template “${t.name}” and its accounts?`)) return
                      if (t.cloudId && user) await unpublishCloudTemplate(t.cloudId, user.id)
                      deleteTemplate(t.id)
                      await refreshCatalog()
                    }}
                    aria-label="Delete template"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {template ? (
        <p className="mt-4 text-sm text-muted">
          Expense types drop into accounts of <span className="font-medium text-ink">{template.name}</span>.
        </p>
      ) : null}

      <section id="catalog" className="mt-10 scroll-mt-24">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">On our servers</p>
            <h2 className="text-xl font-semibold">Adapt what others have shared</h2>
            <p className="mt-1 text-sm text-muted">
              Catalog entries are a template name, account names, and expense types with colors. Import one,
              then set up cash flow yourself.
            </p>
          </div>
        </div>
        {catalog.length === 0 ? (
          <EmptyState
            title="No templates uploaded on the cloud yet"
            body="Share a template from this device to list it here for others to import."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {catalog.map((item) => (
              <li key={item.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <Cloud size={16} className="text-brand" />
                      {item.name}
                    </p>
                    <p className="text-xs text-muted">
                      {item.authorUsername ? `Shared by ${item.authorUsername}` : 'Name only'}
                    </p>
                  </div>
                  <Button variant="soft" onClick={() => setImporting(item)}>
                    <Download size={16} />
                    Import
                  </Button>
                </div>
                <ul className="mt-3 grid gap-2">
                  {item.accounts.map((account) => (
                    <li key={account.name} className="text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <ColorDot color={account.color} />
                        {account.name}
                      </span>
                      {account.types.length ? (
                        <span className="mt-1 flex flex-wrap gap-1 pl-5">
                          {account.types.map((t) => (
                            <span
                              key={t.name}
                              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs"
                            >
                              <ColorDot color={t.color} size={8} />
                              {t.name}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={open} title={editingId ? 'Rename template' : 'New template'} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (editingId) renameTemplate(editingId, name)
            else createTemplate(name)
            setOpen(false)
          }}
        >
          <Field label="Name" icon={<Layers size={16} />}>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Everyday"
              required
            />
          </Field>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editingId ? 'Save' : 'Create'} />
        </form>
      </Modal>

      <Modal
        open={Boolean(sharing && draft)}
        title={sharing?.cloudId ? 'Update catalog listing' : 'Share to the catalog'}
        onClose={() => setSharing(null)}
      >
        {sharing && draft ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              We send the template name, account names, and expense types with their colors. Income, balances,
              and spending stay on this device.
            </p>
            <SharePreview draft={draft} />
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] p-3.5 text-sm backdrop-blur-md">
              <span>
                <span className="font-medium">Share anonymously</span>
                <span className="mt-0.5 block text-xs text-muted">
                  Only the template name is credited. Your username does not appear on our servers.
                </span>
              </span>
              <Toggle
                checked={anonymous}
                onChange={setAnonymous}
                aria-label="Share anonymously"
              />
            </label>
            {!anonymous ? (
              <p className="text-xs text-muted">
                Listing will show <span className="font-medium text-ink">shared by {user?.username}</span>.
              </p>
            ) : null}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {sharing.cloudId ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await unshare(sharing)
                    setSharing(null)
                  }}
                >
                  <Trash2 size={16} />
                  Remove from catalog
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setSharing(null)}>
                Cancel
              </Button>
              <Button onClick={() => void publish()} disabled={busy || draft.accounts.length === 0}>
                <Share2 size={16} />
                {sharing.cloudId ? 'Update listing' : 'Share'}
              </Button>
            </div>
            {draft.accounts.length === 0 ? (
              <p className="text-xs text-muted">Add at least one named account before sharing.</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={browseOpen}
        title="Wallet Templates catalog"
        onClose={() => setBrowseOpen(false)}
      >
        <div className="grid gap-3">
          <p className="text-sm text-ink">No templates uploaded on the cloud yet.</p>
          <p className="text-sm text-muted">
            Share a template from this device to list it here. Until then, create your own.
          </p>
          <div className="mt-2 flex justify-end">
            <Button onClick={() => setBrowseOpen(false)}>Got it</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(importing)} title="Import this template?" onClose={() => setImporting(null)}>
        {importing ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              Accounts and type colors copy onto this device. Cash flow is yours to set up after import —
              salary, bonuses, and how you split inflow are never in the catalog.
            </p>
            <SharePreview draft={importing} />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setImporting(null)}>
                Cancel
              </Button>
              <Button onClick={() => importNow(importing)}>
                <Download size={16} />
                Import and set up cash flow
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function SharePreview({ draft }: { draft: { name: string; accounts: CloudShareDraft['accounts'] } }) {
  const types = uniqueTypes(draft.accounts)
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-semibold">{draft.name}</p>
      <p className="text-xs text-muted">
        {draft.accounts.length} accounts · {typeCount(draft.accounts)} types
      </p>
      <ul className="mt-3 grid gap-2">
        {draft.accounts.map((account) => (
          <li key={account.name} className="flex items-center gap-2 text-sm">
            <ColorDot color={account.color} />
            {account.name}
          </li>
        ))}
      </ul>
      {types.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {types.map((t) => (
            <span key={t.name} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs">
              <ColorDot color={t.color} size={8} />
              {t.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
