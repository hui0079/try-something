package codecat

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorKind
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener

class CatEditorFactoryListener : EditorFactoryListener {
    override fun editorCreated(event: EditorFactoryEvent) {
        tryAttach(event.editor)
    }

    override fun editorReleased(event: EditorFactoryEvent) {
        CatSessions.detach(event.editor)
    }

    companion object {
        private val log = Logger.getInstance(CatEditorFactoryListener::class.java)

        fun tryAttach(editor: Editor) {
            if (editor.isDisposed) return
            if (editor.isViewer) return
            if (editor.project == null) return
            if (editor.editorKind != EditorKind.MAIN_EDITOR && editor.editorKind != EditorKind.UNTYPED) {
                return
            }
            CatSessions.attach(editor)
            log.info("Code Cat attached to editor kind=${editor.editorKind}")
        }
    }
}
