package codecat

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.markup.CustomHighlighterRenderer
import com.intellij.openapi.editor.markup.RangeHighlighter
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.geom.AffineTransform

class CatRenderer(private val snapshot: () -> CatSnapshot) : CustomHighlighterRenderer {
    override fun paint(editor: Editor, highlighter: RangeHighlighter, g: Graphics) {
        val g2 = g.create() as Graphics2D
        try {
            val snap = snapshot()
            val x = snap.x
            val y = snap.y + snap.bob
            g2.setRenderingHint(
                RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR
            )
            val image = try {
                CatSprites.frame(snap.pose, snap.walkFrame)
            } catch (_: Exception) {
                CatSprites.placeholder(g2, x.toInt(), y.toInt())
                return
            }
            val old = AffineTransform(g2.transform)
            g2.translate(x.toDouble(), y.toDouble())
            if (!snap.facingRight) {
                g2.scale(-1.0, 1.0)
                g2.translate(-CatSprites.DRAW_SIZE.toDouble(), 0.0)
            }
            g2.drawImage(image, 0, 0, CatSprites.DRAW_SIZE, CatSprites.DRAW_SIZE, null)
            g2.transform = old
        } finally {
            g2.dispose()
        }
    }
}
