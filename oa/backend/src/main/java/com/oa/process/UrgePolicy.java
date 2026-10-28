package com.oa.process;

import java.time.Duration;
import java.time.Instant;

public final class UrgePolicy {

    public static final Duration INTERVAL = Duration.ofHours(4);

    private UrgePolicy() {
    }

    public static boolean allowed(Instant lastUrge, Instant now) {
        return lastUrge == null || !now.isBefore(lastUrge.plus(INTERVAL));
    }
}
