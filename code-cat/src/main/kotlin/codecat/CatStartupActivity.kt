package codecat

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity

class CatStartupActivity : StartupActivity, DumbAware {
    override fun runActivity(project: Project) {
        ApplicationManager.getApplication().invokeLater({
            if (project.isDisposed) return@invokeLater
            EditorFactory.getInstance().allEditors.forEach { editor ->
                if (editor.project == project) {
                    CatEditorFactoryListener.tryAttach(editor)
                }
            }
        }, project.disposed)
    }
}
