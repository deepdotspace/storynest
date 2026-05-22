/**
 * Help / contact modal — small form anyone signed in can use to send the
 * admin a message. Calls the `sendHelpMessage` action.
 */

import { useState } from 'react'
import { useUser } from 'deepspace'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  Button,
  useToast,
} from './ui'
import { callAction } from '../lib/callAction'

interface HelpModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  const { user } = useUser()
  const { success, error: errorToast } = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const reset = () => {
    setMessage('')
    setSending(false)
  }

  const handleClose = () => {
    if (sending) return
    onClose()
    setTimeout(reset, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    setSending(true)
    const result = await callAction<{ sent: boolean }>('sendHelpMessage', {
      message: trimmed,
      email: user?.email ?? '',
      name: user?.name ?? '',
    })
    setSending(false)
    if (!result.success) {
      errorToast('Could not send', result.error)
      return
    }
    success('Message sent', 'Thank you — we will read it soon.')
    onClose()
    setTimeout(reset, 200)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="max-w-md"
        style={{
          background: 'var(--storynest-card)',
          border: '1.5px solid var(--storynest-rule)',
          boxShadow: 'var(--shadow-sticker)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="font-display text-[22px]"
            style={{ color: 'var(--storynest-ink)' }}
          >
            How can we help?
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--storynest-ink-soft)' }}>
            Refunds, ideas, bugs — whatever you want to send. We read every message.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you want to send?"
            rows={6}
            maxLength={5000}
            autoFocus
            required
            data-testid="help-message-input"
            style={{
              background: 'var(--storynest-card-soft)',
              borderColor: 'var(--storynest-rule)',
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--storynest-ink-mute)' }}>
              {message.length}/5000
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending || !message.trim()}
                data-testid="help-message-send"
                style={{
                  background: 'var(--storynest-sky)',
                  color: 'white',
                }}
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
