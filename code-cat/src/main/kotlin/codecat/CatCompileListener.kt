package codecat

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.compiler.CompilationStatusListener
import com.intellij.openapi.compiler.CompileContext

class CatCompileListener : CompilationStatusListener {
    override fun compilationFinished(
        aborted: Boolean,
        errors: Int,
        warnings: Int,
        compileContext: CompileContext,
    ) {
        if (aborted || errors > 0) return
        ApplicationManager.getApplication().invokeLater {
            CatSessions.notifyCompileSuccess(compileContext.project)
        }
    }
}
