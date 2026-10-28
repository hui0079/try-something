package com.oa.process;

import com.oa.approval.ResolvedStep;
import com.oa.approval.StepCode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SnapshotCodecTest {

    @Test
    void roundTripsAssigneeIdsAsLongs() {
        List<ResolvedStep> steps = List.of(
                new ResolvedStep(StepCode.DIRECT_MANAGER, List.of(2L)),
                new ResolvedStep(StepCode.FINANCE, List.of(4L, 5L))
        );
        List<ResolvedStep> restored = SnapshotCodec.read(SnapshotCodec.write(steps));
        assertEquals(steps, restored);
        assertEquals(Long.class, restored.get(1).assigneeIds().get(0).getClass());
    }
}
