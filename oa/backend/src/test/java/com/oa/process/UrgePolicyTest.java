package com.oa.process;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UrgePolicyTest {

    @Test
    void allowsTheFirstUrgeAndBlocksTheNextFourHours() {
        Instant now = Instant.parse("2026-10-28T02:00:00Z");
        assertTrue(UrgePolicy.allowed(null, now));
        assertFalse(UrgePolicy.allowed(now.minusSeconds(60), now));
        assertTrue(UrgePolicy.allowed(now.minus(UrgePolicy.INTERVAL), now));
    }
}
