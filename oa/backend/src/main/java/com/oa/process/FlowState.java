package com.oa.process;

import com.oa.approval.ResolvedStep;

import java.util.List;

public record FlowState(
        InstanceStatus status,
        int currentStepIndex,
        List<ResolvedStep> steps,
        List<TaskState> tasks
) {
}
