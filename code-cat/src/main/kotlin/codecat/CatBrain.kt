package codecat

import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

enum class CatPose {
    SIT, WALK, SLEEP, STARTLE, HAPPY
}

data class CatSnapshot(
    val pose: CatPose,
    val x: Float,
    val y: Float,
    val facingRight: Boolean,
    val walkFrame: Int,
    val bob: Float,
)

class CatBrain(
    private val sitDistance: Float = 6f,
    private val pixelsPerTick: Float = 8f,
    private val sleepAfterTicks: Int = 80,
    private val startleTicks: Int = 10,
    private val happyTicks: Int = 12,
) {
    private var x = 0f
    private var y = 0f
    private var targetX = 0f
    private var targetY = 0f
    private var lineHeight = 20f
    private var facingRight = true
    private var idleTicks = 0
    private var startleRemaining = 0
    private var happyRemaining = 0
    private var hasErrors = false
    private var walkTick = 0
    private var age = 0
    private var lastSnapshot = CatSnapshot(CatPose.SIT, 0f, 0f, true, 0, 0f)

    fun setTarget(x: Float, y: Float, lineHeight: Float = this.lineHeight) {
        targetX = x
        targetY = y
        this.lineHeight = lineHeight.coerceAtLeast(1f)
    }

    fun warpToTarget() {
        x = targetX
        y = targetY
    }

    fun notifyActivity() {
        idleTicks = 0
    }

    fun setHasErrors(hasErrors: Boolean) {
        if (hasErrors && !this.hasErrors) {
            startleRemaining = startleTicks
            happyRemaining = 0
        } else if (!hasErrors && this.hasErrors) {
            happyRemaining = happyTicks
            startleRemaining = 0
        }
        this.hasErrors = hasErrors
    }

    fun notifyCompileSuccess() {
        happyRemaining = happyTicks
        startleRemaining = 0
    }

    fun tick(): CatSnapshot {
        age++
        val dx = targetX - x
        val dy = targetY - y
        var dist = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        if (dist > 0.01f) {
            val step = min(stepPixels(dist, dy), dist)
            x += dx / dist * step
            y += dy / dist * step
            if (kotlin.math.abs(dx) > 0.1f) {
                facingRight = dx > 0f
            }
            dist = hypot((targetX - x).toDouble(), (targetY - y).toDouble()).toFloat()
        }

        val snapshot = when {
            startleRemaining > 0 -> {
                startleRemaining--
                idleTicks = 0
                CatSnapshot(CatPose.STARTLE, x, y, facingRight, 0, 0f)
            }
            happyRemaining > 0 -> {
                happyRemaining--
                idleTicks = 0
                CatSnapshot(CatPose.HAPPY, x, y, facingRight, 0, 0f)
            }
            dist > sitDistance -> {
                idleTicks = 0
                walkTick++
                CatSnapshot(CatPose.WALK, x, y, facingRight, (walkTick / 2) % 2, 0f)
            }
            else -> {
                idleTicks++
                if (idleTicks >= sleepAfterTicks) {
                    CatSnapshot(CatPose.SLEEP, x, y, facingRight, 0, 0f)
                } else {
                    CatSnapshot(CatPose.SIT, x, y, facingRight, 0, sin(age * 0.2f) * 1.5f)
                }
            }
        }
        lastSnapshot = snapshot
        return snapshot
    }

    fun snapshot(): CatSnapshot = lastSnapshot

    private fun stepPixels(dist: Float, dy: Float): Float {
        val lines = kotlin.math.abs(dy) / lineHeight
        return when {
            lines > 10f -> dist
            lines > 3f -> lineHeight * 2.5f
            else -> pixelsPerTick
        }
    }
}
