import { Controller } from "@hotwired/stimulus"
import * as pdfjsLib from "pdfjs-dist"

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs"

// Connects to data-controller="pdf-viewer"
export default class extends Controller {
  static targets = ["container", "pageInfo", "pageNumberInput"]
  static values = { url: String }

  connect() {
    this.currentPage = 1
    this.totalPages = 0
    this.pageElements = []
    this.observer = null
    this.quoteTooltip = null

    // Bind handlers so we can remove them on disconnect
    this._onMouseUp = this.handleTextSelect.bind(this)
    this._onMouseDown = this.handleMouseDown.bind(this)

    this.containerTarget.addEventListener("mouseup", this._onMouseUp)
    this.containerTarget.addEventListener("mousedown", this._onMouseDown)

    this.loadPdf()
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.pageElements = []
    this.removeQuoteTooltip()

    if (this._onMouseUp)
      this.containerTarget.removeEventListener("mouseup", this._onMouseUp)
    if (this._onMouseDown)
      this.containerTarget.removeEventListener("mousedown", this._onMouseDown)
  }

  async loadPdf() {
    try {
      const pdf = await pdfjsLib.getDocument(this.urlValue).promise
      this.totalPages = pdf.numPages
      this.containerTarget.innerHTML = ""

      for (let i = 1; i <= pdf.numPages; i++) {
        await this.renderPage(pdf, i)
      }

      this.currentPage = 1
      this.updatePageInfo()
      this.updatePageNumberInput()
      this.setupPageObserver()
    } catch (error) {
      this.containerTarget.innerHTML =
        "<p class='pdf-viewer__error'>Failed to load PDF. Please try again.</p>"
      console.error("PDF load error:", error)
    }
  }

  async renderPage(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber)

    // ── Calculate scale so the page fits the container width exactly ──
    const containerStyle = getComputedStyle(this.containerTarget)
    const paddingX =
      parseFloat(containerStyle.paddingLeft) +
      parseFloat(containerStyle.paddingRight)
    const availableWidth = this.containerTarget.clientWidth - paddingX
    const unscaledViewport = page.getViewport({ scale: 1 })
    const scale =
      availableWidth > 0 ? availableWidth / unscaledViewport.width : 1.5
    const viewport = page.getViewport({ scale })

    // For retina / HiDPI displays
    const outputScale = window.devicePixelRatio || 1

    // ── Page wrapper ──
    const pageDiv = document.createElement("div")
    pageDiv.className = "pdf-page"
    pageDiv.dataset.pageNumber = pageNumber
    // Set --scale-factor on the page wrapper so it inherits into the text layer
    pageDiv.style.setProperty("--scale-factor", scale)

    // Page label
    const label = document.createElement("div")
    label.className = "pdf-page__label"
    label.textContent = `Page ${pageNumber} of ${this.totalPages}`
    pageDiv.appendChild(label)

    // ── Canvas wrapper ── sized to exactly match the viewport
    const canvasWrap = document.createElement("div")
    canvasWrap.className = "pdf-page__canvas-wrap"
    canvasWrap.style.width = `${viewport.width}px`
    canvasWrap.style.height = `${viewport.height}px`
    canvasWrap.style.position = "relative"

    // ── Canvas ── resolution is viewport x devicePixelRatio for crisp text
    const canvas = document.createElement("canvas")
    canvas.className = "pdf-page__canvas"
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    canvasWrap.appendChild(canvas)

    // ── Text layer ── uses the official PDF.js "textLayer" class
    // The official pdf_viewer.css (loaded from CDN) handles all positioning rules.
    const textLayerDiv = document.createElement("div")
    textLayerDiv.className = "textLayer"
    canvasWrap.appendChild(textLayerDiv)

    pageDiv.appendChild(canvasWrap)
    this.containerTarget.appendChild(pageDiv)
    this.pageElements.push(pageDiv)

    // ── Render canvas ──
    const context = canvas.getContext("2d")
    if (outputScale !== 1) {
      context.scale(outputScale, outputScale)
    }
    await page.render({ canvasContext: context, viewport }).promise

    // ── Render text layer ──
    await this.renderTextLayer(textLayerDiv, page, viewport, scale)
  }

  /**
   * Renders the selectable text layer over the canvas.
   * Strategy:
   *   1. Use the official pdfjsLib.TextLayer class (preferred)
   *   2. Fall back to manually creating positioned <span> elements
   */
  async renderTextLayer(textLayerDiv, page, viewport, scale) {
    try {
      const textContent = await page.getTextContent()

      if (!textContent.items || textContent.items.length === 0) return

      let spanCount = 0

      // ── Strategy 1: Official TextLayer class ──
      if (typeof pdfjsLib.TextLayer === "function") {
        try {
          // Ensure --scale-factor is set on the textLayer container itself
          // (TextLayer.render -> setLayerDimensions reads it for width/height calc)
          textLayerDiv.style.setProperty("--scale-factor", `${scale}`)

          const tl = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
          })
          await tl.render()

          spanCount = textLayerDiv.querySelectorAll("span").length
          if (spanCount > 0) return // Success — done

          textLayerDiv.innerHTML = "" // Clear failed attempt
        } catch (_err) {
          textLayerDiv.innerHTML = "" // Clear failed attempt
        }
      }

      // ── Strategy 2: Manual span creation ──
      this.buildManualTextLayer(textLayerDiv, textContent, viewport)
    } catch (_err) {
      // Text layer is non-critical; PDF still renders on canvas
    }
  }

  /**
   * Manually creates positioned <span> elements from PDF text content.
   * This is a fallback when the official TextLayer class is unavailable or fails.
   */
  buildManualTextLayer(container, textContent, viewport) {
    const { items, styles } = textContent

    for (const item of items) {
      if (!item.str) continue

      // item.transform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
      // Apply the viewport transform to convert PDF coords → pixel coords
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)

      const fontHeight = Math.hypot(tx[2], tx[3])
      const angle = Math.atan2(tx[1], tx[0])
      const ascent = fontHeight * 0.8

      let left, top
      if (Math.abs(angle) < 0.001) {
        left = tx[4]
        top = tx[5] - ascent
      } else {
        left = tx[4] + ascent * Math.sin(angle)
        top = tx[5] - ascent * Math.cos(angle)
      }

      const span = document.createElement("span")
      span.textContent = item.str
      span.setAttribute("role", "presentation")

      // Position and style — NOTE: color is transparent so text is invisible
      // but selectable. The ::selection pseudo-element shows the blue highlight.
      Object.assign(span.style, {
        position: "absolute",
        left: `${left.toFixed(1)}px`,
        top: `${top.toFixed(1)}px`,
        fontSize: `${fontHeight.toFixed(1)}px`,
        fontFamily: styles[item.fontName]?.fontFamily || "sans-serif",
        color: "transparent",
        whiteSpace: "pre",
        transformOrigin: "0% 0%",
        cursor: "text",
      })

      if (Math.abs(angle) >= 0.001) {
        span.style.transform = `rotate(${((angle * 180) / Math.PI).toFixed(2)}deg)`
      }

      if (item.str.length > 1 && item.width) {
        span.dataset.targetWidth = item.width * viewport.scale
      }

      container.appendChild(span)
    }

    // After all spans are in the DOM, apply horizontal scaling
    for (const span of container.querySelectorAll("span[data-target-width]")) {
      const target = parseFloat(span.dataset.targetWidth)
      const actual = span.getBoundingClientRect().width
      if (actual > 0 && Math.abs(actual - target) > 1) {
        span.style.transform =
          (span.style.transform || "") +
          ` scaleX(${(target / actual).toFixed(4)})`
      }
    }
  }

  // ── Text selection → Quote tooltip ──────────────────

  handleMouseDown(e) {
    // Don't remove the tooltip if the user is clicking it (let the click handler fire)
    if (this.quoteTooltip && this.quoteTooltip.contains(e.target)) return
    this.removeQuoteTooltip()
  }

  handleTextSelect(e) {
    // Don't interfere when the user is clicking the quote tooltip
    if (this.quoteTooltip && this.quoteTooltip.contains(e.target)) return

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      this.removeQuoteTooltip()
      return
    }

    const anchorPage = this.findPageForNode(sel.anchorNode)
    if (!anchorPage) {
      this.removeQuoteTooltip()
      return
    }

    const selectedText = sel.toString().trim()
    const pageNumber = parseInt(anchorPage.dataset.pageNumber)

    this.showQuoteTooltip(sel.getRangeAt(0), selectedText, pageNumber)
  }

  findPageForNode(node) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    while (el && el !== this.containerTarget) {
      if (el.classList && el.classList.contains("pdf-page")) return el
      el = el.parentElement
    }
    return null
  }

  showQuoteTooltip(range, text, pageNumber) {
    this.removeQuoteTooltip()

    const rect = range.getBoundingClientRect()
    const containerRect = this.containerTarget.getBoundingClientRect()

    const tooltip = document.createElement("button")
    tooltip.className = "pdf-quote-tooltip"
    tooltip.type = "button"
    tooltip.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0"><path d="M6.848 2.47a.75.75 0 0 1-.318 1.012L3.612 5 6.53 6.518a.75.75 0 0 1-.66 1.346L2.47 6.16a.75.75 0 0 1 0-1.346L5.87 3.11a.75.75 0 0 1 .978.36ZM13.53 4.814 10.13 3.11a.75.75 0 1 0-.66 1.346L12.388 6l-2.918 1.518a.75.75 0 0 0 .66 1.346l3.4-1.704a.75.75 0 0 0 0-1.346ZM7.758 13.378l2-12a.75.75 0 0 0-1.516-.256l-2 12a.75.75 0 0 0 1.516.256Z"/></svg> Quote &amp; Comment`
    tooltip.setAttribute("aria-label", "Quote selected text in comment")

    // Position above the selection, centered horizontally
    const scrollTop = this.containerTarget.scrollTop
    const topAbove = rect.top - containerRect.top + scrollTop - 40
    const topBelow = rect.bottom - containerRect.top + scrollTop + 8
    // Use above position if there's room, otherwise fall below
    tooltip.style.top = `${topAbove > scrollTop ? topAbove : topBelow}px`
    tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`

    tooltip.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.quoteSelection(text, pageNumber)
      this.removeQuoteTooltip()
      window.getSelection().removeAllRanges()
    })

    this.containerTarget.appendChild(tooltip)
    this.quoteTooltip = tooltip
  }

  removeQuoteTooltip() {
    if (this.quoteTooltip) {
      this.quoteTooltip.remove()
      this.quoteTooltip = null
    }
  }

  quoteSelection(text, pageNumber) {
    this.element.dispatchEvent(
      new CustomEvent("pdf:quote", {
        bubbles: true,
        detail: { text, pageNumber },
      })
    )
  }

  // ── Page observer ──────────────────────────────────

  setupPageObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.dataset.pageNumber)
            if (pageNum !== this.currentPage) {
              this.currentPage = pageNum
              this.updatePageInfo()
              this.updatePageNumberInput()
            }
          }
        })
      },
      {
        root: this.containerTarget,
        threshold: 0.5,
      }
    )

    this.pageElements.forEach((el) => this.observer.observe(el))
  }

  updatePageInfo() {
    if (this.hasPageInfoTarget) {
      this.pageInfoTarget.textContent = `Page ${this.currentPage} of ${this.totalPages}`
    }
  }

  updatePageNumberInput() {
    const input = this.hasPageNumberInputTarget
      ? this.pageNumberInputTarget
      : this.element.querySelector("[data-pdf-viewer-target='pageNumberInput']")

    if (input) {
      input.value = this.currentPage
    }
  }
}
