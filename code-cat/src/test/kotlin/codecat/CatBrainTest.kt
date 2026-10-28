package codecat

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CatBrainTest {
    private fun brain() = CatBrain(
        sitDistance = 6f,
        pixelsPerTick = 8f,
        sleepAfterTicks = 5,
        startleTicks = 3,
        happyTicks = 3,
    )

    @Test
    fun walksTowardDistantTarget() {
        val brain = brain()
        brain.setTarget(100f, 40f)
        val before = brain.tick()
        assertEquals(CatPose.WALK, before.pose)
        assertTrue(before.facingRight)
        val after = brain.tick()
        assertTrue("cat should move right", after.x > before.x)
    }

    @Test
    fun sitsWhenCloseToTarget() {
        val brain = brain()
        brain.setTarget(3f, 0f)
        assertEquals(CatPose.SIT, brain.tick().pose)
    }

    @Test
    fun sleepsAfterIdleTicksWhileSitting() {
        val brain = brain()
        brain.setTarget(0f, 0f)
        repeat(5) { brain.tick() }
        assertEquals(CatPose.SLEEP, brain.tick().pose)
    }

    @Test
    fun activityWakesFromSleep() {
        val brain = brain()
        brain.setTarget(0f, 0f)
        repeat(6) { brain.tick() }
        assertEquals(CatPose.SLEEP, brain.snapshot().pose)
        brain.notifyActivity()
        assertEquals(CatPose.SIT, brain.tick().pose)
    }

    @Test
    fun startlesOnceWhenErrorsAppear() {
        val brain = brain()
        brain.setTarget(0f, 0f)
        brain.setHasErrors(true)
        assertEquals(CatPose.STARTLE, brain.tick().pose)
        repeat(3) { brain.tick() }
        brain.setHasErrors(true)
        assertEquals(CatPose.SIT, brain.tick().pose)
    }

    @Test
    fun happyWhenErrorsClear() {
        val brain = brain()
        brain.setTarget(0f, 0f)
        brain.setHasErrors(true)
        repeat(4) { brain.tick() }
        brain.setHasErrors(false)
        assertEquals(CatPose.HAPPY, brain.tick().pose)
    }

    @Test
    fun happyOnCompileSuccess() {
        val brain = brain()
        brain.setTarget(0f, 0f)
        brain.notifyCompileSuccess()
        assertEquals(CatPose.HAPPY, brain.tick().pose)
    }

    @Test
    fun warpToTargetSitsAtCaretInsteadOfOrigin() {
        val brain = brain()
        brain.setTarget(100f, 40f)
        brain.warpToTarget()
        val snap = brain.tick()
        assertEquals(CatPose.SIT, snap.pose)
        assertEquals(100f, snap.x, 0.1f)
        assertEquals(40f, snap.y, 0.1f)
    }

    @Test
    fun walksSlowlyWithinThreeLines() {
        val brain = brain()
        brain.setTarget(0f, 40f)
        val snap = brain.tick()
        assertEquals(CatPose.WALK, snap.pose)
        assertEquals(8f, snap.y, 0.5f)
    }

    @Test
    fun runsWhenJumpingMoreThanThreeLines() {
        val brain = brain()
        brain.setTarget(0f, 100f)
        val snap = brain.tick()
        assertEquals(CatPose.WALK, snap.pose)
        assertTrue("3-10 lines should run, not crawl", snap.y > 20f)
        assertTrue("should not teleport a 5-line jump", snap.y < 100f)
    }

    @Test
    fun teleportsWhenJumpingMoreThanTenLines() {
        val brain = brain()
        brain.setTarget(0f, 300f)
        val snap = brain.tick()
        assertEquals(300f, snap.y, 0.1f)
        assertEquals(CatPose.SIT, snap.pose)
    }

    @Test
    fun facesLeftWhenWalkingLeft() {
        val brain = CatBrain(
            sitDistance = 6f,
            pixelsPerTick = 8f,
            sleepAfterTicks = 80,
        )
        brain.setTarget(0f, 0f)
        repeat(3) { brain.tick() }
        brain.setTarget(-100f, 0f)
        val snap = brain.tick()
        assertEquals(CatPose.WALK, snap.pose)
        assertFalse(snap.facingRight)
    }
}
