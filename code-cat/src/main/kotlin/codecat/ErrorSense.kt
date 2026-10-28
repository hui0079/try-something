package codecat

import com.intellij.codeInsight.daemon.impl.HighlightInfo
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.impl.DocumentMarkupModel
import com.intellij.openapi.editor.markup.HighlighterLayer

object ErrorSense {
    fun hasErrors(editor: Editor): Boolean {
        val project = editor.project ?: return false
        val model = DocumentMarkupModel.forDocument(editor.document, project, false) ?: return false
        return model.allHighlighters.any { highlighter ->
            val info = HighlightInfo.fromRangeHighlighter(highlighter)
            when {
                info != null -> info.severity >= HighlightSeverity.ERROR
                else -> highlighter.layer == HighlighterLayer.ERROR
            }
        }
    }
}
