import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="markdown-toolbar"
// Provides bold, italic, and bullet-list formatting buttons for a textarea.
export default class extends Controller {
  static targets = ["textarea"]

  bold() {
    this.wrapSelection("**", "**", "bold text")
  }

  italic() {
    this.wrapSelection("_", "_", "italic text")
  }

  bullet() {
    const textarea = this.textareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const selected = value.substring(start, end)

    if (selected.length > 0) {
      // Convert selected lines to bullet list
      const lines = selected.split("\n")
      const bulleted = lines.map(line => `- ${line}`).join("\n")
      this.replaceSelection(bulleted)
    } else {
      // Insert a bullet point at cursor
      const before = value.substring(0, start)
      const after = value.substring(end)
      const needsNewline = before.length > 0 && !before.endsWith("\n") ? "\n" : ""
      const insert = `${needsNewline}- `
      textarea.value = before + insert + after
      textarea.selectionStart = textarea.selectionEnd = start + insert.length
      textarea.focus()
    }
  }

  // ── Private ────────────────────────────────────

  wrapSelection(prefix, suffix, placeholder) {
    const textarea = this.textareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const selected = value.substring(start, end)

    if (selected.length > 0) {
      // Wrap the selected text
      const wrapped = `${prefix}${selected}${suffix}`
      this.replaceSelection(wrapped)
    } else {
      // Insert placeholder at cursor
      const before = value.substring(0, start)
      const after = value.substring(end)
      const wrapped = `${prefix}${placeholder}${suffix}`
      textarea.value = before + wrapped + after
      // Select only the placeholder text so user can overwrite it
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length + placeholder.length
      textarea.focus()
    }
  }

  replaceSelection(replacement) {
    const textarea = this.textareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value

    textarea.value = value.substring(0, start) + replacement + value.substring(end)
    textarea.selectionStart = start
    textarea.selectionEnd = start + replacement.length
    textarea.focus()
  }
}
