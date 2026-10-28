package codecat

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer
import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.event.CaretEvent
import com.intellij.openapi.editor.event.CaretListener
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.markup.HighlighterLayer
import com.intellij.openapi.editor.markup.HighlighterTargetArea
import com.intellij.openapi.editor.markup.RangeHighlighter
import com.intellij.util.Alarm

class CatEditorSession(private val editor: Editor) : Disposable {
    private val brain = CatBrain()
    private val renderer = CatRenderer { brain.snapshot() }
    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, this)
    private var highlighter: RangeHighlighter? = null
    private var stopped = false

    fun start() {
        val markup = editor.markupModel
        val end = editor.document.textLength
        highlighter = markup.addRangeHighlighter(
            0,
            end,
            HighlighterLayer.LAST,
            null,
            HighlighterTargetArea.EXACT_RANGE
        ).also {
            it.isGreedyToLeft = true
            it.isGreedyToRight = true
            it.customRenderer = renderer
        }

        editor.caretModel.addCaretListener(object : CaretListener {
            override fun caretPositionChanged(event: CaretEvent) {
                brain.notifyActivity()
                updateTarget()
            }
        }, this)

        editor.document.addDocumentListener(object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                brain.notifyActivity()
            }
        }, this)

        val project = editor.project
        if (project != null) {
            project.messageBus.connect(this).subscribe(
                DaemonCodeAnalyzer.DAEMON_EVENT_TOPIC,
                object : DaemonCodeAnalyzer.DaemonListener {
                    override fun daemonFinished() {
                        brain.setHasErrors(ErrorSense.hasErrors(editor))
                    }
                }
            )
        }

        snapToCaret()
        tickLoop()
    }

    fun notifyCompileSuccess() {
        brain.notifyCompileSuccess()
    }

    private fun updateTarget() {
        if (editor.isDisposed) return
        val point = editor.visualPositionToXY(editor.caretModel.visualPosition)
        val targetX = point.x + 24f
        val targetY = (point.y + editor.lineHeight - CatSprites.DRAW_SIZE).toFloat()
        brain.setTarget(targetX, targetY, editor.lineHeight.toFloat())
    }

    private fun snapToCaret() {
        updateTarget()
        brain.warpToTarget()
        brain.tick()
    }

    private fun tickLoop() {
        if (stopped || editor.isDisposed) return
        updateTarget()
        brain.tick()
        editor.contentComponent.repaint()
        alarm.addRequest({ tickLoop() }, 100)
    }

    override fun dispose() {
        stopped = true
        alarm.cancelAllRequests()
        highlighter?.let { marker ->
            if (!editor.isDisposed) {
                editor.markupModel.removeHighlighter(marker)
            }
        }
        highlighter = null
    }
}
