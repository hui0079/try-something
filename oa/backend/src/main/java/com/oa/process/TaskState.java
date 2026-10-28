package com.oa.process;

import com.oa.approval.StepCode;

public record TaskState(
        Long id,
        int stepIndex,
        StepCode stepCode,
        long assigneeId,
        TaskStatus status,
        String comment
) {
    public TaskState withStatus(TaskStatus nextStatus, String nextComment) {
        return new TaskState(id, stepIndex, stepCode, assigneeId, nextStatus, nextComment);
    }
}
