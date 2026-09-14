package com.quickpos.app.util

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.content.FileProvider
import com.quickpos.app.data.repository.FinancialReport
import com.quickpos.app.data.repository.TopProduct
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets

/** تصدير التقارير محلياً إلى ملفات (PDF / Excel-CSV) والمشاركة — يعمل دون اتصال. */
object ReportExporter {

    private const val PAGE_WIDTH = 595f   // A4 عرض بالنقاط
    private const val PAGE_HEIGHT = 842f  // A4 ارتفاع بالنقاط
    private const val MARGIN = 36f

    suspend fun exportCsv(
        context: Context,
        report: FinancialReport,
        topProducts: List<TopProduct>,
        rate: Double,
        from: Long,
        to: Long
    ): File = withContext(Dispatchers.IO) {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(dir, "report_${Fmt.date(from)}_${Fmt.date(to)}.csv")

        val sb = StringBuilder()
        sb.append("الفترة,").append(Fmt.date(from)).append(" إلى ").append(Fmt.date(to)).append("\r\n")
        sb.append("سعر الدولار,").append(Fmt.money(rate)).append("\r\n")
        sb.append("عدد الفواتير,").append(report.invoiceCount).append("\r\n")
        sb.append("إجمالي المبيعات,").append(report.grossSalesLocal).append("\r\n")
        sb.append("الخصومات,").append(report.discountsLocal).append("\r\n")
        sb.append("صافي المبيعات,").append(report.netSalesLocal).append("\r\n")
        sb.append("تكلفة البضاعة,").append(report.costOfGoodsLocal).append("\r\n")
        sb.append("الربح الإجمالي,").append(report.grossProfitLocal).append("\r\n")
        sb.append("المصروفات,").append(report.expensesLocal).append("\r\n")
        sb.append("صافي الربح,").append(report.netProfitLocal).append("\r\n")
        sb.append("متوسط قيمة الفاتورة,").append(report.averageSaleLocal).append("\r\n")
        sb.append("\r\n")
        sb.append("الأكثر مبيعاً في الفترة\r\n")
        sb.append("المنتج,الكمية,الإيراد (ج.س)\r\n")
        topProducts.forEach { p ->
            sb.append(decode(p.productName)).append(",")
                .append(p.quantity).append(",")
                .append(p.revenueLocal).append("\r\n")
        }

        file.writeText("\uFEFF$sb", StandardCharsets.UTF_8)
        file
    }

    suspend fun exportPdf(
        context: Context,
        report: FinancialReport,
        topProducts: List<TopProduct>,
        rate: Double,
        from: Long,
        to: Long
    ): File = withContext(Dispatchers.IO) {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(dir, "report_${Fmt.date(from)}_${Fmt.date(to)}.pdf")

        val pdf = PdfDocument()
        var page = pdf.startPage(newPage())
        var canvas = page.canvas

        val titlePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF000000.toInt()
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
        }
        val headerPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF1A73E8.toInt()
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
        }
        val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF000000.toInt()
            textSize = 12f
        }

        var y = MARGIN

        fun pageHeight(): Float = PAGE_HEIGHT - MARGIN

        fun ensureSpace(needed: Float) {
            if (y + needed > pageHeight()) {
                pdf.finishPage(page)
                page = pdf.startPage(newPage())
                canvas = page.canvas
                y = MARGIN
            }
        }

        fun drawLine(text: String, paint: TextPaint, spacing: Float = 4f) {
            val width = (canvas.width - MARGIN * 2).toInt().coerceAtLeast(1)
            val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, width)
                .setAlignment(Layout.Alignment.ALIGN_NORMAL)
                .setLineSpacing(spacing, 1.0f)
                .build()
            ensureSpace(layout.height + spacing)
            canvas.save()
            canvas.translate(MARGIN, y)
            layout.draw(canvas)
            canvas.restore()
            y += layout.height + spacing
        }

        drawLine("تقرير المبيعات", titlePaint, 8f)
        drawLine("الفترة: ${Fmt.date(from)} إلى ${Fmt.date(to)}  —  سعر الدولار: ${Fmt.sdg(rate)}", textPaint)
        canvas.drawLine(MARGIN, y, canvas.width - MARGIN, y, Paint().apply {
            color = 0xFF888888.toInt(); strokeWidth = 2f
        })
        y += 10f

        drawLine("عدد الفواتير: ${report.invoiceCount}", textPaint)
        drawLine("إجمالي المبيعات: ${Fmt.sdg(report.grossSalesLocal)}", textPaint)
        drawLine("الخصومات: ${Fmt.sdg(report.discountsLocal)}", textPaint)
        drawLine("صافي المبيعات: ${Fmt.sdg(report.netSalesLocal)}", textPaint)
        drawLine("تكلفة البضاعة: ${Fmt.sdg(report.costOfGoodsLocal)}", textPaint)
        drawLine("الربح الإجمالي: ${Fmt.sdg(report.grossProfitLocal)}", headerPaint, 8f)
        drawLine("المصروفات: ${Fmt.sdg(report.expensesLocal)}", textPaint)
        drawLine("صافي الربح: ${Fmt.sdg(report.netProfitLocal)}", headerPaint, 12f)
        drawLine("متوسط قيمة الفاتورة: ${Fmt.sdg(report.averageSaleLocal)}", textPaint)

        if (topProducts.isNotEmpty()) {
            drawLine("الأكثر مبيعاً في الفترة", headerPaint, 8f)
            topProducts.forEachIndexed { index, p ->
                drawLine("${index + 1}. ${p.productName} — كمية ${Fmt.money(p.quantity)} — ${Fmt.sdg(p.revenueLocal)}", textPaint)
            }
        }

        drawLine("تقرير مُصدَّر من QuickPOS ${Fmt.date(System.currentTimeMillis())}", textPaint)

        pdf.finishPage(page)
        FileOutputStream(file).use { pdf.writeTo(it) }
        pdf.close()
        file
    }

    private fun newPage(): PdfDocument.PageInfo =
        PdfDocument.PageInfo.Builder(PAGE_WIDTH.toInt(), PAGE_HEIGHT.toInt(), 1).create()

    /** مشاركة ملف عبر تطبيقات النظام (دون اتصال). */
    fun shareFile(context: Context, file: File, mime: String): Boolean = try {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "مشاركة التقرير"))
        true
    } catch (e: Exception) {
        false
    }

    /** تجنّب كسر صيغة CSV عند وجود فواصل/أسطر في أسماء المنتجات. */
    private fun decode(s: String): String =
        if (s.contains(',') || s.contains('"') || s.contains('\n')) {
            "\"" + s.replace("\"", "\"\"") + "\""
        } else s
}