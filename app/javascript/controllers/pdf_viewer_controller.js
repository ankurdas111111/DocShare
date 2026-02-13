import { Controller } from "@hotwired/stimulus"
import * as pdfjsLib from "pdfjs-dist"

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs"

// Connects to data-controller="pdf-viewer"
export default class extends Controller {
  static targets = ["container", "pageInfo", "pageNumberInput"]
  static values = { url: String }

  connect() {
    this.currentPage = 1
    this.totalPages = 0
    this.pageElements = []
    this.loadPdf()
  }

  async loadPdf() {
    try {
      const pdf = await pdfjsLib.getDocument(this.urlValue).promise
      this.totalPages = pdf.numPages
      this.updatePageInfo()

      // Render all pages sequentially
      for (let i = 1; i <= pdf.numPages; i++) {
        await this.renderPage(pdf, i)
      }

      // Observe which page is visible
      this.setupPageObserver()
    } catch (error) {
      this.containerTarget.innerHTML = "<p style='color: red;'>Failed to load PDF. Please try again.</p>"
      console.error("PDF load error:", error)
    }
  }

  async renderPage(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber)
    const scale = 1.5
    const viewport = page.getViewport({ scale })

    // Create a wrapper div for each page
    const pageDiv = document.createElement("div")
    pageDiv.className = "pdf-page"
    pageDiv.dataset.pageNumber = pageNumber
    pageDiv.style.marginBottom = "8px"
    pageDiv.style.position = "relative"

    // Page number label
    const label = document.createElement("div")
    label.style.cssText = "text-align: center; font-size: 12px; color: #666; padding: 4px 0;"
    label.textContent = `Page ${pageNumber} of ${this.totalPages}`
    pageDiv.appendChild(label)

    // Create canvas
    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = "100%"
    canvas.style.height = "auto"
    canvas.style.border = "1px solid #ddd"
    pageDiv.appendChild(canvas)

    this.containerTarget.appendChild(pageDiv)
    this.pageElements.push(pageDiv)

    // Render the page
    const context = canvas.getContext("2d")
    await page.render({ canvasContext: context, viewport }).promise
  }

  setupPageObserver() {
    const observer = new IntersectionObserver(
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
        threshold: 0.5
      }
    )

    this.pageElements.forEach((el) => observer.observe(el))
  }

  updatePageInfo() {
    if (this.hasPageInfoTarget) {
      this.pageInfoTarget.textContent = `Page ${this.currentPage} of ${this.totalPages}`
    }
  }

  updatePageNumberInput() {
    if (this.hasPageNumberInputTarget) {
      this.pageNumberInputTarget.value = this.currentPage
    }
  }
}
