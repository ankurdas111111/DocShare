import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="markdown-toolbar"
// Rich-text inline editor: contenteditable surface that syncs to a hidden
// textarea as markdown. Supports bold, italic, bullet lists, and blockquotes.
export default class extends Controller {
  static targets = ["editor", "input"]

  connect() {
    if (!this.hasEditorTarget || !this.hasInputTarget) return

    // Populate editor from existing markdown (edit forms)
    const existing = this.inputTarget.value
    if (existing && existing.trim()) {
      this.editorTarget.innerHTML = this.markdownToHtml(existing)
      this.editorTarget.classList.remove("is-empty")
    }

    // Sync before form submit so markdown is always up-to-date.
    // Listen on both 'submit' and 'turbo:submit-start' to cover Turbo Drive forms.
    this._submitHandler = () => this.sync()
    const form = this.element.closest("form")
    if (form) {
      form.addEventListener("submit", this._submitHandler)
      form.addEventListener("turbo:submit-start", this._submitHandler)
    }

    // Track selection changes for toolbar active states
    this._selectionHandler = () => this.updateActiveStates()
    document.addEventListener("selectionchange", this._selectionHandler)

    // Listen for pdf:quote custom events (dispatched by pdf-viewer controller)
    this._quoteHandler = (e) => this.insertQuote(e.detail)
    const pdfLayout = this.element.closest("[data-controller='pdf-viewer']") ||
                      this.element.closest(".pdf-layout")
    if (pdfLayout) {
      this._quoteTarget = pdfLayout
      pdfLayout.addEventListener("pdf:quote", this._quoteHandler)
    }

    // Initial empty state
    this.updatePlaceholder()
  }

  disconnect() {
    const form = this.element.closest("form")
    if (form && this._submitHandler) {
      form.removeEventListener("submit", this._submitHandler)
      form.removeEventListener("turbo:submit-start", this._submitHandler)
    }
    if (this._selectionHandler) document.removeEventListener("selectionchange", this._selectionHandler)
    if (this._quoteTarget && this._quoteHandler) {
      this._quoteTarget.removeEventListener("pdf:quote", this._quoteHandler)
    }
  }

  // ── Formatting actions ───────────────────────────

  bold(e) {
    e.preventDefault()
    this.editorTarget.focus()
    document.execCommand("bold", false, null)
    this.sync()
  }

  italic(e) {
    e.preventDefault()
    this.editorTarget.focus()
    document.execCommand("italic", false, null)
    this.sync()
  }

  bullet(e) {
    e.preventDefault()
    this.editorTarget.focus()
    document.execCommand("insertUnorderedList", false, null)
    this.sync()
  }

  // ── Quote insertion (from PDF text selection) ─────

  insertQuote({ text, pageNumber }) {
    if (!text || !this.hasEditorTarget) return

    // If editor is empty, clear it first
    if (!this.editorTarget.textContent.trim()) {
      this.editorTarget.innerHTML = ""
    }

    // Build a NON-EDITABLE blockquote so the browser can never place the
    // cursor inside it.  The user sees the quote but cannot accidentally
    // type into it — their cursor always lands in the <div> that follows.
    const bq = document.createElement("blockquote")
    bq.setAttribute("contenteditable", "false")
    bq.textContent = text
    this.editorTarget.appendChild(bq)

    // Chrome's native contenteditable format uses <div><br></div> for new
    // lines.  A <div> with a <br> is the most reliable landing zone.
    const after = document.createElement("div")
    after.innerHTML = "<br>"
    this.editorTarget.appendChild(after)

    // Set the page number input
    const pageInput = this.element.closest("form")?.querySelector("[data-pdf-viewer-target='pageNumberInput']")
      || this.element.closest(".comments-sidebar")?.querySelector("[data-pdf-viewer-target='pageNumberInput']")
    if (pageInput) {
      pageInput.value = pageNumber
    }

    // Place cursor inside the <div> after the blockquote
    this.editorTarget.focus()
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(after, 0)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)

    this.sync()
  }

  // ── Sync & state ─────────────────────────────────

  sync() {
    if (!this.hasInputTarget || !this.hasEditorTarget) return
    this.inputTarget.value = this.htmlToMarkdown(this.editorTarget)
    this.updatePlaceholder()
  }

  handlePaste(e) {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData("text/plain")
    if (!text) return
    document.execCommand("insertText", false, text)
    this.sync()
  }

  handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      if (e.key === "b") {
        e.preventDefault()
        document.execCommand("bold")
        this.sync()
      }
      if (e.key === "i") {
        e.preventDefault()
        document.execCommand("italic")
        this.sync()
      }
    }
  }

  updatePlaceholder() {
    if (!this.hasEditorTarget) return
    // Strip zero-width spaces before checking emptiness
    const text = this.editorTarget.textContent.replace(/\u200B/g, "").trim()
    // If editor has a blockquote (quote), it isn't "empty" — hide default placeholder
    const hasQuote = !!this.editorTarget.querySelector("blockquote")
    this.editorTarget.classList.toggle("is-empty", !text && !hasQuote)
  }

  updateActiveStates() {
    if (!this.hasEditorTarget) return
    const sel = window.getSelection()
    if (!sel.rangeCount || !this.editorTarget.contains(sel.anchorNode)) return

    this.element.querySelectorAll("[data-format]").forEach((btn) => {
      btn.classList.toggle("active", document.queryCommandState(btn.dataset.format))
    })
  }

  // ── HTML → Markdown ──────────────────────────────
  //
  // Chrome contenteditable produces structures like:
  //   bare text                        (first line, no wrapper)
  //   <div>second line</div>           (subsequent lines)
  //   <div><b>bold</b> text</div>      (formatted line)
  //   <div><ul><li>item</li></ul></div>(list wrapped in div)
  //   <div><br></div>                  (empty line from Enter)
  //   <blockquote>quoted text</blockquote>

  htmlToMarkdown(container) {
    let md = ""

    for (const node of container.childNodes) {
      // Before block-level elements, ensure previous content ends with newline
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase()
        if (["div", "p", "ul", "ol", "blockquote"].includes(tag)) {
          if (md && !md.endsWith("\n")) {
            md += "\n"
          }
        }
      }
      md += this.nodeToMd(node)
    }

    // Strip zero-width spaces (used for cursor positioning) and collapse blank lines
    return md.replace(/\u200B/g, "").replace(/\n{3,}/g, "\n\n").trim()
  }

  nodeToMd(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (node.nodeType !== Node.ELEMENT_NODE) return ""

    const tag = node.tagName.toLowerCase()
    const kids = Array.from(node.childNodes).map((n) => this.nodeToMd(n)).join("")

    switch (tag) {
      case "b": case "strong":
        return this.wrapInlineMarker(kids, "**")
      case "i": case "em":
        return this.wrapInlineMarker(kids, "_")
      case "ul": case "ol":
        // Ensure list content ends with exactly one newline
        return kids.replace(/\n*$/, "\n")
      case "li": {
        // Strip trailing <br> newlines that Chrome inserts inside <li>
        const content = kids.replace(/\n+$/, "").trim()
        return content ? `- ${content}\n` : ""
      }
      case "blockquote": {
        // Convert each line to a > prefixed line.
        // End with a BLANK LINE (\n\n) so Markdown parsers close the
        // blockquote — without it, the next line is treated as a
        // "lazy continuation" and stays inside the quote.
        const content = kids.replace(/\n+$/, "").trim()
        const lines = content.split("\n")
        return lines.map((l) => `> ${l}`).join("\n") + "\n\n"
      }
      case "br":
        return "\n"
      case "div": case "p": {
        // If a div wraps only a list or blockquote, return the content directly
        // (Chrome wraps <ul> inside <div>)
        if (this.onlyContainsBlock(node)) {
          return kids
        }
        // Strip trailing br-generated newlines, then add exactly one
        const content = kids.replace(/\n+$/, "")
        return content + "\n"
      }
      case "span":
        return kids
      default:
        return kids
    }
  }

  // Check if an element only contains block-level children (no text)
  onlyContainsBlock(el) {
    const blockTags = ["ul", "ol", "div", "p", "blockquote"]
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) return false
      if (child.nodeType === Node.ELEMENT_NODE && !blockTags.includes(child.tagName.toLowerCase())) return false
    }
    return true
  }

  // Move whitespace outside markdown markers so **bold** is valid.
  // "<b> hello </b>" → " **hello** " (not "** hello **")
  wrapInlineMarker(text, marker) {
    const inner = text.trim()
    if (!inner) return text // don't wrap whitespace-only or empty

    // Extract leading whitespace
    let lead = ""
    for (let i = 0; i < text.length; i++) {
      if (text[i] === " " || text[i] === "\t") lead += text[i]
      else break
    }

    // Extract trailing whitespace
    let trail = ""
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === " " || text[i] === "\t") trail = text[i] + trail
      else break
    }

    return `${lead}${marker}${inner}${marker}${trail}`
  }

  // ── Markdown → HTML (for pre-populating editor) ──

  markdownToHtml(md) {
    if (!md || !md.trim()) return ""

    const lines = md.split("\n")
    let html = ""
    let inList = false
    let inQuote = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Bullet list lines
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (inQuote) { html += "</blockquote>"; inQuote = false }
        if (!inList) { html += "<ul>"; inList = true }
        html += `<li>${this.mdInlineToHtml(trimmed.substring(2))}</li>`
      }
      // Blockquote lines
      else if (trimmed.startsWith("> ")) {
        if (inList) { html += "</ul>"; inList = false }
        if (!inQuote) { html += `<blockquote contenteditable="false">`; inQuote = true }
        else { html += "<br>" } // continuation line within same blockquote
        html += this.mdInlineToHtml(trimmed.substring(2))
      }
      // Regular lines
      else {
        if (inList) { html += "</ul>"; inList = false }
        if (inQuote) { html += "</blockquote>"; inQuote = false }
        if (trimmed === "") {
          // Empty line → skip
        } else {
          html += `<div>${this.mdInlineToHtml(trimmed)}</div>`
        }
      }
    }
    if (inList) html += "</ul>"
    if (inQuote) html += "</blockquote>"
    // If the entire content is a blockquote with nothing after <div> so the user can immediately type their comment below the quote.
    if (html.endsWith("</blockquote>")) {
      html += `<div><br></div>`
    }
    return html
  }

  mdInlineToHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>")
  }
}