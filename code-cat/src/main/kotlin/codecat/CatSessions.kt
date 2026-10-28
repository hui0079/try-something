package codecat

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import java.util.IdentityHashMap

object CatSessions {
    private val sessions = IdentityHashMap<Editor, CatEditorSession>()

    @Synchronized
    fun attach(editor: Editor) {
        if (sessions.containsKey(editor)) return
        val session = CatEditorSession(editor)
        sessions[editor] = session
        session.start()
    }

    @Synchronized
    fun detach(editor: Editor) {
        val session = sessions.remove(editor) ?: return
        Disposer.dispose(session)
    }

    @Synchronized
    fun notifyCompileSuccess(project: Project) {
        sessions.forEach { (editor, session) ->
            if (!editor.isDisposed && editor.project == project) {
                session.notifyCompileSuccess()
            }
        }
    }
}
